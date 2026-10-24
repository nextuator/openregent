import { assembleDocument } from "@/lib/assemble";
import { checkDemoKey, guardResponse, siteKey } from "@/lib/guard";
import { LlmError, LlmUnavailableError, llmErrorResponse, provider } from "@/lib/llm";
import { notify } from "@/lib/notify";
import { page, type PageEvent } from "@/lib/page";
import { parseStats } from "@/lib/concept";
import { hgetallToObject, redis } from "@/lib/store";
import type { Content, Direction, TokensResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/* POST {tokens, direction, content, siteUrl} → NDJSON: delta… (streamed when provider = api), status?, final. */
export async function POST(req: Request) {
  try {
    checkDemoKey(req);
    provider();
  } catch (e) {
    return guardResponse(e) ?? llmErrorResponse(e);
  }
  const body = (await req.json().catch(() => null)) as { tokens?: TokensResult; direction?: Direction; content?: Content; siteUrl?: string; runId?: string } | null;
  if (!body?.tokens || !body.direction || !body.content || !body.siteUrl) {
    return Response.json({ error: { code: "bad_request", message: "Missing tokens, direction, content or siteUrl" } }, { status: 400 });
  }
  const { tokens, direction, content, siteUrl, runId } = body;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: PageEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        const stats = parseStats(hgetallToObject(await redis<string[]>(["HGETALL", "bandit"]).catch(() => [] as string[])));
        for await (const ev of page(tokens, direction, content, siteUrl, stats)) {
          send(ev);
          if (ev.type === "final" && runId) await saveForVote(runId, direction, content, tokens, ev.css, ev.body);
        }
      } catch (e) {
        if (e instanceof LlmError || e instanceof LlmUnavailableError) {
          send({ type: "error", code: e.code, message: e.message });
        } else {
          console.error("[page] failed", e instanceof Error ? e.message : e);
          void notify("server_error", `page failed: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"}`);
          send({ type: "error", code: "server", message: "The redesign didn't finish. Try again, or vote on existing glow-ups." });
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Every finished glow-up joins the blind vote and counts toward the site's limit. Server-generated only. */
async function saveForVote(runId: string, d: Direction, c: Content, t: TokensResult, css: string, body: string) {
  try {
    if (!/^[0-9a-f-]{36}$/.test(runId)) return;
    const cap = await redis<string | null>(["GET", `cap:${runId}`]);
    if (!cap) return;
    const { host } = JSON.parse(cap) as { host: string };
    const html = assembleDocument({ lang: c.lang?.split("-")[0] || "en", brand: d.brand.name, tokensCss: t.css, fontsHref: t.fontsHref, css, body });
    await redis(["SET", `run:${runId}`, JSON.stringify({ host, brand: d.brand.name, html, concept: d.concept, at: Date.now() }), "EX", 30 * 86400]);
    await redis(["LPUSH", "runs", runId]);
    await redis(["INCR", siteKey(host)]);
  } catch (e) {
    console.warn("[page] could not save for vote", e instanceof Error ? e.message : e);
  }
}
