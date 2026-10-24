import { readFile } from "fs/promises";
import path from "path";
import { AXES, type Audit, type Direction, type TokensResult } from "@/lib/types";
import { Mark } from "./marks";
import { T } from "@/lib/i18n";

/* Home hero illustration: a proof sheet with the real numbers from one saved glow-up (no brand shown, so the vote stays blind). */

async function sample(): Promise<{ audit: Audit; direction: Direction; tokens: TokensResult } | null> {
  try {
    const root = path.join(process.cwd(), "public/runs");
    const index = JSON.parse(await readFile(path.join(root, "index.json"), "utf8")) as { slug: string }[];
    if (!index.length) return null;
    return JSON.parse(await readFile(path.join(root, index[0].slug, "run.json"), "utf8"));
  } catch {
    return null;
  }
}

export async function ProofCard() {
  const s = await sample();
  if (!s) return null;
  const { audit, direction, tokens } = s;
  const axes = direction.axes.filter((a) => ["warm_cool", "dense_airy", "flat_deep"].includes(a.id));
  const swatches = Object.values(tokens.tokens.color).slice(0, 7);
  return (
    <figure aria-label="Example audit" className="relative rotate-[1.2deg] rounded-frame border border-rule bg-sheet p-7 shadow-lift">
      <p className="text-sm text-graphite"><T k="proof.caption" /></p>
      <p className="mt-3 text-lg leading-relaxed">
        <Mark>{audit.colors.literals}</Mark> <T k="proof.literals" />, <Mark>{audit.colors.distinct}</Mark> <T k="proof.distinct" />, <Mark>{audit.fonts.families.length}</Mark>{" "}
        <T k="proof.families" />.
      </p>
      <ul className="mt-6 space-y-5">
        {axes.map((a) => {
          const spec = AXES.find((x) => x.id === a.id)!;
          const lo = Math.min(a.now, a.target), hi = Math.max(a.now, a.target);
          return (
            <li key={a.id}>
              <div className="flex justify-between text-sm font-semibold">
                <span>{spec.left}</span>
                <span>{spec.right}</span>
              </div>
              <div className="relative mt-2 h-4" aria-hidden>
                <div className="absolute inset-x-0 top-1/2 h-px bg-ink" />
                <div className="absolute top-1/2 h-0.5 -translate-y-1/4 bg-redline" style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
                <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-sheet" style={{ left: `${a.now}%` }} />
                <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-redline" style={{ left: `${a.target}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-7 flex items-center gap-2">
        <span className="text-sm text-graphite"><T k="proof.becomes" /></span>
        {swatches.map((c, i) => (
          <span key={i} className="h-6 w-6 rounded-full border border-rule" style={{ background: c }} />
        ))}
        <span className="text-sm text-graphite"><T k="proof.tokens" /></span>
      </div>
    </figure>
  );
}
