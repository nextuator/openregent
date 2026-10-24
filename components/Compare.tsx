"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { proxyImages } from "@/lib/assemble";

/** Before/after slider: the original screenshot underneath, the redesign on top, revealed up to a draggable handle. */
export function Compare({ before, html, beforeLabel: bl, afterLabel: al }: { before: string; html: string; beforeLabel?: string; afterLabel?: string }) {
  const t = useT();
  const beforeLabel = bl ?? t("samples.before");
  const afterLabel = al ?? t("samples.after");
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [pos, setPos] = useState(50);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1440));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative aspect-[1440/900] w-full select-none overflow-hidden border border-rule bg-sheet">
      {/* before */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt={beforeLabel} className="absolute inset-0 h-full w-full object-cover object-top" draggable={false} />
      {/* after, clipped to the right of the handle */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <div className="pointer-events-none absolute left-0 top-0" style={{ width: 1440, height: 900, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <iframe title={afterLabel} srcDoc={proxyImages(html)} sandbox="" tabIndex={-1} className="h-full w-full border-0 bg-sheet" />
        </div>
      </div>
      {/* labels */}
      <span className="pointer-events-none absolute left-3 top-3 bg-ink px-2 py-1 text-sm font-semibold text-sheet">{beforeLabel}</span>
      <span className="pointer-events-none absolute right-3 top-3 bg-redline px-2 py-1 text-sm font-semibold text-sheet">{afterLabel}</span>
      {/* handle */}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-sheet text-lg font-semibold">
          ⇆
        </span>
      </div>
      {/* the control: a full-size transparent range input, so mouse, touch and keyboard all work */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`${beforeLabel} / ${afterLabel}`}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
