"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mark } from "./marks";

type Pair = { id: string; host: string; brand: string; original: string; redesign: string };
type Totals = { original: number; redesign: number };
type Next = { pair: Pair | null; redesignFirst?: boolean; remaining?: number; totals: Totals };

const SEEN_KEY = "glowup-voted";
const seen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
};

const W = 1440, H = 703;

function Frame({ side, kind, src, label }: { side: string; kind: "image" | "html"; src: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative w-full overflow-hidden rounded-frame border border-rule bg-sheet" style={{ aspectRatio: `${W} / ${H}` }} aria-label={label}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }} className="pointer-events-none">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="block h-full w-full object-cover object-top" />
        ) : (
          <iframe title={`Homepage ${side}`} srcDoc={src} sandbox="" tabIndex={-1} className="h-full w-full border-0" />
        )}
      </div>
    </div>
  );
}

export function VoteView() {
  const [next, setNext] = useState<Next | null>(null);
  const [result, setResult] = useState<{ pickedRedesign: boolean; pair: Totals; totals: Totals } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setResult(null);
    const r = await fetch(`/api/vote?seen=${encodeURIComponent(seen().join(","))}`, { cache: "no-store" });
    setNext(await r.json());
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
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...seen(), next.pair.id].slice(-200)));
      } catch {
        /* ignore */
      }
      setResult({ pickedRedesign: pick === "redesign", pair: j.pair, totals: j.totals });
    } finally {
      setBusy(false);
    }
  }

  const totals = result?.totals ?? next?.totals;
  const totalVotes = totals ? totals.original + totals.redesign : 0;
  const pct = totals && totalVotes ? Math.round((totals.redesign / totalVotes) * 100) : null;

  if (!next) return <p className="text-graphite">Loading a pair…</p>;

  const p = next.pair;
  const sides = p
    ? next.redesignFirst
      ? [{ kind: "html" as const, src: p.redesign, isRedesign: true }, { kind: "image" as const, src: p.original, isRedesign: false }]
      : [{ kind: "image" as const, src: p.original, isRedesign: false }, { kind: "html" as const, src: p.redesign, isRedesign: true }]
    : [];

  return (
    <div>
      <p className="max-w-[70ch] text-lg">
        Each pair shows the same business twice. One is its real homepage, the other is a concept redesign by Glowup, not affiliated with the business. Pick the one
        that looks better.
      </p>
      {pct !== null && (
        <p className="mt-3 text-graphite">
          So far, voters picked the redesign <Mark>{pct}%</Mark> of the time, over <span className="num">{totalVotes}</span> votes.
        </p>
      )}

      {!p ? (
        <p className="mt-10 text-lg">
          You&apos;ve voted on every pair. Thanks.{" "}
          <Link href="/" className="underline underline-offset-4">
            Glow up a site
          </Link>
        </p>
      ) : (
        <>
          <h2 className="display mt-10 text-2xl">{p.brand}</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {sides.map((s, i) => {
              const letter = i === 0 ? "A" : "B";
              return (
                <figure key={letter}>
                  <figcaption className="mb-2 flex items-baseline justify-between font-semibold">
                    <span>Homepage {letter}</span>
                    {result && <span className={s.isRedesign ? "text-redline" : "text-graphite"}>{s.isRedesign ? "Glowup redesign" : "The real site"}</span>}
                  </figcaption>
                  <Frame side={letter} kind={s.kind} src={s.src} label={`Homepage ${letter}`} />
                  {!result && (
                    <button
                      onClick={() => void vote(s.isRedesign ? "redesign" : "original")}
                      disabled={busy}
                      className="mt-3 w-full rounded-control border-[1.5px] border-ink bg-highlight px-4 py-3 font-semibold hover:brightness-95 disabled:opacity-60"
                    >
                      {letter} looks better
                    </button>
                  )}
                </figure>
              );
            })}
          </div>
          {result && (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <p className="text-lg">
                You picked {result.pickedRedesign ? "the redesign" : "the real site"}. For this business: redesign <span className="num">{result.pair.redesign}</span>, real site{" "}
                <span className="num">{result.pair.original}</span>.
              </p>
              <button onClick={() => void load()} className="rounded-control border-[1.5px] border-ink bg-sheet px-5 py-2 font-semibold">
                Next pair
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
