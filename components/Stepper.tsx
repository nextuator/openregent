"use client";

import { useState } from "react";
import { Mark } from "./marks";
import { useT } from "@/lib/i18n";

export type StepState = "pending" | "active" | "done" | "error";

export function Stepper({ labels, states, facts }: { labels: string[]; states: StepState[]; facts: Record<number, string | undefined> }) {
  const allDone = states.every((s) => s === "done");
  const [open, setOpen] = useState(false);
  const t = useT();
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

  return (
    <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-2" aria-live="polite">
      {labels.map((label, i) => {
        const s = states[i];
        return (
          <li key={label} className={`flex items-baseline gap-2 ${s === "pending" ? "text-graphite" : ""}`}>
            <span className="num font-semibold">{i + 1}</span>
            <span className={s === "active" ? "font-semibold" : ""}>
              {label}
              {s === "active" && <span className="animate-pulse"> …</span>}
              {s === "done" && <span aria-label="done"> ✓</span>}
              {s === "error" && <span className="text-redline"> failed</span>}
            </span>
            {facts[i] && <Mark className="text-sm">{facts[i]}</Mark>}
          </li>
        );
      })}
    </ol>
  );
}
