"use client";

import { useEffect, useRef, useState } from "react";
import { Mark } from "./marks";
import { useT } from "@/lib/i18n";

export type StepState = "pending" | "active" | "done" | "error";

/* Rough share of the total time each step takes, so the bar moves like the real run (step 6, the design, is most of it). */
const WEIGHT = [8, 4, 6, 1, 5, 74, 2];

function useElapsed(running: boolean) {
  const start = useRef<number | null>(null);
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    start.current ??= Date.now();
    const id = setInterval(() => setS(Math.round((Date.now() - (start.current ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);
  return s;
}

export function Stepper({
  labels,
  states,
  facts,
  status = "",
}: {
  labels: string[];
  states: StepState[];
  facts: Record<number, string | undefined>;
  status?: string;
}) {
  const allDone = states.every((s) => s === "done");
  const running = states.some((s) => s === "active");
  const failed = states.some((s) => s === "error");
  const [open, setOpen] = useState(false);
  const t = useT();
  const elapsed = useElapsed(running);
  const activeFact = Object.entries(facts).filter(([, f]) => f).pop()?.[1];

  if (allDone && !open) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 text-graphite">
        <span>{t("run.alldone")}</span>
        {activeFact && <Mark>{activeFact}</Mark>}
        <button onClick={() => setOpen(true)} className="underline underline-offset-4 hover:text-ink">
          {t("run.showsteps")}
        </button>
      </div>
    );
  }

  const total = WEIGHT.reduce((a, b) => a + b, 0);
  const doneW = states.reduce((a, s, i) => a + (s === "done" ? WEIGHT[i] : 0), 0);
  // Inside the long design step, creep forward with time so the bar never looks frozen.
  const activeI = states.findIndex((s) => s === "active");
  const creep = activeI >= 0 ? WEIGHT[activeI] * Math.min(0.9, activeI === 5 ? elapsed / 220 : 0.4) : 0;
  const pct = Math.min(99, Math.round(((doneW + creep) / total) * 100));
  const mm = Math.floor(elapsed / 60), ss = String(elapsed % 60).padStart(2, "0");

  return (
    <section aria-live="polite" className="mt-6 max-w-3xl border border-rule bg-sheet p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-xl">{failed ? t("err.title") : t("load.title")}</h2>
        {!failed && (
          <span className="num text-sm text-graphite">
            {mm}:{ss} · {t("load.eta")}
          </span>
        )}
      </div>
      <div className="mt-4 h-1.5 w-full bg-paper" aria-hidden>
        <div className={`h-full transition-[width] duration-700 ${failed ? "bg-redline" : "bg-ink"}`} style={{ width: `${failed ? 100 : pct}%` }} />
      </div>
      <ol className="mt-5 grid gap-2.5">
        {labels.map((label, i) => {
          const s = states[i];
          return (
            <li key={label} className={`flex items-start gap-3 ${s === "pending" ? "text-graphite" : ""}`}>
              <span
                aria-hidden
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-sm font-semibold num ${
                  s === "done" ? "bg-ink text-sheet" : s === "active" ? "border-[1.5px] border-redline text-redline" : s === "error" ? "bg-redline text-sheet" : "border border-rule"
                }`}
              >
                {s === "done" ? "✓" : s === "error" ? "!" : i + 1}
              </span>
              <span className="min-w-0">
                <span className={s === "active" ? "font-semibold" : ""}>
                  {label}
                  {s === "active" && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-redline align-middle" />}
                </span>
                {s === "active" && i === 5 && status && <span className="block text-sm text-graphite">{status}</span>}
                {facts[i] && (
                  <span className="mt-1 block">
                    <Mark className="text-sm">{facts[i]}</Mark>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {running && <p className="mt-5 border-t border-rule pt-4 text-sm text-graphite">{t("load.tip")}</p>}
    </section>
  );
}
