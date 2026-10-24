"use client";

import { useEffect, useState } from "react";
import { Mark } from "./marks";

/** Live tally of the blind vote, for the home page. */
export function VoteTally() {
  const [t, setT] = useState<{ original: number; redesign: number } | null>(null);
  useEffect(() => {
    fetch("/api/vote?seen=", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setT(j.totals))
      .catch(() => setT(null));
  }, []);
  if (!t) return null;
  const all = t.original + t.redesign;
  if (!all) return <p className="mt-3 text-graphite">No votes yet. Be the first.</p>;
  const pct = Math.round((t.redesign / all) * 100);
  return (
    <div className="mt-4">
      <p className="text-lg">
        Voters picked the redesign <Mark>{pct}%</Mark> of the time, over <span className="num">{all}</span> votes.
      </p>
      <div className="mt-3 flex h-3 w-full max-w-md overflow-hidden rounded-full border border-rule bg-sheet" aria-hidden>
        <div className="bg-ink" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 flex max-w-md justify-between text-sm text-graphite">
        <span>Redesign {t.redesign}</span>
        <span>Real site {t.original}</span>
      </p>
    </div>
  );
}
