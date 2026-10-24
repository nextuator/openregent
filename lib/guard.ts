import { notify } from "./notify";

/* Request guards: optional DEMO_KEY header, plus a best-effort per-IP cap on new live runs.
   The cap is per serverless instance (no database), so the hard limit is the Anthropic Console spend limit. */

const RUNS_PER_HOUR = Number(process.env.RUNS_PER_IP_PER_HOUR ?? 6);
const runs = new Map<string, number[]>();

export class GuardError extends Error {
  constructor(public code: "demo_key" | "rate_limited", message: string, public status: number) {
    super(message);
  }
}

function ipOf(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

export function checkDemoKey(req: Request) {
  const key = process.env.DEMO_KEY;
  if (key && req.headers.get("x-demo-key") !== key) {
    throw new GuardError("demo_key", "This deployment needs a demo key for live glow-ups.", 401);
  }
}

/** Call once per new live run (in /api/analyze). */
export function checkRunCap(req: Request) {
  const ip = ipOf(req);
  const now = Date.now();
  const recent = (runs.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= RUNS_PER_HOUR) {
    void notify("soft_cap", `A visitor hit the cap of ${RUNS_PER_HOUR} live runs per hour.`);
    throw new GuardError("rate_limited", "You've made a lot of glow-ups this hour. Try again later or pick a saved glow-up below.", 429);
  }
  recent.push(now);
  runs.set(ip, recent);
}

export function guardResponse(e: unknown): Response | null {
  if (e instanceof GuardError) {
    return Response.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  return null;
}
