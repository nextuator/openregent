import { readFile } from "fs/promises";
import path from "path";
import Link from "next/link";

export type SavedRunEntry = { slug: string; url: string; name: string };

async function loadIndex(): Promise<SavedRunEntry[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "public/runs/index.json"), "utf8");
    return JSON.parse(raw) as SavedRunEntry[];
  } catch {
    return [];
  }
}

export async function Gallery() {
  const runs = await loadIndex();
  if (!runs.length) {
    return <p className="mt-4 text-graphite">Nothing glowed up yet. Paste a website above.</p>;
  }
  return (
    <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {runs.map((r) => (
        <li key={r.slug}>
          <Link href={`/glow?run=${r.slug}`} className="group block rounded-frame border border-rule bg-sheet p-3 hover:border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/runs/${r.slug}/before.jpg`} alt={`Original homepage of ${r.name}`} className="aspect-[16/10] w-full rounded-control object-cover object-top" />
            <span className="mt-3 block font-semibold">{r.name}</span>
            <span className="block text-sm text-graphite">{new URL(r.url).hostname}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
