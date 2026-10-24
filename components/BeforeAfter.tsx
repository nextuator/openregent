"use client";

import { useEffect, useRef, useState } from "react";
import type { Run } from "./RunView";
import { Compare } from "./Compare";
import { useT } from "@/lib/i18n";

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
  const [mode, setMode] = useState<"desktop" | "mobile" | "compare">("desktop");
  const t = useT();
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
          {t("ba.desktop")}
        </button>
        <button
          onClick={() => setMode("mobile")}
          aria-pressed={mode === "mobile"}
          className={`rounded-control border-[1.5px] border-ink px-4 py-1.5 ${mode === "mobile" ? "bg-ink font-semibold text-sheet" : "bg-sheet"}`}
        >
          {t("ba.mobile")}
        </button>
        {done && run.viewport && (
          <button
            onClick={() => setMode("compare")}
            aria-pressed={mode === "compare"}
            className={`rounded-control border-[1.5px] border-ink px-4 py-1.5 ${mode === "compare" ? "bg-ink font-semibold text-sheet" : "bg-sheet"}`}
          >
            {t("ba.compare")}
          </button>
        )}
      </div>
      {mode === "compare" && run.html && run.viewport ? (
        <Compare before={run.viewport} html={run.html} beforeLabel={t("ba.before")} afterLabel={t("ba.after")} />
      ) : (
      <div className="grid gap-6 md:grid-cols-2">
        <figure className="order-2 min-w-0 md:order-1">
          <figcaption className="mb-2 font-semibold">{t("ba.before")}</figcaption>
          <div className={`${FRAME_H} overflow-y-auto rounded-frame border border-rule bg-sheet`}>
            {run.full ? (
              <div className={mode === "mobile" ? "mx-auto w-full max-w-[390px]" : ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={run.full} alt={`Full-page screenshot of the original ${run.meta?.finalUrl ?? "site"}`} className="block w-full" />
              </div>
            ) : (
              <p className="p-6 text-graphite">{t("ba.shot")}</p>
            )}
          </div>
          {mode === "mobile" && run.full && <p className="mt-2 text-sm text-graphite">{t("ba.desktopnote")}</p>}
        </figure>
        <figure className="order-1 min-w-0 md:order-2">
          <figcaption className="mb-2 font-semibold">{t("ba.after")}</figcaption>
          <div className="relative">
            <div
              ref={ref}
              className={`${FRAME_H} relative overflow-hidden rounded-frame border border-rule bg-sheet ${done ? "shadow-lift" : ""}`}
            >
              {html ? (
                <div
                  className="absolute left-0 top-0"
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
                <div className="flex h-full flex-col gap-5 p-6" aria-label={t("ba.wait")}>
                  <div className="h-4 w-1/3 animate-pulse bg-paper" />
                  <div className="h-14 w-4/5 animate-pulse bg-paper" />
                  <div className="h-14 w-3/5 animate-pulse bg-paper" />
                  <div className="h-40 w-full animate-pulse bg-paper" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 animate-pulse bg-paper" />
                    <div className="h-24 animate-pulse bg-paper" />
                    <div className="h-24 animate-pulse bg-paper" />
                  </div>
                  <p className="mt-auto text-sm text-graphite">{t("ba.wait")}</p>
                </div>
              )}
            </div>
            {done && <Glow />}
          </div>
        </figure>
      </div>
      )}
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
