import type { Direction } from "./types";

/* Art-direction concepts. Each sets a palette mode, a type pairing and a signature move, so glow-ups look
   distinct from each other and from the "AI default" (cream background, soft serif, three rounded cards).
   Picked from the target marks plus a brand hash; recent concepts are avoided. Fonts are in FONT_ALLOWLIST. */

export type PaletteMode = "dark" | "crisp" | "brand" | "warm";

export const CONCEPTS = [
  {
    id: "night-menu",
    mode: "dark" as PaletteMode,
    fonts: [["Bodoni Moda", "Hanken Grotesk"], ["Gloock", "DM Sans"]],
    text: "Night menu: a dark, candle-lit page. A towering high-contrast serif headline, the best photo in a tall arch-shaped frame (border-radius: 999px 999px 0 0), the offer typeset like a fine-dining card with hairline rules and leader dots, a thin var(--color-accent) line as the only ornament.",
  },
  {
    id: "poster",
    mode: "brand" as PaletteMode,
    fonts: [["Anton", "Familjen Grotesk"], ["Bebas Neue", "Schibsted Grotesk"]],
    text: "Street poster: the hero is a full-width var(--color-primary) block with a condensed headline set huge (fills the width, clamped), the best photo in full colour, cropped hard into a tall panel that overlaps the colour block, stacked bold blocks, a ticker-like strip of opening hours.",
  },
  {
    id: "magazine",
    mode: "crisp" as PaletteMode,
    fonts: [["Cormorant Garamond", "Hanken Grotesk"], ["Newsreader", "Instrument Sans"]],
    text: "Magazine cover: the brand name as a giant masthead across the top, a cover photo below it with two or three cover lines set on it in solid panels, a drop cap on the about text, a two-column article layout with a pull quote taken verbatim from the page text.",
  },
  {
    id: "swiss",
    mode: "crisp" as PaletteMode,
    fonts: [["Schibsted Grotesk", "Schibsted Grotesk"], ["Familjen Grotesk", "Hanken Grotesk"]],
    text: "Swiss grid: a strict 12-column grid with deliberate asymmetry, oversized section numbers, thick var(--color-primary) rules, flush-left ragged-right type, photos cropped to strong horizontals, lots of white. Feels like a Basel design poster.",
  },
  {
    id: "bento",
    mode: "dark" as PaletteMode,
    fonts: [["Unbounded", "Sora"], ["Syne", "DM Sans"]],
    text: "Bento board: the page is a mosaic of tiles of different sizes (minmax(0,1fr) grid, spans), one huge photo tile, one primary-coloured tile with the headline, small info tiles for hours and address, generous gaps, crisp corners of var(--radius-card).",
  },
  {
    id: "scrapbook",
    mode: "warm" as PaletteMode,
    fonts: [["Syne", "Epilogue"], ["Young Serif", "Chivo"]],
    text: "Scrapbook: photos as slightly rotated prints with white borders (rotate between -3deg and 3deg), a stamp-like round badge with the brand name, sticker-style labels for the offer, a hand-made feel built only from CSS.",
  },
  {
    id: "cinema",
    mode: "dark" as PaletteMode,
    fonts: [["Italiana", "Hanken Grotesk"], ["Big Shoulders Display", "Instrument Sans"]],
    text: "Cinema: a full-viewport photo hero with a solid dark band across its lower third holding the headline, letterbox proportions, sections that alternate wide photo strips and short text, credits-style footer.",
  },
] as const;

