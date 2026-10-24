"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AnalyzeEvent, Audit, CaptureMeta, Content } from "@/lib/types";
import { AuditView } from "./AuditView";
import { Stepper, type StepState } from "./Stepper";

export type Run = {
  url: string;
  meta?: CaptureMeta;
  viewport?: string;
  full?: string;
  audit?: Audit;
  content?: Content;
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

function demoHeaders(): Record<string, string> {
  try {
    const k = localStorage.getItem("glowup-demo-key");
    return k ? { "x-demo-key": k } : {};
  } catch {
    return {};
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

export function RunView() {
  const params = useSearchParams();
  const url = params.get("url") ?? "";
  const slug = params.get("run");
  const [run, setRun] = useState<Run>({ url });
  const [steps, setSteps] = useState<StepState[]>(STEP_LABELS.map(() => "pending"));
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Before and after");
  const started = useRef(false);

  const setStep = (i: number, s: StepState) => setSteps((prev) => prev.map((v, j) => (j === i ? s : v)));

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (slug) {
      fetch(`/runs/${slug}/run.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((saved: Run) => {
          setRun(saved);
          setSteps(STEP_LABELS.map(() => "done"));
        })
        .catch(() => setError("That saved glow-up doesn't exist. Pick another one on the home page."));
      return;
    }
    if (!url) return;

    (async () => {
      setStep(0, "active");
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...demoHeaders() },
        body: JSON.stringify({ url }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        setStep(0, "error");
        setError(j?.error?.message ?? "Couldn't open that site. Check the address or pick a saved glow-up below.");
        return;
      }
      let failed = false;
      await readNdjson<AnalyzeEvent>(res, (e) => {
        if (e.type === "captured") {
          setRun((r) => ({ ...r, meta: e.meta, viewport: e.viewport, full: e.full }));
          setStep(0, "done");
          setStep(1, "active");
        } else if (e.type === "audit") {
          setRun((r) => ({ ...r, audit: e.audit, content: e.content }));
          setStep(1, "done");
        } else if (e.type === "error") {
          failed = true;
          setSteps((prev) => prev.map((s) => (s === "active" ? "error" : s)));
          setError(e.message);
        }
      });
      if (failed) return;
    })().catch(() => {
      setSteps((prev) => prev.map((s) => (s === "active" ? "error" : s)));
      setError("Lost the connection while measuring. Try again or pick a saved glow-up.");
    });
  }, [url, slug]);

  const host = (() => {
    try {
      return new URL(run.meta?.finalUrl ?? (run.url.startsWith("http") ? run.url : `https://${run.url}`)).hostname;
    } catch {
      return run.url;
    }
  })();

  const facts = run.audit
    ? `${run.audit.colors.literals} colour literals, ${run.audit.colors.distinct} distinct, ${run.audit.fonts.families.length} font families, ${run.audit.radii.length} radii`
    : undefined;

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-2xl sm:text-3xl break-all">{host || "No website given"}</h1>
        <Link href="/" className="text-graphite underline underline-offset-4 hover:text-ink">
          Glow up another site
        </Link>
      </div>

      <Stepper labels={STEP_LABELS} states={steps} facts={{ 1: facts }} />

      {error && (
        <div role="alert" className="mt-6 rounded-control border-[1.5px] border-redline bg-sheet p-4">
          <p className="font-semibold text-redline">{error}</p>
          <Link href="/#saved" className="mt-1 inline-block underline underline-offset-4">
            See saved glow-ups
          </Link>
        </div>
      )}

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
        {tab === "Before and after" && <BeforeAfter run={run} />}
        {tab === "Audit" && (run.audit && run.content ? <AuditView audit={run.audit} content={run.content} /> : <Waiting what="the audit" />)}
        {tab === "Target marks" && <Waiting what="the target marks" />}
        {tab === "Tokens" && <Waiting what="the tokens" />}
        {tab === "One source" && <Waiting what="the post and slide" />}
      </div>
    </main>
  );
}

function Waiting({ what }: { what: string }) {
  return <p className="text-graphite">Waiting for {what}.</p>;
}

function BeforeAfter({ run }: { run: Run }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <figure className="order-2 md:order-1">
        <figcaption className="mb-2 font-semibold">Before</figcaption>
        <div className="h-[70vh] overflow-y-auto rounded-frame border border-rule bg-sheet">
          {run.full ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={run.full} alt={`Full-page screenshot of the original ${run.meta?.finalUrl ?? "site"}`} className="block w-full" />
          ) : (
            <p className="p-6 text-graphite">The screenshot of the original site appears here.</p>
          )}
        </div>
      </figure>
      <figure className="order-1 md:order-2">
        <figcaption className="mb-2 font-semibold">After</figcaption>
        <div className="flex h-[70vh] items-center justify-center rounded-frame border border-rule bg-sheet p-6 text-graphite">
          The redesign appears here once the tokens are built.
        </div>
      </figure>
    </div>
  );
}
