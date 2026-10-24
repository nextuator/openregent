import * as cheerio from "cheerio";
import { colorsNamed } from "culori";
import { splitParts } from "./assemble";
import { complete, completeStream } from "./llm";
import { nearestToken } from "./tokens";
import type { Content, Direction, TokensResult } from "./types";

/* Homepage generation (LLM tier "smart"), then token enforcement in code. */

const SYSTEM = `You are an award-winning art director and front-end designer building a concept redesign of a small local business homepage.
Your redesign must look clearly better than the original and unlike a generic template: a confident concept, strong typographic hierarchy, a real photo used boldly, deliberate rhythm and whitespace.
You use only the design tokens you are given, as CSS custom properties. You never write colour literals or font names.
You use only the business's own text, images and facts. You never invent prices, reviews, testimonials, ratings, awards, founding years, staff names or numbers. If information is missing, you leave the section out.
You output exactly two parts and nothing else: one <style>…</style> block, then the body markup from <header> to </footer>. No <html>, <head>, <script>, no markdown fences, no commentary.`;

/* Layout concepts, so redesigns differ from each other. Picked from the target marks plus a brand hash. */
const CONCEPTS = [
  { id: "editorial", when: "crafted + airy", text: "Editorial magazine: oversized serif display headline across the hero, a lead photo with a caption-like line, an asymmetric 12-column grid, pull-quote styling for the about text, numbered sections." },
  { id: "poster", when: "informal / enthusiastic", text: "Swiss poster: giant display type that bleeds to the edges, a bold colour block in var(--color-primary) behind the hero, the photo cropped hard into a tall panel, tight uppercase labels for sections." },
  { id: "bento", when: "systematic + dense", text: "Bento board: the offer as a tidy grid of differently sized tiles (one big photo tile, small text tiles), crisp 1px rules, compact info strip with hours and phone at the top." },
  { id: "fullbleed", when: "deep + airy", text: "Full-bleed photo story: a full-viewport hero photo with the headline on a solid var(--color-bg) panel overlapping its bottom edge, alternating photo/text bands, lifted cards for the offer." },
  { id: "menuboard", when: "food / shop with a list of products", text: "Menu board: the offer as an elegant two-column list with leader lines (dotted borders) between item and detail, a framed hero photo with a thick var(--color-primary) border, a warm stamp-like badge with the brand name." },
  { id: "split", when: "rational + formal", text: "Split screen: hero split 50/50 into a solid var(--color-surface) text column and a photo column, a sticky slim header, a horizontal timeline-like row for the visit details." },
] as const;

