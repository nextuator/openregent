import { CONCEPTS, parseStats } from "@/lib/concept";
import { hgetallToObject, redis } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/** What the concept bandit has learned from the blind vote so far. */
export async function GET() {
  const stats = parseStats(hgetallToObject(await redis<string[]>(["HGETALL", "bandit"]).catch(() => [] as string[])));
  const rows = CONCEPTS.map((c) => ({ id: c.id, ...stats[c.id], rate: stats[c.id].n ? stats[c.id].wins / stats[c.id].n : null }));
  return Response.json({ rows }, { headers: { "Cache-Control": "no-store" } });
}
