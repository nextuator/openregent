import { readFile } from "fs/promises";
import path from "path";
import { hgetallToObject, redis } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 300;

/* Blind vote: one original homepage vs its glow-up, in random order. Banner removed only inside the vote frames;
   the vote page itself discloses that one side is a concept redesign by Glowup. */

type Saved = { slug: string; url: string; name: string; sample?: boolean };
type Pair = { id: string; host: string; brand: string; original: string; redesign: string };

function stripBanner(html: string): string {
  return html
    .replace(/<div class="glowup-concept-banner"[\s\S]*?<\/div>/, "")
    .replace("</head>", "<style>body{padding-top:0!important}html{scrollbar-width:none}::-webkit-scrollbar{display:none}a{pointer-events:none}</style></head>");
}

async function savedPool(): Promise<Saved[]> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "public/runs/index.json"), "utf8")) as Saved[];
  } catch {
    return [];
  }
}

async function load(id: string): Promise<Pair | null> {
  if (id.startsWith("saved:")) {
    const slug = id.slice(6);
    if (!/^[a-z0-9-]+$/.test(slug)) return null;
    try {
      const r = JSON.parse(await readFile(path.join(process.cwd(), "public/runs", slug, "run.json"), "utf8"));
      return { id, host: new URL(r.meta.finalUrl).hostname, brand: r.direction.brand.name, original: `/runs/${slug}/before-full.jpg`, redesign: stripBanner(r.html) };
    } catch {
      return null;
    }
  }
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [run, cap] = await Promise.all([redis<string | null>(["GET", `run:${id}`]), redis<string | null>(["GET", `cap:${id}`])]);
  if (!run || !cap) return null;
  const r = JSON.parse(run) as { host: string; brand: string; html: string };
  return { id, host: r.host, brand: r.brand, original: ((c: { viewport: string; full?: string }) => c.full ?? c.viewport)(JSON.parse(cap)), redesign: stripBanner(r.html) };
}

async function totals() {
  const all = hgetallToObject(await redis<string[]>(["HGETALL", "votes:all"]).catch(() => []));
  return { original: all.original ?? 0, redesign: all.redesign ?? 0 };
}

export async function GET(req: Request) {
  const seen = new Set((new URL(req.url).searchParams.get("seen") ?? "").split(",").filter(Boolean));
  const live = await redis<string[]>(["LRANGE", "runs", 0, 199]).catch(() => [] as string[]);
  const ids = [...new Set([...live, ...(await savedPool()).filter((s) => !s.sample).map((s) => `saved:${s.slug}`)])].filter((id) => !seen.has(id));
  for (let tries = 0; tries < 5 && ids.length; tries++) {
    const i = Math.floor(Math.random() * ids.length);
    const pair = await load(ids[i]);
    if (pair) return Response.json({ pair, redesignFirst: Math.random() < 0.5, remaining: ids.length - 1, totals: await totals() }, { headers: { "Cache-Control": "no-store" } });
    ids.splice(i, 1);
  }
  return Response.json({ pair: null, totals: await totals() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string; pick?: string } | null;
  if (!body?.id || (body.pick !== "original" && body.pick !== "redesign") || !(await load(body.id))) {
    return Response.json({ error: { code: "bad_request", message: "Unknown pair" } }, { status: 400 });
  }
  await redis(["HINCRBY", `votes:${body.id}`, body.pick, 1]);
  await redis(["HINCRBY", "votes:all", body.pick, 1]);
  const mine = hgetallToObject(await redis<string[]>(["HGETALL", `votes:${body.id}`]));
  return Response.json({ pair: { original: mine.original ?? 0, redesign: mine.redesign ?? 0 }, totals: await totals() });
}