function pickConcept(d: Direction): (typeof CONCEPTS)[number] {
  const a = (id: string) => d.axes.find((x) => x.id === id)?.target ?? 50;
  const scores: Record<string, number> = {
    editorial: a("systematic_crafted") + a("dense_airy"),
    poster: a("formal_informal") + (100 - a("enthusiastic_rational")),
    bento: 200 - a("systematic_crafted") - a("dense_airy"),
    fullbleed: a("flat_deep") + a("dense_airy"),
    menuboard: /bäck|bakery|café|cafe|kaffee|coffee|restaurant|bar|pizza|confis|food|metzg|menu|speise/i.test(d.brand.offer + d.brand.name) ? 150 : 60,
    split: a("enthusiastic_rational") + (100 - a("formal_informal")),
  };
  // Brand hash nudges ties so two similar shops still get different concepts.
  let h = 0;
  for (const ch of d.brand.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const ranked = [...CONCEPTS].sort((x, y) => scores[y.id] - scores[x.id]);
  return ranked[h % 2];
}

function axis(d: Direction, id: string) {
  return d.axes.find((a) => a.id === id)!;
}

export function buildPrompt(t: TokensResult, d: Direction, c: Content, siteUrl: string, violations?: string[]): string {
  const dense = axis(d, "dense_airy"), deep = axis(d, "flat_deep"), crafted = axis(d, "systematic_crafted");
  const varNames = t.css.split("\n").map((l) => l.split(":")[0].trim()).join(", ");
  const address = c.contact.address.join(", ");
  const pack = [
    `Brand: ${d.brand.name}. Offer: ${d.brand.offer}. Audience: ${d.brand.audience}. Voice: ${d.brand.voice}.`,
    `Logo URL: ${d.keep.logoUrl ?? "none (use the brand name as a wordmark)"}`,
    `Navigation labels: ${c.nav.slice(0, 5).join(", ") || "none"}`,
    `Images (only these URLs, use their alt text or write a faithful description):\n${c.images
      .filter((i) => i.src !== d.keep.logoUrl)
      .slice(0, 12)
      .map((i) => `- ${i.src}${i.alt ? ` (alt: ${i.alt})` : ""}`)
      .join("\n") || "none"}`,
    `Phones: ${c.contact.phones.join(", ") || "none"}`,
    `Emails: ${c.contact.emails.join(", ") || "none"}`,
    `Address: ${address || "none"}`,
    `Opening hours: ${c.contact.hours.join("; ") || "none"}`,
    `Social: ${c.social.map((s) => `${s.network} ${s.url}`).join(", ") || "none"}`,
    `Original site: ${siteUrl}`,
  ].join("\n");

  return `## Design tokens (already defined on :root; use only these via var())
${varNames}

## Target marks to build from (0 = left, 100 = right)
${d.axes.map((a) => `- ${a.id}: target ${a.target}. ${a.change}`).join("\n")}
- Spacing follows dense_airy ${dense.target}/100: ${dense.target >= 60 ? "generous whitespace, section padding var(--space-section), few items per row" : "compact rhythm, section padding around calc(var(--space-section) * 0.6), more per row"}.
- Elevation follows flat_deep ${deep.target}/100: ${deep.target >= 50 ? "cards lifted with var(--shadow-card) and var(--radius-card)" : "flat surfaces separated by 1px var(--color-border) rules, no shadows"}.
- Detail follows systematic_crafted ${crafted.target}/100: ${crafted.target >= 55 ? "hand-made touches: an expressive display headline, an asymmetric hero, a decorative rule or underline built from tokens" : "strict grid, consistent modules, restrained details"}.

## Copy (use as written)
heroHeadline: ${d.copy.heroHeadline}
heroSub: ${d.copy.heroSub}
cta: ${d.copy.cta} → ${d.copy.ctaHref}

## Content pack (the only facts you may use)
${pack}

## Page text (markdown, truncated)
${c.markdown.slice(0, 8000)}

## Concept
${pickConcept(d).text}
Commit to this concept. Make the hero memorable: the headline can go up to calc(var(--text-3xl) * 2) on desktop with tight line-height, and the best real photo should be large.
Vary section layouts (do not stack identical centred blocks). Use the primary colour with intent (one or two strong moments), the accent sparingly.
Avoid: emoji, icon fonts, stock-looking gradients, fake buttons that go nowhere, lorem ipsum, centred-everything layouts, generic "Welcome to our website" phrasing.

## Build
Sections, each omitted when there is no data for it:
1. header: logo (img) or the name, plus up to 5 nav anchors linking to the sections below.
2. hero: heroHeadline as the only h1, heroSub, the CTA as a link to ${d.copy.ctaHref}. Use the best real photo.
3. offer: the real menu, services or products from the page text.
4. about: the real about text, shortened faithfully.
5. visit: address, hours, phone${address ? `, and a map link to https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : ""}.
6. footer: name, plus a link to the original site ${siteUrl}.
Write all text in the site's language (lang "${c.lang || "unknown"}").
Mobile-first CSS with exactly one breakpoint: @media (min-width: 768px). Text measure at most 70ch.
CSS rules: every colour is var(--color-…) (or transparent/currentColor); every font-family is var(--font-display) or var(--font-body); font sizes use var(--text-…); radii use var(--radius-…). No colour literals anywhere, including inline styles and gradients. Prefer classes over inline styles.
Use semantic HTML and real alt text. Use only the image URLs listed above.${
    violations?.length
      ? `\n\n## Fix these token violations from your previous attempt\n${violations.slice(0, 40).map((v) => `- ${v}`).join("\n")}\nReturn the full corrected output.`
      : ""
  }

Output now: <style>…</style> then <header>…</footer>.`;
}

/* ---------- validation ---------- */

const NAMED = new Set(Object.keys(colorsNamed));
const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/gi;
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

type Violation = { where: "css" | "inline"; prop: string; literal: string };

function scanValue(prop: string, value: string, where: Violation["where"], out: Violation[]) {
  const v = value.replace(/"[^"]*"|'[^']*'/g, "").replace(/url\([^)]*\)/gi, "").replace(/var\([^)]*\)/gi, "");
  for (const m of v.matchAll(HEX)) out.push({ where, prop, literal: m[0] });
  for (const m of v.matchAll(COLOR_FN)) out.push({ where, prop, literal: m[0] });
  for (const w of v.match(/\b[a-z]+\b/gi) ?? []) {
    const lw = w.toLowerCase();
    if (NAMED.has(lw) && !/^(transparent|currentcolor|inherit)$/.test(lw)) out.push({ where, prop, literal: w });
  }
  if (prop === "font-family" && !/^\s*var\(--font-(display|body)\)\s*(!important)?\s*$/i.test(value)) out.push({ where, prop, literal: value.trim() });
  if (prop === "font" && !/var\(--font-(display|body)\)/i.test(value)) out.push({ where, prop, literal: value.trim() });
}

function decls(css: string): { prop: string; value: string }[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: { prop: string; value: string }[] = [];
  for (const m of clean.matchAll(/(?:^|[;{])\s*(--[\w-]+|[a-zA-Z-]+)\s*:\s*([^;{}]+)/g)) {
    // Skip selectors with pseudo-classes picked up as "prop: value" (e.g. a:hover {)
    out.push({ prop: m[1].toLowerCase(), value: m[2] });
  }
  return out;
}

export function findViolations(css: string, body: string): Violation[] {
  const out: Violation[] = [];
  for (const d of decls(css)) if (!d.prop.startsWith("--")) scanValue(d.prop, d.value, "css", out);
  const $ = cheerio.load(body, null, false);
  $("[style]").each((_, el) => {
    for (const d of decls($(el).attr("style") ?? "")) scanValue(d.prop, d.value, "inline", out);
  });
  $("style").each((_, el) => {
    for (const d of decls($(el).html() ?? "")) scanValue(d.prop, d.value, "css", out);
  });
  // Custom properties defined by the LLM must not smuggle literals either.
  for (const d of decls(css)) if (d.prop.startsWith("--")) scanValue("custom-property", d.value, "css", out);
  return out;
}

export function describe(v: Violation[]): string[] {
  return [...new Set(v.map((x) => `${x.where === "inline" ? "inline style" : "CSS"} ${x.prop}: ${x.literal}`))];
}

/** Last resort: map each remaining literal to the nearest token (ΔE2000). */
function autofix(css: string, body: string, t: TokensResult): { css: string; body: string; fixed: string[] } {
  const fixed: string[] = [];
  const fixValue = (prop: string, value: string): string => {
    if (prop === "font-family") {
      fixed.push(`font-family ${value.trim()} → var(--font-body)`);
      return " var(--font-body)";
    }
    if (prop === "font" && !/var\(--font-/.test(value)) {
      fixed.push(`font ${value.trim()} → font-family var(--font-body)`);
      return value.replace(/,?\s*("[^"]*"|'[^']*'|[a-zA-Z -]+)(\s*,\s*("[^"]*"|'[^']*'|[a-zA-Z -]+))*\s*$/, " var(--font-body)");
    }
    const swap = (lit: string) => {
      const n = nearestToken(lit, t.tokens);
      if (!n) return lit;
      fixed.push(`${lit} → var(${n.token}) (ΔE ${n.deltaE})`);
      return `var(${n.token})`;
    };
    let out = value.replace(COLOR_FN, (m) => (/var\(/.test(m) ? m : swap(m))).replace(HEX, swap);
    out = out.replace(/\b[a-z]+\b/gi, (w) => (NAMED.has(w.toLowerCase()) && !/^(transparent|currentcolor|inherit)$/i.test(w) ? swap(w) : w));
    return out;
  };
  const fixCss = (s: string) =>
    s.replace(/((?:^|[;{])\s*)(--[\w-]+|[a-zA-Z-]+)(\s*:\s*)([^;{}]+)/g, (_m, pre, prop, sep, val) => `${pre}${prop}${sep}${fixValue(prop.toLowerCase(), val)}`);
  const $ = cheerio.load(body, null, false);
  $("[style]").each((_, el) => {
    $(el).attr("style", fixCss($(el).attr("style") ?? ""));
  });
  $("style").each((_, el) => {
    $(el).text(fixCss($(el).html() ?? ""));
  });
  return { css: fixCss(css), body: $.html(), fixed };
}

/** Removes anything unsafe or off-limits: scripts, handlers, foreign images, embeds. */
export function sanitizeBody(body: string, allowedImages: Set<string>): { body: string; removed: string[] } {
  const removed: string[] = [];
  const $ = cheerio.load(body, null, false);
  $("script, iframe, object, embed, link, meta, base, form, html, head").each((_, el) => {
    removed.push(`<${(el as { tagName?: string }).tagName}>`);
    $(el).remove();
  });
  $("*").each((_, el) => {
    for (const name of Object.keys((el as { attribs?: Record<string, string> }).attribs ?? {})) {
      if (/^on/i.test(name)) $(el).removeAttr(name);
    }
    const href = $(el).attr("href");
    if (href && /^\s*javascript:/i.test(href)) $(el).attr("href", "#");
  });
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (!allowedImages.has(src)) {
      removed.push(`image ${src.slice(0, 80)}`);
      $(el).remove();
    }
    $(el).removeAttr("srcset");
  });
  return { body: $.html(), removed };
}

export type PageEvent =
  | { type: "delta"; text: string }
  | { type: "status"; message: string }
  | { type: "final"; css: string; body: string; report: PageReport }
  | { type: "error"; code: string; message: string };

export type PageReport = { firstPass: string[]; afterRetry: string[]; autoFixed: string[]; removed: string[]; retried: boolean };

export async function* page(t: TokensResult, d: Direction, c: Content, siteUrl: string): AsyncIterable<PageEvent> {
  let raw = "";
  for await (const chunk of completeStream({ system: SYSTEM, prompt: buildPrompt(t, d, c, siteUrl), tier: "smart", maxTokens: 16000 })) {
    raw += chunk;
    yield { type: "delta", text: chunk };
  }
  let { css, body } = splitParts(raw);
  if (!css && !body) throw new Error("The design model returned no page");
  const allowed = new Set([...c.images.map((i) => i.src), ...(d.keep.logoUrl ? [d.keep.logoUrl] : [])]);

  const first = describe(findViolations(css, body));
  let after = first;
  let retried = false;
  if (first.length) {
    retried = true;
    yield { type: "status", message: `Found ${first.length} token violations. Asking for one corrected version.` };
    const again = await complete({ system: SYSTEM, prompt: buildPrompt(t, d, c, siteUrl, first), tier: "smart", maxTokens: 16000 });
    const parts = splitParts(again);
    if (parts.css && parts.body) {
      css = parts.css;
      body = parts.body;
    }
    after = describe(findViolations(css, body));
  }
  let autoFixed: string[] = [];
  if (after.length) {
    const f = autofix(css, body, t);
    css = f.css;
    body = f.body;
    autoFixed = f.fixed;
  }
  const s = sanitizeBody(body, allowed);
  yield { type: "final", css, body: s.body, report: { firstPass: first, afterRetry: retried ? after : [], autoFixed, removed: s.removed, retried } };
}