export type Concept = (typeof CONCEPTS)[number];

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function pickConcept(d: Direction, avoid: string[] = []): Concept {
  const fixed = CONCEPTS.find((x) => x.id === d.concept);
  if (fixed) return fixed;
  const a = (id: string) => d.axes.find((x) => x.id === id)?.target ?? 50;
  const food = /bäck|bakery|café|cafe|kaffee|coffee|restaurant|beiz|baiz|bar|pizza|confis|food|metzg|menu|speise|küche|bier|wein/i.test(d.brand.offer + d.brand.name);
  const scores: Record<string, number> = {
    "night-menu": (food ? 60 : 0) + a("flat_deep") + (100 - a("formal_informal")) / 2,
    poster: a("formal_informal") + (100 - a("enthusiastic_rational")),
    magazine: a("systematic_crafted") + a("dense_airy") / 2 + (100 - a("formal_informal")) / 2,
    swiss: (100 - a("systematic_crafted")) + a("enthusiastic_rational"),
    bento: (100 - a("dense_airy")) + (100 - a("systematic_crafted")) / 2 + 20,
    scrapbook: a("systematic_crafted") + a("formal_informal") / 2 + (100 - a("funny_serious")) / 2,
    cinema: a("flat_deep") + a("dense_airy") / 2 + (food ? 30 : 0),
  };
  const all = [...CONCEPTS].sort((x, y) => scores[y.id] - scores[x.id]);
  const fresh = all.filter((x) => !avoid.includes(x.id));
  const ranked = fresh.length >= 2 ? fresh : all;
  // Brand hash picks among the top three so similar shops still look different.
  return ranked[hash(d.brand.name) % Math.min(3, ranked.length)];
}

export function conceptFonts(d: Direction): { display: string; body: string } {
  const c = pickConcept(d);
  const [display, body] = c.fonts[hash(d.brand.name + c.id) % c.fonts.length];
  return { display, body };
}

export const MODE_RULES: Record<PaletteMode, string> = {
  dark: "Dark mode: bg is a very dark colour tinted with the brand hue (not pure black), surface slightly lighter, text near-white, primary and accent luminous enough to glow on the dark bg.",
  crisp: "Crisp mode: bg is pure or near-pure white, text near-black, surface a very light tint of the brand hue, primary used in strong, deliberate blocks. No cream, no beige.",
  brand: "Brand mode: bg is near-white or near-black (whichever suits the brand), primary is a saturated version of the brand colour used for full-width blocks, on-primary must be crisp. No cream, no beige.",
  warm: "Warm paper mode: a warm off-white bg is allowed here only, with deep ink text and a punchy primary.",
};

/* ---------- learning from the blind vote (Thompson-sampling bandit over concepts) ---------- */

export type ConceptStats = Record<string, { wins: number; n: number }>;

export function parseStats(flat: Record<string, number>): ConceptStats {
  const s: ConceptStats = {};
  for (const c of CONCEPTS) s[c.id] = { wins: flat[`${c.id}:w`] ?? 0, n: flat[`${c.id}:n`] ?? 0 };
  return s;
}

/** Gamma(k, 1) for small integer k: sum of k exponentials. */
function gammaInt(k: number): number {
  let x = 0;
  for (let i = 0; i < Math.min(k, 400); i++) x -= Math.log(1 - Math.random());
  return x;
}
/** One draw from Beta(1 + wins, 1 + losses): how good this concept might be, given the votes so far. */
export function sampleWinRate({ wins, n }: { wins: number; n: number }): number {
  const a = gammaInt(1 + wins), b = gammaInt(1 + Math.max(0, n - wins));
  return a / (a + b);
}

/** Picks a concept from fit-to-target-marks plus a Thompson sample of its vote win rate. More votes, more exploitation. */
export function pickConceptLearned(d: Direction, avoid: string[], stats: ConceptStats): Concept {
  const base = pickConcept({ ...d, concept: undefined }, avoid);
  const fresh = CONCEPTS.filter((c) => !avoid.includes(c.id));
  const pool = fresh.length >= 2 ? fresh : [...CONCEPTS];
  let best = base, bestScore = -1;
  for (const c of pool) {
    const fit = c.id === base.id ? 0.35 : 0.15; // prior: the hand-made fit rule
    const score = fit + sampleWinRate(stats[c.id] ?? { wins: 0, n: 0 });
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

export function statsSummary(stats: ConceptStats): string {
  const rows = Object.entries(stats).filter(([, s]) => s.n > 0).sort((a, b) => b[1].wins / b[1].n - a[1].wins / a[1].n);
  if (!rows.length) return "";
  return rows.map(([id, s]) => `${id}: redesign preferred in ${s.wins} of ${s.n} blind votes`).join("; ");
}
