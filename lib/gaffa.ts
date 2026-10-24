import sharp from "sharp";
import { isPublicHttpUrl } from "./net";
import type { Capture } from "./types";

const ENDPOINT = "https://api.gaffa.dev/v1/browser/requests";
const WIDTH = 1440;
const MAX_FULL_HEIGHT = 6000;

export class CaptureError extends Error {
  constructor(message: string, public detail?: string) {
    super(message);
    this.name = "CaptureError";
  }
}

type GaffaAction = { type: string; output?: unknown; error?: string };
type GaffaResponse = {
  data?: {
    state?: string;
    error?: string;
    error_reason?: string;
    actual_url?: string;
    url?: string;
    credit_usage?: number;
    http_status_code?: number;
    actions?: GaffaAction[];
  };
  error?: { code?: string; message?: string };
};

export function normalizeUrl(input: string): string {
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  const u = new URL(s);
  if (!/^https?:$/.test(u.protocol)) throw new CaptureError("Only http and https URLs work.");
  if (!isPublicHttpUrl(u.toString())) throw new CaptureError("That doesn't look like a public website.");
  return u.toString();
}

async function download(url: string): Promise<Buffer> {
  // Only ever download Gaffa result files.
  if (!/^https:\/\/storage\.gaffa\.dev\//.test(url)) throw new CaptureError("Unexpected result URL");
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new CaptureError(`Download failed (${r.status})`);
  return Buffer.from(await r.arrayBuffer());
}

/** Opens the page in a Gaffa cloud browser. Read-only: navigate, wait, scroll, capture. */
export async function capture(rawUrl: string, onQueue?: (attempt: number) => void): Promise<Capture> {
  const key = process.env.GAFFA_API_KEY;
  if (!key) throw new CaptureError("GAFFA_API_KEY is not set.");
  const url = normalizeUrl(rawUrl);
  const t0 = Date.now();

  // Gaffa plan allows one capture at a time: when busy, wait and retry instead of failing (queue up to ~90 s).
  let res: Response | undefined;
  let json: GaffaResponse = {};
  for (let attempt = 0; attempt < 12; attempt++) {
  res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      async: false,
      max_cache_age: 0,
      settings: {
        time_limit: 45_000,
        actions: [
          { type: "wait", time: 1500 },
          { type: "capture_screenshot", size: "view" },
          // Read-only scroll so lazy images and scroll animations render in the full-page capture.
          { type: "scroll", percentage: 100, scroll_speed: "medium", wait_time: 800, max_scroll_time: 8000, continue_on_fail: true },
          { type: "wait", time: 800 },
          { type: "capture_screenshot", size: "fullscreen" },
          { type: "capture_dom" },
          { type: "generate_markdown", output_type: "inline" },
        ],
      },
    }),
    signal: AbortSignal.timeout(70_000),
  }).catch((e) => {
    throw new CaptureError("Gaffa request failed", String(e));
  });
  json = (await res.json().catch(() => ({}))) as GaffaResponse;
  const reason = `${json.error?.message ?? ""} ${json.data?.error_reason ?? ""} ${json.error?.code ?? ""}`;
  if (/concurrent|active request|too many|rate/i.test(reason) || res.status === 429) {
    if (attempt === 11) throw new CaptureError("busy", reason);
    onQueue?.(attempt + 1);
    await new Promise((r) => setTimeout(r, 7000 + Math.random() * 3000));
    continue;
  }
  break;
  }
  if (!res) throw new CaptureError("Gaffa request failed");
  const d = json.data;
  if (!res.ok || !d || d.state !== "completed" || d.error) {
    throw new CaptureError(
      "Gaffa could not open the site",
      json.error?.message ?? d?.error_reason ?? d?.error ?? `HTTP ${res.status}`,
    );
  }

  const actions = d.actions ?? [];
  const out = (type: string, nth = 0) => {
    const a = actions.filter((x) => x.type === type)[nth];
    if (!a || a.error || typeof a.output !== "string") {
      throw new CaptureError(`Gaffa action ${type} failed`, a?.error);
    }
    return a.output;
  };

  const [viewRaw, fullRaw, html] = await Promise.all([
    download(out("capture_screenshot", 0)),
    download(out("capture_screenshot", 1)),
    download(out("capture_dom")).then((b) => b.toString("utf8")),
  ]);
  const markdown = out("generate_markdown");

  const fullMeta = await sharp(fullRaw).metadata();
  const srcWidth = fullMeta.width ?? WIDTH;
  const srcHeight = fullMeta.height ?? 0;
  // Gaffa renders at device scale 1, so screenshot px are CSS px.
  const pageHeight = srcHeight;

  const viewportJpeg = await sharp(viewRaw)
    .resize({ width: WIDTH })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();

  const scaledHeight = Math.round((srcHeight * WIDTH) / srcWidth);
  let full = sharp(fullRaw).resize({ width: WIDTH });
  if (scaledHeight > MAX_FULL_HEIGHT) {
    full = sharp(await full.toBuffer()).extract({ left: 0, top: 0, width: WIDTH, height: MAX_FULL_HEIGHT });
  }
  const fullJpeg = await full.jpeg({ quality: 75, mozjpeg: true }).toBuffer();

  return {
    url,
    finalUrl: d.actual_url || d.url || url,
    html,
    markdown,
    pageHeight,
    viewportJpeg,
    fullJpeg,
    ms: Date.now() - t0,
    credits: d.credit_usage ?? null,
  };
}
