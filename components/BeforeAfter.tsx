"use client";

import { useEffect, useRef, useState } from "react";
import type { Run } from "./RunView";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const FRAME_H = "h-[72vh]";

export function BeforeAfter({ run, streamingHtml }: { run: Run; streamingHtml: string }) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [ref, width] = useWidth<HTMLDivElement>();
  const frameW = mode === "desktop" ? 1280 : 390;
  const scale = width ? Math.min(1, width / frameW) : 1;
  const html = run.html ?? streamingHtml;
  const done = !!run.html;

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <button
          onClick={() => setMode("desktop")}
          aria-pressed={mode === "desktop"}
          className={`rounded-control border-[1.5px] border-ink px-4 py-1.5 ${mode === "desktop" ? "bg-ink font-semibold text-sheet" : "bg-sheet"}`}
        >
          Show desktop
        </button>
        <button
          onClick={() => setMode("mobile")}
          aria-pressed={mode === "mobile"}
          className={`rounded-control border-[1.5px] border-ink px-4 py-1.5 ${mode === "mobile" ? "bg-ink font-semibold text-sheet" : "bg-sheet"}`}
        >
          Show mobile
        </button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <figure className="order-2 md:order-1">
          <figcaption className="mb-2 font-semibold">Before</figcaption>
          <div className={`${FRAME_H} overflow-y-auto rounded-frame border border-rule bg-sheet`}>
            {run.full ? (
              <div className={mode === "mobile" ? "mx-auto w-full max-w-[390px]" : ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={run.full} alt={`Full-page screenshot of the original ${run.meta?.finalUrl ?? "site"}`} className="block w-full" />
              </div>
            ) : (
              <p className="p-6 text-graphite">The screenshot of the original site appears here.</p>
            )}
          </div>
          {mode === "mobile" && run.full && <p className="mt-2 text-sm text-graphite">The original was captured at desktop width.</p>}
        </figure>
        <figure className="order-1 md:order-2">
          <figcaption className="mb-2 font-semibold">After</figcaption>
          <div className="relative">
            <div
              ref={ref}
              className={`${FRAME_H} relative overflow-hidden rounded-frame border border-rule bg-sheet ${done ? "shadow-lift" : ""}`}
            >
              {html ? (
                <div
                  style={{
                    width: frameW,
                    height: `calc(72vh / ${scale})`,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    marginLeft: mode === "mobile" && width > frameW ? (width - frameW) / 2 : 0,
                  }}
                >
                  <iframe
                    title="Concept redesign"
                    srcDoc={html}
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    className="h-full w-full border-0 bg-sheet"
                  />
                </div>
              ) : (
                <p className="flex h-full items-center justify-center p-6 text-graphite">The redesign appears here once the tokens are built.</p>
              )}
            </div>
            {done && <Glow />}
          </div>
        </figure>
      </div>
    </div>
  );
}

/** The one orchestrated motion: a highlighter outline drawn once around the finished redesign. */
function Glow() {
  return (
    <svg aria-hidden className="pointer-events-none absolute -inset-[5px] h-[calc(100%+10px)] w-[calc(100%+10px)]">
      <rect
        x="3"
        y="3"
        style={{ width: "calc(100% - 6px)", height: "calc(100% - 6px)" }}
        rx="12"
        pathLength={1}
        fill="none"
        stroke="var(--color-highlight)"
        strokeWidth="6"
        className="glow-draw"
      />
    </svg>
  );
}
