"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { assembleDocument, splitParts } from "@/lib/assemble";
import type { PageEvent, PageReport } from "@/lib/page";
import type { AnalyzeEvent, Audit, CaptureMeta, Content, Direction, TokensResult } from "@/lib/types";
import { AuditView } from "./AuditView";
import { BeforeAfter } from "./BeforeAfter";
import { OneSource } from "./OneSource";
import { Stepper, type StepState } from "./Stepper";
import { TargetMarks } from "./TargetMarks";
import { TokensView } from "./TokensView";

export type Run = {
  url: string;
  meta?: CaptureMeta;
  viewport?: string;
  full?: string;
  audit?: Audit;
  content?: Content;
  direction?: Direction;
  tokens?: TokensResult;
  html?: string;
  report?: PageReport;
};

const TABS = ["Before and after", "Target marks", "Audit", "Tokens", "One source"] as const;
type Tab = (typeof TABS)[number];

export const STEP_LABELS = [
  "Opening the site in a real browser",
  "Measuring the CSS",
  "Reading the brand",
  "Setting target marks",
  "Building the tokens",
  "Designing the homepage",
  "Applying the tokens to a post and a slide",
];

const GENERIC = "Something went wrong. Try again, or vote on existing glow-ups.";

function demoHeaders(): Record<string, string> {
  try {
    const k = localStorage.getItem("glowup-demo-key");
    return k ? { "x-demo-key": k } : {};
  } catch {
    return {};
  }
}

