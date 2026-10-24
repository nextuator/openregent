"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** A swipeable deck of 1920×1080 slides (scroll-snap: swipe on touch, arrows and dots on desktop). */
export function SlideDeck({
  slides,
  label,
  downloadLabel,
  busy,
  onDownload,
}: {
  slides: ReactNode[];
  label: string;
  downloadLabel: string;
  busy: boolean;
  onDownload: (node: HTMLElement) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const [i, setI] = useState(0);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    if (!track.current) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1920));
    ro.observe(track.current);
    return () => ro.disconnect();
  }, []);

  const go = (n: number) => {
    const k = Math.max(0, Math.min(slides.length - 1, n));
    track.current?.scrollTo({ left: k * track.current.clientWidth, behavior: "smooth" });
    setI(k);
  };

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold">
          {label} <span className="num font-normal text-graphite">{i + 1} / {slides.length}</span>
        </span>
        <span className="flex gap-2">
          <button onClick={() => go(i - 1)} disabled={i === 0} aria-label="‹" className="rounded-control border-[1.5px] border-ink bg-sheet px-3 py-1.5 font-semibold disabled:opacity-40">
            ←
          </button>
          <button onClick={() => go(i + 1)} disabled={i === slides.length - 1} aria-label="›" className="rounded-control border-[1.5px] border-ink bg-sheet px-3 py-1.5 font-semibold disabled:opacity-40">
            →
          </button>
          <button
            onClick={() => nodes.current[i] && onDownload(nodes.current[i]!)}
            disabled={busy}
            className="rounded-control border-[1.5px] border-ink bg-ink px-4 py-1.5 font-semibold text-sheet hover:bg-graphite disabled:opacity-60"
          >
            {downloadLabel}
          </button>
        </span>
      </figcaption>
      <div
        ref={track}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex snap-x snap-mandatory overflow-x-auto border border-rule [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, n) => (
          <div key={n} className="relative w-full shrink-0 snap-center overflow-hidden" style={{ aspectRatio: "1920 / 1080" }}>
            <div className="absolute left-0 top-0" style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <div ref={(el) => { nodes.current[n] = el; }} data-n={n + 1} style={{ width: 1920, height: 1080 }}>
                {s}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-2" role="tablist">
        {slides.map((_, n) => (
          <button key={n} onClick={() => go(n)} aria-label={`${n + 1}`} aria-selected={n === i} className={`h-2.5 w-2.5 rounded-full ${n === i ? "bg-ink" : "bg-rule"}`} />
        ))}
      </div>
    </figure>
  );
}
