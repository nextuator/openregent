/* Shared storage: Upstash Redis over its REST API (plain fetch, no library).
   Env (set by the Vercel Upstash integration): KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + _TOKEN.
   Without them (local dev) an in-memory map stands in, so limits and voting still work on one instance. */

import { notify } from "./notify";

type Cmd = (string | number)[];

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const hasRedis = () => !!(URL_ && TOKEN);

/* ---------- in-memory fallback (subset of Redis) ---------- */
const mem = new Map<string, unknown>();
const expiry = new Map<string, number>();
function live(k: string) {
  const e = expiry.get(k);
  if (e && e < Date.now()) {
    mem.delete(k);
    expiry.delete(k);
  }
  return mem.get(k);
}
function memCmd([op, ...a]: Cmd): unknown {
  const k = String(a[0]);
  switch (String(op).toUpperCase()) {
    case "GET":
      return live(k) ?? null;
    case "SET":
      mem.set(k, String(a[1]));
      if (String(a[2]).toUpperCase() === "EX") expiry.set(k, Date.now() + Number(a[3]) * 1000);
      return "OK";
    case "INCR": {
      const n = Number(live(k) ?? 0) + 1;
      mem.set(k, String(n));
      return n;
    }
    case "EXPIRE":
      expiry.set(k, Date.now() + Number(a[1]) * 1000);
      return 1;
    case "HINCRBY": {
      const h = (live(k) as Record<string, number>) ?? {};
      h[String(a[1])] = (h[String(a[1])] ?? 0) + Number(a[2]);
      mem.set(k, h);
      return h[String(a[1])];
    }
    case "HGETALL": {
      const h = (live(k) as Record<string, number>) ?? {};
      return Object.entries(h).flat().map(String);
    }
    case "LPUSH": {
      const l = (live(k) as string[]) ?? [];
      l.unshift(...a.slice(1).map(String));
      mem.set(k, l);
      return l.length;
    }
    case "LRANGE": {
      const l = (live(k) as string[]) ?? [];
      const stop = Number(a[2]);
      return l.slice(Number(a[1]), stop < 0 ? l.length + stop + 1 : stop + 1);
    }
    default:
      throw new Error(`memCmd: unsupported ${op}`);
  }
}

export async function redis<T = unknown>(cmd: Cmd): Promise<T> {
  if (!hasRedis()) return memCmd(cmd) as T;
  try {
    const r = await fetch(URL_, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const j = (await r.json()) as { result?: T; error?: string };
    if (!r.ok || j.error) throw new Error(j.error ?? `HTTP ${r.status}`);
    return j.result as T;
  } catch (e) {
    void notify("server_error", `Redis ${String(cmd[0])} failed: ${e instanceof Error ? e.message.slice(0, 120) : "unknown"}`);
    throw e;
  }
}

export function hgetallToObject(arr: string[] | null): Record<string, number> {
  const o: Record<string, number> = {};
  for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]);
  return o;
}
