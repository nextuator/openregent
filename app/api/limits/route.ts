import { limits } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  let host: string | undefined;
  try {
    host = raw ? new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname : undefined;
  } catch {
    host = undefined;
  }
  return Response.json(await limits(req, host), { headers: { "Cache-Control": "no-store" } });
}
