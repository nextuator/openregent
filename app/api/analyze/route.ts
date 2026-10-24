import { audit } from "@/lib/audit";
import { capture, CaptureError } from "@/lib/gaffa";
import { checkDemoKey, checkRunCap, guardResponse } from "@/lib/guard";
import { notify } from "@/lib/notify";
import type { AnalyzeEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/* POST {url} → NDJSON stream: "captured" (meta + screenshots), then "audit" (audit + content). */
export async function POST(req: Request) {
  try {
    checkDemoKey(req);
    checkRunCap(req);
  } catch (e) {
    const r = guardResponse(e);
    if (r) return r;
    throw e;
  }

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) return Response.json({ error: { code: "bad_request", message: "Missing url" } }, { status: 400 });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AnalyzeEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        const cap = await capture(url);
        console.log(`[analyze] captured ${cap.finalUrl} in ${cap.ms} ms, credits ${cap.credits}`);
        send({
          type: "captured",
          meta: { url: cap.url, finalUrl: cap.finalUrl, pageHeight: cap.pageHeight, ms: cap.ms, credits: cap.credits },
          viewport: `data:image/jpeg;base64,${cap.viewportJpeg.toString("base64")}`,
          full: `data:image/jpeg;base64,${cap.fullJpeg.toString("base64")}`,
        });
        const t0 = Date.now();
        const result = await audit({ html: cap.html, finalUrl: cap.finalUrl, markdown: cap.markdown, pageHeight: cap.pageHeight });
        console.log(`[analyze] audit in ${Date.now() - t0} ms`);
        send({ type: "audit", ...result });
      } catch (e) {
        if (e instanceof CaptureError) {
          console.warn(`[analyze] capture failed: ${e.message} (${e.detail ?? ""})`);
          if (/credit|quota|limit|payment|unauthori|api key/i.test(`${e.message} ${e.detail}`)) {
            void notify("gaffa_error", `${e.message}: ${e.detail ?? ""}`, "high");
          }
          send({ type: "error", code: "capture", message: "Couldn't open that site. Check the address or pick a saved glow-up below." });
        } else {
          console.error("[analyze] failed", e);
          void notify("server_error", `analyze failed: ${e instanceof Error ? e.message : String(e)}`);
          send({ type: "error", code: "server", message: "Something went wrong while measuring the site. Try again or pick a saved glow-up below." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
