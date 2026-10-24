import { AXES, type Direction } from "@/lib/types";
import { Tick } from "./marks";

export function TargetMarks({ direction }: { direction: Direction }) {
  return (
    <div className="max-w-[980px]">
      <p className="mb-2 max-w-[70ch] text-lg">
        Where {direction.brand.name} sits now, and where the redesign should land. We keep <span className="font-semibold">{direction.keep.primaryHex}</span>
        {direction.keep.logoUrl ? " and the logo" : ""}: {direction.keep.why}
      </p>
      <ul>
        {direction.axes.map((a) => {
          const spec = AXES.find((x) => x.id === a.id)!;
          const gap = Math.abs(a.target - a.now);
          const toward = a.target < a.now ? spec.left : spec.right;
          const lo = Math.min(a.now, a.target), hi = Math.max(a.now, a.target);
          return (
            <li key={a.id} className="border-b border-rule py-7">
              <div className="flex items-center gap-4">
                <span className="w-28 shrink-0 text-right font-semibold">{spec.left}</span>
                <div className="relative h-16 flex-1" aria-hidden>
                  <div className="absolute inset-x-0 top-1/2 h-px bg-ink" />
                  <div className="absolute top-1/2 h-0.5 -translate-y-1/4 bg-redline" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                  <div className="absolute top-1/2" style={{ left: `${a.now}%` }}>
                    <span className="num absolute -top-8 -translate-x-1/2 text-sm">{a.now}</span>
                    <span className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-sheet" />
                  </div>
                  <div className="absolute top-1/2" style={{ left: `${a.target}%` }}>
                    <span className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-redline" />
                    <span className="num absolute top-3 -translate-x-1/2 text-sm font-semibold text-redline">{a.target}</span>
                  </div>
                </div>
                <span className="w-28 shrink-0 font-semibold">{spec.right}</span>
              </div>
              <div className="mt-3 sm:pl-32">
                <p className="num font-semibold">
                  Now {a.now}, target {a.target}. {gap === 0 ? "Hold." : `Gap ${gap}, toward ${toward}.`}
                </p>
                <p className="mt-1 flex max-w-[70ch] gap-2">
                  <Tick />
                  <span>{a.change}</span>
                </p>
                <p className="mt-1 max-w-[70ch] text-sm italic text-graphite">{a.basis}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
