import type { Direction } from "./types";

/* Layout concepts and their type pairings, so redesigns differ from each other and from generic templates.
   Picked from the target marks plus a brand hash. Fonts are all in FONT_ALLOWLIST. */

export const CONCEPTS = [
  {
    id: "editorial",
    fonts: [["Instrument Serif", "Figtree"], ["Libre Caslon Text", "Karla"]],
    text: "Editorial magazine: oversized serif display headline across the hero, a lead photo with a caption-like line, an asymmetric 12-column grid, pull-quote styling for the about text, numbered sections.",
  },
  {
    id: "poster",
    fonts: [["Bricolage Grotesque", "Rubik"], ["Space Grotesk", "Work Sans"]],
    text: "Swiss poster: giant display type that fills the width (clamped so it never overflows), a bold colour block in var(--color-primary) behind the hero, the photo cropped hard into a tall panel, tight uppercase labels for sections.",
  },
  {
    id: "bento",
    fonts: [["Space Grotesk", "Manrope"], ["Archivo", "Nunito Sans"]],
    text: "Bento board: the offer as a tidy grid of differently sized tiles (one big photo tile, small text tiles), crisp 1px rules, compact info strip with hours and phone at the top.",
  },
  {
    id: "fullbleed",
    fonts: [["DM Serif Display", "Manrope"], ["Fraunces", "Figtree"]],
    text: "Full-bleed photo story: a full-viewport hero photo with the headline on a solid var(--color-bg) panel overlapping its bottom edge, alternating photo/text bands, lifted cards for the offer.",
  },
  {
    id: "menuboard",
    fonts: [["Young Serif", "Karla"], ["Fraunces", "Work Sans"]],
    text: "Menu board: the offer as an elegant two-column list with leader lines (dotted borders) between item and detail, a framed hero photo with a thick var(--color-primary) border, a stamp-like badge with the brand name.",
  },
  {
    id: "split",
    fonts: [["Archivo", "Figtree"], ["Libre Caslon Text", "Nunito Sans"]],
    text: "Split screen: hero split 50/50 into a solid var(--color-surface) text column and a photo column, a sticky slim header, a horizontal row for the visit details.",
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
  const food = /bäck|bakery|café|cafe|kaffee|coffee|restaurant|beiz|baiz|bar|pizza|confis|food|metzg|menu|speise|küche|bier/i.test(d.brand.offer + d.brand.name);
  const scores: Record<string, number> = {
    editorial: a("systematic_crafted") + a("dense_airy"),
    poster: a("formal_informal") + (100 - a("enthusiastic_rational")),
    bento: 200 - a("systematic_crafted") - a("dense_airy"),
    fullbleed: a("flat_deep") + a("dense_airy"),
    menuboard: food ? 125 : 60,
    split: a("enthusiastic_rational") + (100 - a("formal_informal")),
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
