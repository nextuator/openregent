import { readFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { Thumb } from "./Thumb";

/* Home: labelled before/after samples. Only entries marked "sample" in public/runs/index.json, which the blind vote excludes. */

type Entry = { slug: string; url: string; name: string; sample?: boolean };

async function load(): Promise<{ e: Entry; html: string }[]> {
  try {
    const root = path.join(process.cwd(), "public/runs");
    const index = JSON.parse(await readFile(path.join(root, "index.json"), "utf8")) as Entry[];
    const picks = index.filter((e) => e.sample).slice(0, 2);
    return Promise.all(picks.map(async (e) => ({ e, html: (JSON.parse(await readFile(path.join(root, e.slug, "run.json"), "utf8")) as { html: string }).html })));
  } catch {
    return [];
  }
}

export async function Samples() {
  const samples = await load();
  if (!samples.length) return null;
  return (
    <section aria-labelledby="samples" className="border-t border-rule py-14">
      <h2 id="samples" className="display text-2xl">
        Sample glow-ups
      </h2>
      <p className="mt-2 max-w-[60ch] text-graphite">Real Basel businesses, measured and redesigned from their own content. These two are not in the vote.</p>
      <ul className="mt-8 grid gap-10">
        {samples.map(({ e, html }) => (
          <li key={e.slug}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">{e.name}</h3>
              <Link href={`/glow?run=${e.slug}`} className="underline underline-offset-4 hover:text-ink">
                See the audit, target marks and tokens
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <figure className="min-w-0">
                <figcaption className="mb-2 text-sm text-graphite">Before</figcaption>
                <Thumb src={`/runs/${e.slug}/before.jpg`} alt={`Original homepage of ${e.name}`} />
              </figure>
              <figure className="min-w-0">
                <figcaption className="mb-2 text-sm font-semibold">After</figcaption>
                <Thumb html={html} alt={`Concept redesign of ${e.name}`} />
              </figure>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
