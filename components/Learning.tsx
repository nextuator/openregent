"use client";

import { useEffect, useState } from "react";

type Row = { id: string; wins: number; n: number; rate: number | null };

const LABEL: Record<string, string> = {
  "night-menu": "Night menu",
  poster: "Street poster",
  magazine: "Magazine cover",
  swiss: "Swiss grid",
  bento: "Bento board",
  scrapbook: "Scrapbook",
  cinema: "Cinema",
};

/** Landing section: the art directions and how often voters preferred them over the real site. */
export function Learning() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    fetch("/api/learning", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setRows(j.rows))
      .catch(() => setRows(null));
  }, []);
  if (!rows) return null;
  const sorted = [...rows].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
  return (
    <ul className="mt-6 grid gap-2 sm:grid-cols-2">
      {sorted.map((r) => (
        <li key={r.id} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 font-semibold">{LABEL[r.id] ?? r.id}</span>
          <span className="relative h-2 flex-1 overflow-hidden rounded-full border border-rule bg-sheet" aria-hidden>
            <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${Math.round((r.rate ?? 0) * 100)}%` }} />
          </span>
          <span className="num w-28 shrink-0 text-right text-graphite">{r.n ? `${Math.round((r.rate ?? 0) * 100)}% of ${r.n}` : "no votes yet"}</span>
        </li>
      ))}
    </ul>
  );
}