const cacheKey = (url: string) => `glowup-run:${url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

function saveCache(run: Run) {
  try {
    localStorage.setItem(cacheKey(run.url), JSON.stringify(run));
  } catch {
    try {
      // Too big for localStorage: drop the full-page screenshot and try again.
      localStorage.setItem(cacheKey(run.url), JSON.stringify({ ...run, full: run.viewport }));
    } catch {
      /* ignore */
    }
  }
}

function loadCache(url: string): Run | null {
  try {
    const raw = localStorage.getItem(cacheKey(url));
    return raw ? (JSON.parse(raw) as Run) : null;
  } catch {
    return null;
  }
}

async function readNdjson<T>(res: Response, onEvent: (e: T) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) onEvent(JSON.parse(line) as T);
    }
  }
}

class StepError extends Error {}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...demoHeaders() }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new StepError(j?.error?.message ?? GENERIC);
  return j as T;
}

export function RunView() {
  const params = useSearchParams();
  const url = params.get("url") ?? "";
  const slug = params.get("run");
  const [run, setRun] = useState<Run>({ url });
  const [steps, setSteps] = useState<StepState[]>(STEP_LABELS.map(() => "pending"));
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Before and after");
  const [streamingHtml, setStreamingHtml] = useState<string>("");
  const [status, setStatus] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const started = useRef(false);

  const setStep = (i: number, s: StepState) => setSteps((prev) => prev.map((v, j) => (j === i ? s : v)));
  const failActive = () => setSteps((prev) => prev.map((s) => (s === "active" ? "error" : s)));

  const start = useCallback(async (target: string) => {
    setError("");
    setFromCache(false);
    setStreamingHtml("");
    setSteps(STEP_LABELS.map(() => "pending"));
    let r: Run = { url: target };
    setRun(r);
    const update = (patch: Partial<Run>) => {
      r = { ...r, ...patch };
      setRun(r);
    };

    try {
      // 1–2: capture + audit
      setStep(0, "active");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...demoHeaders() },
        body: JSON.stringify({ url: target }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new StepError(j?.error?.message ?? "Couldn't open that site. Check the address, or vote on existing glow-ups.");
      }
      let analyzeError = "";
      let runId = "";
      await readNdjson<AnalyzeEvent>(res, (e) => {
        if (e.type === "captured") {
          runId = e.runId;
          update({ meta: e.meta, viewport: e.viewport, full: e.full });
          setStep(0, "done");
          setStep(1, "active");
        } else if (e.type === "audit") {
          update({ audit: e.audit, content: e.content });
          setStep(1, "done");
        } else if (e.type === "error") analyzeError = e.message;
      });
      if (analyzeError || !r.audit || !r.content || !r.viewport) throw new StepError(analyzeError || GENERIC);

      // 3–4: direction
      setStep(2, "active");
      const direction = await postJson<Direction>("/api/direction", { audit: r.audit, content: r.content, viewport: r.viewport });
      update({ direction });
      setStep(2, "done");
      setStep(3, "done");

      // 5: tokens
      setStep(4, "active");
      const tokens = await postJson<TokensResult>("/api/tokens", { direction, audit: r.audit });
      update({ tokens });
      setStep(4, "done");

      // 6: homepage (streamed)
      setStep(5, "active");
      const lang = r.content.lang?.split("-")[0] || "en";
      const doc = (css: string, body: string) =>
        assembleDocument({ lang, brand: direction.brand.name, tokensCss: tokens.css, fontsHref: tokens.fontsHref, css, body });
      const pres = await fetch("/api/page", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...demoHeaders() },
        body: JSON.stringify({ tokens, direction, content: r.content, siteUrl: r.meta?.finalUrl ?? target, runId }),
      });
      if (!pres.ok || !pres.body) {
        const j = await pres.json().catch(() => null);
        throw new StepError(j?.error?.message ?? GENERIC);
      }
      let raw = "";
      let last = 0;
      let pageError = "";
      await readNdjson<PageEvent>(pres, (e) => {
        if (e.type === "delta") {
          raw += e.text;
          const now = Date.now();
          if (now - last > 800) {
            last = now;
            const p = splitParts(raw);
            setStreamingHtml(doc(p.css, p.body));
          }
        } else if (e.type === "restart") {
          raw = "";
        } else if (e.type === "status") setStatus(e.message);
        else if (e.type === "final") {
          update({ html: doc(e.css, e.body), report: e.report });
          setStreamingHtml("");
          setStatus("");
        } else if (e.type === "error") pageError = e.message;
      });
      if (pageError || !r.html) throw new StepError(pageError || GENERIC);
      setStep(5, "done");
      setStep(6, "done");
      saveCache(r);
    } catch (e) {
      failActive();
      setStatus("");
      setError(e instanceof StepError ? e.message : "Lost the connection. Try again, or vote on existing glow-ups.");
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (slug) {
      fetch(`/runs/${encodeURIComponent(slug)}/run.json`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((saved: Run) => {
          setRun({ ...saved, viewport: saved.viewport ?? `/runs/${slug}/before.jpg`, full: saved.full ?? `/runs/${slug}/before-full.jpg` });
          setSteps(STEP_LABELS.map(() => "done"));
        })
        .catch(() => setError("That glow-up doesn't exist."));
      return;
    }
    if (!url) return;
    const cached = loadCache(url);
    if (cached?.html) {
      setRun(cached);
      setSteps(STEP_LABELS.map(() => "done"));
      setFromCache(true);
      return;
    }
    void start(url);
  }, [url, slug, start]);

  const host = (() => {
    try {
      return new URL(run.meta?.finalUrl ?? (run.url.startsWith("http") ? run.url : `https://${run.url}`)).hostname;
    } catch {
      return run.url;
    }
  })();

  const facts: Record<number, string | undefined> = {
    1: run.audit
      ? `${run.audit.colors.literals} colour literals, ${run.audit.colors.distinct} distinct, ${run.audit.fonts.families.length} font families, ${run.audit.radii.length} radii`
      : undefined,
    4: run.tokens ? `${run.audit?.colors.distinct ?? "?"} colours → 9 tokens` : undefined,
  };

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display break-all text-2xl sm:text-3xl">{host || "No website given"}</h1>
        <Link href="/" className="text-graphite underline underline-offset-4 hover:text-ink">
          Glow up another site
        </Link>
      </div>

      <Stepper labels={STEP_LABELS} states={steps} facts={facts} />
      {status && <p className="mt-2 text-sm text-graphite">{status}</p>}
      {fromCache && (
        <p className="mt-2 text-sm text-graphite">
          Showing your earlier glow-up of this site.{" "}
          <button onClick={() => void start(url)} className="underline underline-offset-4 hover:text-ink">
            Run it again
          </button>
        </p>
      )}

      {error && (
        <section role="alert" className="mt-8 max-w-2xl rounded-frame border border-rule bg-sheet p-6 sm:p-8">
          <h2 className="display text-xl">That didn&apos;t work</h2>
          <p className="mt-2 text-lg text-graphite">{error}</p>
          <p className="mt-1 text-sm text-graphite">This attempt didn&apos;t count toward your daily glow-ups.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/" className="rounded-control border-[1.5px] border-ink bg-ink px-5 py-2.5 font-semibold text-sheet hover:bg-graphite">
              Try another site
            </Link>
            <Link href="/vote" className="rounded-control border-[1.5px] border-ink bg-sheet px-5 py-2.5 font-semibold hover:bg-paper">
              Vote on glow-ups
            </Link>
          </div>
        </section>
      )}

      {(!error || run.full) && (
      <>
      <div role="tablist" aria-label="Results" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-[3px] pb-2 pt-1 text-base ${tab === t ? "border-ink font-semibold" : "border-transparent text-graphite hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === "Before and after" && <BeforeAfter run={run} streamingHtml={streamingHtml} />}
        {tab === "Target marks" && (run.direction ? <TargetMarks direction={run.direction} /> : <Waiting what="the target marks" />)}
        {tab === "Audit" && (run.audit && run.content ? <AuditView audit={run.audit} content={run.content} /> : <Waiting what="the audit" />)}
        {tab === "Tokens" &&
          (run.tokens ? <TokensView result={run.tokens} rawCount={run.audit?.colors.distinct ?? 0} /> : <Waiting what="the tokens" />)}
        {tab === "One source" && (run.tokens && run.direction && run.content ? <OneSource run={run} /> : <Waiting what="the post and slide" />)}
      </div>
      </>
      )}
    </main>
  );
}

function Waiting({ what }: { what: string }) {
  return <p className="text-graphite">Waiting for {what}.</p>;
}
