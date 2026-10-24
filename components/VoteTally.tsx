"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

/** Live tally of the blind vote, for the home page. */
export function VoteTally() {
  const [t, setT] = useState<{ original: number; redesign: number } | null>(null);
  const tr = useT();
  useEffect(() => {
    fetch("/api/vote?seen=", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setT(j.totals))
      .catch(() => setT(null));
  }, []);
  if (!t) return null;
  const all = t.original + t.redesign;
  if (!all) return <p className="mt-3 text-graphite">{tr("tally.none")}</p>;
  const pct = Math.round((t.redesign / all) * 100);
  return (
    <div className="mt-4">
      <p className="text-lg">
        {tr("tally.text", { pct: `${pct}%`, n: all })}
      </p>
      <div className="mt-3 flex h-3 w-full max-w-md overflow-hidden rounded-full border border-rule bg-sheet" aria-hidden>
        <div className="bg-ink" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 flex max-w-md justify-between text-sm text-graphite">
        <span>{tr("tally.redesign")} {t.redesign}</span>
        <span>{tr("tally.real")} {t.original}</span>
      </p>
    </div>
  );
}
