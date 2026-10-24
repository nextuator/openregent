import { checkDemoKey, guardResponse } from "@/lib/guard";
import { LlmError, LlmUnavailableError, llmErrorResponse, provider } from "@/lib/llm";
import { notify } from "@/lib/notify";
import { page, type PageEvent } from "@/lib/page";
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
  const body = (await req.json().catch(() => null)) as { tokens?: TokensResult; direction?: Direction; content?: Content; siteUrl?: string } | null;
  if (!body?.tokens || !body.direction || !body.content || !body.siteUrl) {
    return Response.json({ error: { code: "bad_request", message: "Missing tokens, direction, content or siteUrl" } }, { status: 400 });
  }
  const { tokens, direction, content, siteUrl } = body;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: PageEvent) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        for await (const ev of page(tokens, direction, content, siteUrl)) send(ev);
      } catch (e) {
        if (e instanceof LlmError || e instanceof LlmUnavailableError) {
          send({ type: "error", code: e.code, message: e.message });
        } else {
          console.error("[page] failed", e instanceof Error ? e.message : e);
          void notify("server_error", `page failed: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"}`);
          send({ type: "error", code: "server", message: "The redesign didn't finish. Try again or pick a saved glow-up below." });
        }
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
