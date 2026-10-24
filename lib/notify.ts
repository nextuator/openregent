/* Operator alerts: POST a short text to NOTIFY_URL (ntfy.sh topic, Discord or Slack webhook).
   Never include secrets, prompts or visitor data. De-duplicated per instance. */

const lastSent = new Map<string, number>();
const DEDUP_MS = 10 * 60 * 1000;

export type AlertKind =
  | "anthropic_billing"
  | "anthropic_rate_limit"
  | "anthropic_auth"
  | "anthropic_error"
  | "gaffa_error"
  | "soft_cap"
  | "server_error";

export async function notify(kind: AlertKind, message: string, priority: "high" | "default" = "default") {
  const now = Date.now();
  if (now - (lastSent.get(kind) ?? 0) < DEDUP_MS) return;
  lastSent.set(kind, now);
  const text = `[Glowup] ${kind}: ${message}`.slice(0, 500);
  console.warn(text);
  const url = process.env.NOTIFY_URL;
  if (!url) return;
  try {
    const isDiscord = url.includes("discord.com/api/webhooks");
    const isSlack = url.includes("hooks.slack.com");
    await fetch(url, {
      method: "POST",
      headers: isDiscord || isSlack ? { "Content-Type": "application/json" } : { Title: "Glowup alert", Priority: priority === "high" ? "5" : "3", Tags: "warning" },
      body: isDiscord ? JSON.stringify({ content: text }) : isSlack ? JSON.stringify({ text }) : text,
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Alerting must never break a run.
  }
}
