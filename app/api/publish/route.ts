import { randomBytes } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { hasRedis, redis } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/* One-click hosting of a paid glow-up at a private, unguessable, noindex link. Only server-generated pages
   (a live run stored under its runId, or a saved run) can be published, never HTML sent by a browser. */

export async function GET() {
  return Response.json({ available: hasRedis() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!hasRedis()) return Response.json({ error: { code: "unavailable", message: "Hosting is not set up yet." } }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { runId?: string; slug?: string } | null;
  let html: string | null = null;
  if (body?.slug && /^[a-z0-9-]+$/.test(body.slug)) {
    try {
      html = (JSON.parse(await readFile(path.join(process.cwd(), "public/runs", body.slug, "run.json"), "utf8")) as { html: string }).html;
    } catch {
      html = null;
    }
  } else if (body?.runId && /^[0-9a-f-]{36}$/.test(body.runId)) {
    const run = await redis<string | null>(["GET", `run:${body.runId}`]);
    html = run ? (JSON.parse(run) as { html: string }).html : null;
  }
  if (!html) return Response.json({ error: { code: "not_found", message: "This glow-up can't be published." } }, { status: 404 });
  const id = randomBytes(9).toString("base64url");
  await redis(["SET", `pub:${id}`, html, "EX", 90 * 86400]);
  return Response.json({ url: `/p/${id}` });
}
