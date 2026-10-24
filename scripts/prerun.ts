/* npm run prerun -- <url> [<url> …]  →  public/runs/<slug>/{run.json,before.jpg,before-full.jpg} + public/runs/index.json */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { regenerate, runAll } from "../lib/pipeline";

function loadEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const slugify = (url: string) =>
  new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

async function main() {
  loadEnv();
  const reuse = process.argv.includes("--reuse");
  const urls = process.argv.slice(2).filter((a) => a !== "--reuse");
  const used: string[] = [];
  if (!urls.length) throw new Error("Usage: npm run prerun -- <url> [<url> …]");
  const root = path.join(process.cwd(), "public/runs");
  mkdirSync(root, { recursive: true });
  const indexFile = path.join(root, "index.json");
  const index: { slug: string; url: string; name: string }[] = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : [];

  for (const url of urls) {
    const slug = slugify(url);
    console.log(`\n== ${url} → ${slug}`);
    try {
      const dir = path.join(root, slug);
      const log = (s: string) => console.log(`  ${s}`);
      let rest;
      if (reuse && existsSync(path.join(dir, "run.json"))) {
        const saved = JSON.parse(readFileSync(path.join(dir, "run.json"), "utf8"));
        rest = await regenerate(saved, used.slice(-3), log);
      } else {
        const r = await runAll(url, log);
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, "before.jpg"), r.viewportJpeg);
        writeFileSync(path.join(dir, "before-full.jpg"), r.fullJpeg);
        const { viewportJpeg: _v, fullJpeg: _f, ...fresh } = r;
        void _v;
        void _f;
        rest = fresh;
      }
      const r = rest;
      if (r.direction.concept) used.push(r.direction.concept);
      writeFileSync(path.join(dir, "run.json"), JSON.stringify({ ...rest, viewport: `/runs/${slug}/before.jpg`, full: `/runs/${slug}/before-full.jpg` }));
      const entry = { slug, url: r.meta.finalUrl, name: r.direction.brand.name };
      const i = index.findIndex((e) => e.slug === slug);
      if (i >= 0) index[i] = entry;
      else index.push(entry);
      writeFileSync(indexFile, JSON.stringify(index, null, 2) + "\n");
      console.log(`  saved. Auto-fixed: ${r.report.autoFixed.join("; ") || "none"}`);
    } catch (e) {
      console.error(`  FAILED: ${e instanceof Error ? e.message : e}`, (e as { detail?: string }).detail ?? "");
    }
  }
}

main();
