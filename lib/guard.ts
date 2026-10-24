import { notify } from "./notify";
import { redis } from "./store";

/* Request guards: optional DEMO_KEY header, a per-IP daily cap on live glow-ups,
   and a global cap per website (no site is glowed up more than SITE_LIMIT times by anyone).
   The hard spend limit remains the Anthropic Console workspace limit. */

export const IP_LIMIT = Number(process.env.RUNS_PER_IP_PER_DAY ?? 3);
export const SITE_LIMIT = Number(process.env.RUNS_PER_SITE ?? 3);

export class GuardError extends Error {
  constructor(public code: "demo_key" | "rate_limited" | "site_limit", message: string, public status: number) {
    super(message);
  }
}

export function ipOf(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

const day = () => new Date().toISOString().slice(0, 10);
const ipKey = (ip: string) => `ip:${ip}:${day()}`;
export const siteKey = (host: string) => `site:${host.replace(/^www\./, "").toLowerCase()}`;

export function checkDemoKey(req: Request) {
  const key = process.env.DEMO_KEY;
  if (key && req.headers.get("x-demo-key") !== key) {
    throw new GuardError("demo_key", "This deployment needs a demo key for live glow-ups.", 401);
  }
}

export async function limits(req: Request, host?: string): Promise<{ ipUsed: number; ipLimit: number; siteUsed: number | null; siteLimit: number }> {
  const [ipUsed, siteUsed] = await Promise.all([
    redis<string | null>(["GET", ipKey(ipOf(req))]).then(Number).catch(() => 0),
    host ? redis<string | null>(["GET", siteKey(host)]).then(Number).catch(() => 0) : Promise.resolve(null),
  ]);
  return { ipUsed: ipUsed || 0, ipLimit: IP_LIMIT, siteUsed: siteUsed ?? null, siteLimit: SITE_LIMIT };
}

/** Call once per new live run (in /api/analyze), before any paid work. */
export async function checkRunCap(req: Request, host: string) {
  const l = await limits(req, host);
  if ((l.siteUsed ?? 0) >= SITE_LIMIT) {
    throw new GuardError("site_limit", `This website already has ${SITE_LIMIT} glow-ups. Pick another site, or vote on the existing ones.`, 409);
  }
  if (l.ipUsed >= IP_LIMIT) {
    void notify("soft_cap", `A visitor used all ${IP_LIMIT} live glow-ups for today.`);
    throw new GuardError("rate_limited", `You've used your ${IP_LIMIT} live glow-ups for today. The saved glow-ups and the vote are always open.`, 429);
  }
  const k = ipKey(ipOf(req));
  const n = await redis<number>(["INCR", k]).catch(() => 0);
  if (n === 1) await redis(["EXPIRE", k, 2 * 86400]).catch(() => 0);
}

export function guardResponse(e: unknown): Response | null {
  if (e instanceof GuardError) {
    return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  return null;
}
