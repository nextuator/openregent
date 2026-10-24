import sharp from "sharp";
import { safeFetch } from "./net";

/* Deterministic image facts: real pixel size, so no photo is ever shown larger than it is (no blurry upscales). */

export type ImageSize = { w: number; h: number };

export async function measureImages(srcs: string[], limit = 14): Promise<Record<string, ImageSize>> {
  const out: Record<string, ImageSize> = {};
  await Promise.all(
    srcs.slice(0, limit).map(async (src) => {
      try {
        const r = await safeFetch(src, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "Mozilla/5.0 (compatible; GlowupAudit/1.0)" } });
        if (!r.ok) return;
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 15 * 1024 * 1024) return;
        const m = await sharp(buf).metadata();
        if (m.width && m.height) out[src] = { w: m.width, h: m.height };
      } catch {
        /* unknown size: leave it out */
      }
    }),
  );
  return out;
}

/** Caps every <img> at its natural width (inline max-width), keeping height proportional. */
export function capImages(html: string, sizes: Record<string, ImageSize>): string {
  return html.replace(/<img\b([^>]*?)\bsrc="([^"]+)"([^>]*)>/g, (tag, pre: string, src: string, post: string) => {
    const s = sizes[src.replace(/&amp;/g, "&")];
    if (!s) return tag;
    const cap = `max-width:min(100%, ${s.w}px)`;
    if (/style="/.test(tag)) return tag.replace(/style="/, `style="${cap};`);
    return `<img${pre}src="${src}"${post} style="${cap}">`;
  });
}
