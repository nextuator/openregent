"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { AXES, type Direction } from "@/lib/types";
import { Tick } from "./marks";

/** Target marks, as in the talk: now (hollow square) vs. target (red diamond). Targets are draggable; regenerate with them. */
export function TargetMarks({ direction, onRegenerate, busy }: { direction: Direction; onRegenerate?: (d: Direction) => void; busy?: boolean }) {
  const t = useT();
  const [targets, setTargets] = useState<Record<string, number>>(() => Object.fromEntries(direction.axes.map((a) => [a.id, a.target])));
  useEffect(() => setTargets(Object.fromEntries(direction.axes.map((a) => [a.id, a.target]))), [direction]);
  const changed = direction.axes.filter((a) => targets[a.id] !== a.target);

  function apply() {
    if (!onRegenerate) return;
    const axes = direction.axes.map((a) => {
      const target = targets[a.id];
      if (target === a.target) return a;
      const spec = AXES.find((x) => x.id === a.id)!;
      const toward = target < a.now ? spec.left : spec.right;
      return { ...a, target, change: `Set by the user to ${target} (was ${a.target}): move clearly toward ${toward}.` };
    });
    // A new concept is picked for the new marks.
    onRegenerate({ ...direction, axes, concept: undefined });
  }

  return (
    <div className="max-w-[980px]">
      <p className="mb-2 max-w-[70ch] text-lg">
        {direction.brand.name} · {t("marks.keep")} <span className="font-semibold">{direction.keep.primaryHex}</span>
        {direction.keep.logoUrl ? ` ${t("marks.logo")}` : ""}.
      </p>
      {onRegenerate && <p className="mb-4 max-w-[70ch] text-graphite">{t("marks.drag")}</p>}

      <ul>
        {direction.axes.map((a) => {
          const spec = AXES.find((x) => x.id === a.id)!;
          const target = targets[a.id];
          const gap = Math.abs(target - a.now);
          const toward = target < a.now ? spec.left : spec.right;
          const lo = Math.min(a.now, target), hi = Math.max(a.now, target);
          return (
            <li key={a.id} className="border-b border-rule py-6">
              <div className="flex items-center gap-4">
                <span className="w-24 shrink-0 text-right font-semibold sm:w-28">{spec.left}</span>
                <div className="relative h-16 flex-1">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-ink" aria-hidden />
                  <div className="absolute top-1/2 h-0.5 -translate-y-1/4 bg-redline" style={{ left: `${lo}%`, width: `${hi - lo}%` }} aria-hidden />
                  <div className="absolute top-1/2" style={{ left: `${a.now}%` }} aria-hidden>
                    <span className="num absolute -top-8 -translate-x-1/2 text-sm">{a.now}</span>
                    <span className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-sheet" />
                  </div>
                  <div className="absolute top-1/2" style={{ left: `${target}%` }} aria-hidden>
                    <span className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-redline ${onRegenerate ? "ring-2 ring-sheet" : ""}`} />
                    <span className="num absolute top-3 -translate-x-1/2 text-sm font-semibold text-redline">{target}</span>
                  </div>
                  {onRegenerate && (
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={target}
                      onChange={(e) => setTargets((p) => ({ ...p, [a.id]: Number(e.target.value) }))}
                      aria-label={`${spec.left} – ${spec.right}`}
                      className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                    />
                  )}
                </div>
                <span className="w-24 shrink-0 font-semibold sm:w-28">{spec.right}</span>
              </div>
              <div className="mt-3 sm:pl-32">
                <p className="num font-semibold">
                  {t("marks.line", { now: a.now, target })} {gap === 0 ? t("marks.hold") : t("marks.gap", { gap, toward })}
                </p>
                <p className="mt-1 flex max-w-[70ch] gap-2">
                  <Tick />
                  <span>{target === a.target ? a.change : t("marks.yours")}</span>
                </p>
                <p className="mt-1 max-w-[70ch] text-sm italic text-graphite">{a.basis}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {onRegenerate && (
        <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-3 border border-ink bg-sheet p-4 shadow-lift">
          <span className="text-graphite">{changed.length ? t("marks.changed", { n: changed.length }) : t("marks.unchanged")}</span>
          <button
            onClick={apply}
            disabled={!changed.length || busy}
            className="ml-auto rounded-control border-[1.5px] border-ink bg-ink px-5 py-2.5 font-semibold text-sheet hover:bg-graphite disabled:opacity-40"
          >
            {t("marks.regen")}
          </button>
          {changed.length > 0 && (
            <button onClick={() => setTargets(Object.fromEntries(direction.axes.map((a) => [a.id, a.target])))} className="underline underline-offset-4">
              {t("marks.reset")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
