import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import type { z } from "zod";
import { notify } from "./notify";

/* Provider adapter. Logs provider, model and duration only. Never logs prompts or keys. */

export type Tier = "fast" | "smart";
export type CompleteOpts = {
  system: string;
  prompt: string;
  image?: { base64: string; mediaType: "image/jpeg" | "image/png" };
  tier: Tier;
  maxTokens: number;
};

export class LlmUnavailableError extends Error {
  code = "llm_unavailable";
  constructor() {
    super("Live glow-ups are off on this deployment. Pick a saved one below.");
  }
}

export class LlmError extends Error {
  constructor(public code: "billing" | "rate_limit" | "auth" | "upstream" | "refusal" | "bad_output", message: string) {
    super(message);
  }
}

export type Provider = "api" | "cli";

export function provider(): Provider {
  if (process.env.ANTHROPIC_API_KEY) return "api";
  if (!process.env.VERCEL) return "cli";
  throw new LlmUnavailableError();
}

const MODELS: Record<Tier, string> = {
  fast: process.env.LLM_MODEL_FAST || "claude-haiku-5-5",
  smart: process.env.LLM_MODEL_SMART || "claude-opus-5-5",
};
const CLI_ALIAS: Record<Tier, string> = { fast: "haiku", smart: "opus" };
// Fast calls are well-specified extraction; the homepage is real design work.
const EFFORT: Record<Tier, "low" | "medium"> = { fast: "low", smart: "medium" };

let client: Anthropic | null = null;
const api = () => (client ??= new Anthropic({ maxRetries: 1, timeout: 240_000 }));

function params(o: CompleteOpts): Anthropic.MessageCreateParamsNonStreaming {
  const content: Anthropic.ContentBlockParam[] = [];
  if (o.image) content.push({ type: "image", source: { type: "base64", media_type: o.image.mediaType, data: o.image.base64 } });
  content.push({ type: "text", text: o.prompt });
  return {
    model: MODELS[o.tier],
    max_tokens: o.maxTokens,
    system: o.system,
    messages: [{ role: "user", content }],
    output_config: { effort: EFFORT[o.tier] },
  };
}

/** Map API errors to typed errors and alert the operator about billing, quota and auth problems. */
function translate(e: unknown): never {
  if (e instanceof Anthropic.APIError) {
    const msg = String((e.error as { error?: { message?: string } })?.error?.message ?? e.message);
    if (/credit balance|billing|spend limit|usage limit|insufficient/i.test(msg)) {
      void notify("anthropic_billing", `Anthropic refused for billing: ${msg.slice(0, 160)}. Top up or raise the workspace limit.`, "high");
      throw new LlmError("billing", "Live glow-ups are paused right now. Pick a saved glow-up below.");
    }
    if (e instanceof Anthropic.RateLimitError) {
      void notify("anthropic_rate_limit", "Anthropic rate limit hit (429).", "high");
      throw new LlmError("rate_limit", "Too many glow-ups at once. Wait a minute and try again.");
    }
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      void notify("anthropic_auth", `Anthropic key rejected (${e.status}).`, "high");
      throw new LlmError("auth", "Live glow-ups are off right now. Pick a saved glow-up below.");
    }
    void notify("anthropic_error", `Anthropic error ${e.status ?? ""}: ${msg.slice(0, 160)}`);
    throw new LlmError("upstream", "The design model didn't answer. Try again in a moment.");
  }
  throw e;
}

function textOf(msg: Anthropic.Message): string {
  if (msg.stop_reason === "refusal") throw new LlmError("refusal", "The design model declined this site.");
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function logCall(p: Provider, model: string, t0: number, usage?: Anthropic.Usage) {
  const u = usage ? ` in=${usage.input_tokens} out=${usage.output_tokens}` : "";
  console.log(`[llm] provider=${p} model=${model} ms=${Date.now() - t0}${u}`);
}

export async function complete(o: CompleteOpts): Promise<string> {
  const p = provider();
  const t0 = Date.now();
  if (p === "api") {
    const msg = await api().messages.create(params(o)).catch(translate);
    logCall(p, MODELS[o.tier], t0, msg.usage);
    return textOf(msg);
  }
  const out = await completeCli(o);
  logCall(p, CLI_ALIAS[o.tier], t0);
  return out;
}

/** Streams text deltas (API provider only; CLI yields the whole answer once). */
export async function* completeStream(o: CompleteOpts): AsyncIterable<string> {
  const p = provider();
  const t0 = Date.now();
  if (p !== "api") {
    yield await complete(o);
    return;
  }
  const stream = api().messages.stream(params(o));
  try {
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") throw new LlmError("refusal", "The design model declined this site.");
    logCall(p, MODELS[o.tier], t0, final.usage);
  } catch (e) {
    if (e instanceof LlmError) throw e;
    translate(e);
  }
}

export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("No JSON object in the answer");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error("Unterminated JSON object in the answer");
}

export async function completeJson<S extends z.ZodTypeAny>(schema: S, o: CompleteOpts): Promise<z.infer<S>> {
  const first = await complete(o);
  try {
    return schema.parse(extractJson(first));
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    const retry = await complete({
      ...o,
      prompt: `${o.prompt}\n\nYour previous answer was invalid:\n${why.slice(0, 2000)}\n\nReturn only the corrected JSON object.`,
    });
    try {
      return schema.parse(extractJson(retry));
    } catch (err2) {
      throw new LlmError("bad_output", `The design model returned invalid JSON: ${(err2 as Error).message.slice(0, 200)}`);
    }
  }
}

/* ---------- local Claude Code CLI (no key, not on Vercel) ---------- */

async function completeCli(o: CompleteOpts): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "glowup-"));
  try {
    let prompt = o.prompt;
    if (o.image) {
      const file = path.join(dir, o.image.mediaType === "image/png" ? "screenshot.png" : "screenshot.jpg");
      await writeFile(file, Buffer.from(o.image.base64, "base64"));
      prompt = `First read the screenshot at ${file} with the Read tool.\n\n${prompt}`;
    }
    const args = ["-p", "--output-format", "json", "--model", CLI_ALIAS[o.tier], "--tools", "Read", "--allowed-tools", "Read", "--system-prompt", o.system];
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn("claude", args, { cwd: dir, env: { ...process.env } });
      let out = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new LlmError("upstream", "The local Claude CLI timed out."));
      }, 180_000);
      child.stdout.on("data", (d) => (out += d));
      child.on("error", (e) => reject(e));
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(out);
        else reject(new LlmError("upstream", `The local Claude CLI exited with ${code}.`));
      });
      child.stdin.end(prompt);
    });
    const parsed = JSON.parse(stdout) as { result?: string; is_error?: boolean };
    if (parsed.is_error || typeof parsed.result !== "string") throw new LlmError("upstream", "The local Claude CLI returned an error.");
    return parsed.result;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function llmErrorResponse(e: unknown): Response {
  if (e instanceof LlmUnavailableError) return Response.json({ error: { code: e.code, message: e.message } }, { status: 503 });
  if (e instanceof LlmError) return Response.json({ error: { code: e.code, message: e.message } }, { status: e.code === "rate_limit" ? 429 : 502 });
  console.error("[llm] unexpected", e instanceof Error ? e.message : e);
  void notify("server_error", `LLM route failed: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"}`);
  return Response.json({ error: { code: "server", message: "Something went wrong. Try again or pick a saved glow-up below." } }, { status: 500 });
}
