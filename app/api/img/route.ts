import sharp from "sharp";
import { safeFetch } from "@/lib/net";

export const runtime = "nodejs";
export const maxDuration = 300;

/* Same-origin image proxy so the post/slide PNG export can read pixels. Public URLs only (SSRF guard), images only, resized. */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") ?? "";
  try {
    const r = await safeFetch(u, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (compatible; GlowupImage/1.0)" } });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !type.startsWith("image/")) return new Response("Not an image", { status: 400 });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 12 * 1024 * 1024) return new Response("Too large", { status: 413 });
    if (type.includes("svg")) return new Response(buf, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400", "Content-Security-Policy": "script-src 'none'" } });
    const img = sharp(buf, { animated: false }).rotate().resize({ width: 1600, withoutEnlargement: true });
    const { hasAlpha } = await sharp(buf).metadata();
    // Keep transparency (logos) as WebP; photos as JPEG.
    const out = hasAlpha ? await img.webp({ quality: 85 }).toBuffer() : await img.jpeg({ quality: 82 }).toBuffer();
    return new Response(new Uint8Array(out), {
      headers: { "Content-Type": hasAlpha ? "image/webp" : "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=604800" },
    });
  } catch {
    return new Response("Could not load image", { status: 502 });
  }
}
