import { readFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { Compare } from "./Compare";
import { T } from "@/lib/i18n";

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

export async function Samples({ limit = 2 }: { limit?: number }) {
  const samples = (await load()).slice(0, limit);
  if (!samples.length) return null;
  return (
    <section aria-labelledby="samples" className="pb-4">
      <h2 id="samples" className="display text-2xl">
        <T k="samples.title" />
      </h2>
      
      <ul className="mt-8 grid gap-10">
        {samples.map(({ e, html }) => (
          <li key={e.slug}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">{e.name}</h3>
              <Link href={`/glow?run=${e.slug}`} className="underline underline-offset-4 hover:text-ink">
                <T k="samples.link" />
              </Link>
            </div>
            <Compare before={`/runs/${e.slug}/before.jpg`} html={html} />
          </li>
        ))}
      </ul>
    </section>
  );
}
