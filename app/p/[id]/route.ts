import { proxyImages } from "@/lib/assemble";
import { redis } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Serves a published glow-up: private link, noindex, no scripts, concept banner kept. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{8,20}$/.test(id)) return new Response("Not found", { status: 404 });
  const html = await redis<string | null>(["GET", `pub:${id}`]).catch(() => null);
  if (!html) return new Response("This link has expired or doesn't exist.", { status: 404 });
  return new Response(proxyImages(html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
      "Cache-Control": "public, max-age=300",
    },
  });
}
