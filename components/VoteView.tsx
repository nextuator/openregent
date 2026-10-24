"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mark } from "./marks";

type Pair = { id: string; host: string; brand: string; original: string; redesign: string };
type Totals = { original: number; redesign: number };
type Next = { pair: Pair | null; redesignFirst?: boolean; remaining?: number; totals: Totals };
type Ballot = { id: string; brand: string; redesignFirst: boolean; picked: "original" | "redesign"; original: string };

const SEEN_KEY = "glowup-voted";
const seen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const W = 1440;

/** Both sides scroll the same way, with hidden scrollbars, so neither gives itself away. */
function Frame({ side, kind, src }: { side: string; kind: "image" | "html"; src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 600, h: 500 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const scale = box.w / W;
  return (
    <div
      ref={ref}
      className={`relative h-[62vh] w-full overflow-x-hidden rounded-frame border border-rule bg-sheet [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${kind === "image" ? "overflow-y-auto" : "overflow-y-hidden"}`}
    >
      {kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Homepage ${side}`} className="block w-full" />
      ) : (
        <div className="absolute left-0 top-0" style={{ width: W, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <iframe title={`Homepage ${side}`} srcDoc={src} sandbox="" className="h-full w-full border-0" />
        </div>
      )}
    </div>
  );
}

/** Blind vote: nothing is revealed until the voter finishes. Then every pair is unmasked. */
export function VoteView() {
  const [next, setNext] = useState<Next | null>(null);
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [finished, setFinished] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/vote?seen=${encodeURIComponent(seen().join(","))}`, { cache: "no-store" });
    const j = (await r.json()) as Next;
    setNext(j);
    setTotals(j.totals);
    if (!j.pair) setFinished(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function vote(pick: "original" | "redesign") {
    if (!next?.pair || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: next.pair.id, pick }) });
      const j = await r.json();
      if (j.totals) setTotals(j.totals);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...seen(), next.pair.id].slice(-200)));
      } catch {
        /* ignore */
      }
      setBallots((b) => [...b, { id: next.pair!.id, brand: next.pair!.brand, redesignFirst: !!next.redesignFirst, picked: pick, original: next.pair!.original }]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!next) return <p className="text-graphite">Loading a pair…</p>;

  if (finished) {
    const picked = ballots.filter((b) => b.picked === "redesign").length;
    const all = totals ? totals.original + totals.redesign : 0;
    const pct = totals && all ? Math.round((totals.redesign / all) * 100) : null;
    return (
      <div>
        <h2 className="display text-2xl">The reveal</h2>
        {ballots.length ? (
          <p className="mt-3 text-lg">
            You picked the Glowup redesign in <Mark>{picked}</Mark> of {ballots.length} pairs.
          </p>
        ) : (
          <p className="mt-3 text-lg">You&apos;ve already voted on every pair. Thanks.</p>
        )}
        {pct !== null && (
          <p className="mt-2 text-graphite">
            All voters so far picked the redesign <Mark>{pct}%</Mark> of the time, over <span className="num">{all}</span> votes.
          </p>
        )}
        <ul className="mt-8 grid gap-4">
          {ballots.map((b) => {
            const redesignLetter = b.redesignFirst ? "A" : "B";
            const pickedLetter = (b.picked === "redesign") === b.redesignFirst ? "A" : "B";
            return (
              <li key={b.id} className="grid items-center gap-4 border-t border-rule pt-4 sm:grid-cols-[160px_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.original} alt={`Real homepage of ${b.brand}`} className="aspect-[16/8] w-full rounded-control border border-rule object-cover object-top" />
                <p>
                  <span className="font-semibold">{b.brand}</span>: homepage {redesignLetter} was the Glowup redesign, {redesignLetter === "A" ? "B" : "A"} was the real site. You picked{" "}
                  {pickedLetter}
                  {b.picked === "redesign" ? ", the redesign." : ", the real site."}
                </p>
              </li>
            );
          })}
        </ul>
        <Link href="/" className="mt-8 inline-block rounded-control border-[1.5px] border-ink bg-ink px-6 py-3 font-semibold text-sheet hover:bg-graphite">
          Glow up a site
        </Link>
      </div>
    );
  }

  const p = next.pair!;
  const sides = next.redesignFirst
    ? [{ kind: "html" as const, src: p.redesign, isRedesign: true }, { kind: "image" as const, src: p.original, isRedesign: false }]
    : [{ kind: "image" as const, src: p.original, isRedesign: false }, { kind: "html" as const, src: p.redesign, isRedesign: true }];

  return (
    <div>
      <p className="max-w-[70ch] text-lg">
        Each pair shows the same business twice. One is its real homepage, the other is a concept redesign by Glowup, not affiliated with the business. Pick the one
        that looks better. Scroll inside each page to see all of it. We reveal which is which at the end.
      </p>
      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="display text-2xl">{p.brand}</h2>
        <span className="text-graphite">
          Pair <span className="num">{ballots.length + 1}</span>
          {typeof next.remaining === "number" ? <> of <span className="num">{ballots.length + 1 + next.remaining}</span></> : null}
        </span>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {sides.map((s, i) => {
          const letter = i === 0 ? "A" : "B";
          return (
            <figure key={`${p.id}-${letter}`} className="min-w-0">
              <figcaption className="mb-2 font-semibold">Homepage {letter}</figcaption>
              <Frame side={letter} kind={s.kind} src={s.src} />
              <button
                onClick={() => void vote(s.isRedesign ? "redesign" : "original")}
                disabled={busy}
                className="mt-3 w-full rounded-control border-[1.5px] border-ink bg-ink px-4 py-3 font-semibold text-sheet hover:bg-graphite disabled:opacity-60"
              >
                {letter} looks better
              </button>
            </figure>
          );
        })}
      </div>
      {ballots.length > 0 && (
        <button onClick={() => setFinished(true)} className="mt-6 underline underline-offset-4 hover:text-ink">
          Finish and reveal
        </button>
      )}
    </div>
  );
}
