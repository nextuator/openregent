import * as cheerio from "cheerio";
import { colorsNamed, wcagContrast } from "culori";
import { splitParts } from "./assemble";
import { pickConcept, statsSummary, type ConceptStats } from "./concept";
import { DESIGN_GUIDE } from "./design-guide";
import { complete, completeStream } from "./llm";
import { nearestToken } from "./tokens";
import type { Content, Direction, TokensResult } from "./types";

/* Homepage generation (LLM tier "smart"), then token enforcement in code. */

const SYSTEM = `You are an award-winning art director and front-end designer building a concept redesign of a small local business homepage.
Your redesign must look clearly better than the original and unlike a generic template: a confident concept, strong typographic hierarchy, a real photo used boldly, deliberate rhythm and whitespace.
You use only the design tokens you are given, as CSS custom properties. You never write colour literals or font names.
You use only the business's own text, images and facts. You never invent prices, reviews, testimonials, ratings, awards, founding years, staff names or numbers. If information is missing, you leave the section out.
You output exactly two parts and nothing else: one <style>…</style> block, then the body markup from <header> to </footer>. No <html>, <head>, <script>, no markdown fences, no commentary.`;

function axis(d: Direction, id: string) {
  return d.axes.find((a) => a.id === id)!;
}

export function buildPrompt(t: TokensResult, d: Direction, c: Content, siteUrl: string, violations?: string[], brief?: string): string {
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
${brief ? `\n## Art-direction brief (follow it closely)\n${brief}\n` : ""}
${DESIGN_GUIDE}
Commit to this concept. One tasteful CSS-only entrance animation for the hero is welcome (keyframes, under 900 ms, wrapped in @media (prefers-reduced-motion: no-preference)). Make the hero memorable: the headline can go up to calc(var(--text-3xl) * 2) on desktop with tight line-height, and the best real photo should be large.
Vary section layouts (do not stack identical centred blocks). Use the primary colour with intent (one or two strong moments), the accent sparingly.
Avoid: emoji, icon fonts, stock-looking gradients, fake buttons that go nowhere, lorem ipsum, centred-everything layouts, generic "Welcome to our website" phrasing.

## Layout safety (hard rules)
- Nothing may overflow horizontally at 390 px or 1280 px. Grids use minmax(0, 1fr) columns; flex children that hold text get min-width: 0; never use fixed widths in px wider than 100%; no negative margins that push content off-screen; no width: 100vw.
- Big headlines use clamp(), e.g. font-size: clamp(var(--text-2xl), 8vw, calc(var(--text-3xl) * 2)), so they fit on a 390 px screen. Long words must wrap.
- Images: width: 100%; height: auto or a fixed aspect-ratio with object-fit: cover.
- Display headings: line-height at least 0.9 and never inside overflow: hidden, so accents and umlauts are not clipped.

## Contrast (hard rules)
- Every text colour must match its own background. Allowed pairs only:
  text or text-muted on bg or surface; on-primary on primary; on-accent on accent.
- Whenever you set a background on an element that contains text, set the matching color on the same rule.
- Never put text directly on a photo. Put it on a solid panel (bg, surface or primary) with the matching text colour.
- Use primary and accent as text colour only for large headings or underlines on bg, never for body text.

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
  if (prop === "font-family" && !/^\s*(var\(--font-(display|body)\)|inherit|initial|unset)\s*(!important)?\s*$/i.test(value)) out.push({ where, prop, literal: value.trim() });
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

/* Same-rule contrast check: a rule that sets both a background token and a text colour token must be a readable pair. */
const VAR_HEX = (t: TokensResult, name: string): string | undefined => {
  const m = t.css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  return m?.[1];
};

const CONTAINER_TEXT = new Set(["color-on-primary", "color-on-accent", "color-bg", "color-surface"]);
/** WCAG AA: 3:1 for large headings, 4.5:1 for everything else. */
const minRatio = (selector: string) => (/(^|[\s,>.#-])(h1|h2|display|headline|hero-title|title)\b/i.test(selector) ? 3 : 4.5);

export function contrastViolations(css: string, t: TokensResult): Violation[] {
  const out: Violation[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const body = m[2];
    const bg = body.match(/background(?:-color)?\s*:[^;]*var\(--(color-[\w-]+)\)/i)?.[1];
    const fg = body.match(/(?:^|;|\s)color\s*:\s*var\(--(color-[\w-]+)\)/i)?.[1];
    if (!fg) continue;
    // Container colours (on-primary, on-accent, bg, surface as text) get their background from a parent: only check same-rule pairs.
    if (!bg && CONTAINER_TEXT.has(fg)) continue;
    const min = minRatio(m[1]);
    // Without its own background, text sits on the page: check it against bg and surface.
    const grounds = bg ? [bg] : ["color-bg", "color-surface"];
    for (const g of grounds) {
      const b = VAR_HEX(t, g), f = VAR_HEX(t, fg);
      if (!b || !f) continue;
      const ratio = wcagContrast(f, b);
      if (ratio < min) {
        out.push({ where: "css", prop: "contrast", literal: `${m[1].trim()}: var(--${fg}) on var(--${g}) is ${ratio.toFixed(2)}:1, needs ${min}:1` });
        break;
      }
    }
  }
  return out;
}

/** Swaps the text colour in low-contrast rules for the token with the best contrast on that background. */
function fixContrastRules(css: string, t: TokensResult, fixed: string[]): string {
  const candidates = ["color-text", "color-text-muted", "color-on-primary", "color-on-accent", "color-bg"];
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (whole, sel: string, body: string) => {
    const bgTok = body.match(/background(?:-color)?\s*:[^;]*var\(--(color-[\w-]+)\)/i)?.[1];
    const fg = body.match(/(?:^|;|\s)color\s*:\s*var\(--(color-[\w-]+)\)/i)?.[1];
    if (!fg || (!bgTok && CONTAINER_TEXT.has(fg))) return whole;
    const min = minRatio(sel);
    const bg = bgTok ?? "color-bg";
    const b = VAR_HEX(t, bg), f = VAR_HEX(t, fg);
    const s = VAR_HEX(t, "color-surface");
    const ok = (hex: string) => wcagContrast(hex, b!) >= min && (bgTok || !s || wcagContrast(hex, s) >= min);
    if (!b || !f || ok(f)) return whole;
    const best = candidates.map((c) => ({ c, r: VAR_HEX(t, c) ? wcagContrast(VAR_HEX(t, c)!, b) : 0 })).sort((x, y) => y.r - x.r)[0];
    fixed.push(`${sel.trim()}: var(--${fg}) → var(--${best.c}) on var(--${bg}) (${best.r.toFixed(1)}:1)`);
    return `${sel}{${body.replace(/((?:^|;|\s)color\s*:\s*)var\(--color-[\w-]+\)/i, `$1var(--${best.c})`)}}`;
  });
}

export function findViolations(css: string, body: string, t?: TokensResult): Violation[] {
  const out: Violation[] = t ? contrastViolations(css, t) : [];
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
  return { css: fixContrastRules(fixCss(css), t, fixed), body: $.html(), fixed };
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
    // Only web, phone and mail links; never javascript:, file: or data: (browsers block or warn).
    const href = $(el).attr("href");
    if (href && !/^\s*(https?:|tel:|mailto:|#)/i.test(href)) $(el).attr("href", "#");
  });
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (!allowedImages.has(src) || !/^https?:/i.test(src)) {
      removed.push(`image ${src.slice(0, 80)}`);
      $(el).remove();
    }
    $(el).removeAttr("srcset");
  });
  return { body: $.html(), removed };
}

export type PageEvent =
  | { type: "delta"; text: string }
  | { type: "restart" }
  | { type: "status"; message: string }
  | { type: "final"; css: string; body: string; report: PageReport }
  | { type: "error"; code: string; message: string };

export type PageReport = {
  firstPass: string[];
  afterRetry: string[];
  autoFixed: string[];
  removed: string[];
  retried: boolean;
  brief?: string;
  slop?: string[];
  critique?: string;
};

/* ---------- AI-look lint (deterministic) ---------- */

const GENERIC_COPY = /\b(welcome to|willkommen auf unserer|discover|experience the|elevate|unleash|crafted with love|look no further|entdecken sie|erleben sie|tauchen sie ein|bienvenue sur)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export function slopLint(css: string, body: string): string[] {
  const out: string[] = [];
  const count = (re: RegExp, s: string) => (s.match(re) ?? []).length;
  const eyebrows = count(/text-transform\s*:\s*uppercase[^}]*letter-spacing|letter-spacing[^}]*text-transform\s*:\s*uppercase/gi, css);
  if (eyebrows > 3) out.push(`${eyebrows} uppercase letter-spaced label styles: the classic template eyebrow. Use at most one.`);
  const centred = count(/text-align\s*:\s*center/gi, css);
  if (centred > 4) out.push(`text-align: center used ${centred} times: centred-everything reads as a template. Align most text left.`);
  if (/repeat\(\s*3\s*,\s*(minmax\(0,\s*)?1fr\)?\s*\)/i.test(css) && count(/box-shadow/gi, css) >= 1) out.push("Three equal columns of shadowed cards: the most common AI layout. Use an asymmetric or list-based layout instead.");
  const grads = count(/(linear|radial|conic)-gradient\(/gi, css);
  if (grads > 1) out.push(`${grads} gradients: decorative gradients read as AI. Use solid colour blocks.`);
  const text = cheerio.load(body, null, false).text();
  if (GENERIC_COPY.test(text)) out.push(`Generic marketing phrase in the copy ("${text.match(GENERIC_COPY)![0]}"). Use the business's own words.`);
  if (EMOJI.test(text)) out.push("Emoji in the page. Remove them.");
  if (count(/border-radius\s*:\s*(999|9999|50)/gi, css) > 4) out.push("Many pill shapes: pill buttons and badges everywhere look templated. Keep one pill style at most.");
  if (!/clamp\(/.test(css)) out.push("No clamp() on the headline: the hero type is probably timid or overflows on mobile. Make the headline big and fluid.");
  if (!/<img/i.test(body)) out.push("No photo used. Use the business's best real photo prominently.");
  const sections = count(/<section/gi, body);
  if (sections >= 4 && count(/grid-template-columns/gi, css) <= 1) out.push("Every section seems to share one layout. Give each section its own composition.");
  return out;
}

/* ---------- art direction + critic ---------- */

const BRIEF_SYSTEM = `You are a creative director known for bold, award-winning small-business websites. You write short, specific art-direction briefs that a designer can execute in HTML and CSS. You never suggest invented facts.`;

function briefPrompt(t: TokensResult, d: Direction, c: Content, learned = ""): string {
  const concept = pickConcept(d);
  const headings = c.markdown.split("\n").filter((l) => /^#{1,3}\s/.test(l)).slice(0, 12).join("\n");
  return `Business: ${d.brand.name}. ${d.brand.offer}. Audience: ${d.brand.audience}. Voice: ${d.brand.voice}.
Concept to build on: ${concept.text}
Palette mode: ${concept.mode}. Fonts: ${t.tokens.font.display} (display) and ${t.tokens.font.body} (body).
Target marks: ${d.axes.map((a) => `${a.id} → ${a.target}`).join(", ")}.
Real images (alt text): ${c.images.slice(0, 8).map((i, n) => `#${n + 1} ${i.alt || "no alt"}`).join("; ") || "none"}.
Page headings on the current site:
${headings || "(none)"}
${learned ? `\nWhat blind voters preferred so far (learn from it): ${learned}\n` : ""}

${DESIGN_GUIDE}

Write the brief in at most 200 words, as these labelled lines:
Signature idea: the one memorable move that makes a jury say "wow" (specific to this business, buildable in CSS, no scripts).
Hero: exact composition (what is huge, where the photo goes, what overlaps what).
Sections: the order, each with its own distinct layout.
Type: sizes, weights, case and one expressive detail.
Images: crops, frames, treatments (CSS filters, masks, rotations), which image goes where.
Detail: one unexpected, tasteful detail.
Avoid: three things this page must not do.

Copy rule: do not write any new sentences, slogans or greetings. The only new text allowed is the given heroHeadline, heroSub and cta; everything else is quoted or shortened from the page text.`;
}

const CRITIC_SYSTEM = `You are a demanding design critic on an awards jury. You judge homepage code (HTML and CSS) for visual impact, originality and craft, and you spot anything that looks AI-generated or templated. You are concrete and brief.`;

function criticPrompt(brief: string, css: string, body: string, slop: string[], violations: string[]): string {
  return `The art-direction brief:
${brief}

Automatic findings (must all be fixed):
${[...slop, ...violations].map((s) => `- ${s}`).join("\n") || "- none"}

${DESIGN_GUIDE}

The page (CSS then HTML, may be truncated):
<style>${css.slice(0, 14000)}</style>
${body.slice(0, 14000)}

Give at most 8 numbered, concrete fixes that would most raise the wow factor and remove any AI or template look while keeping the brief.
Name selectors and values. Also flag any text-on-background with weak contrast, anything that could overflow on a 390 px screen, and any sentence that is not in the page text or the given copy (invented copy must be removed). Never propose new copy. No praise, no preamble.`;
}

export async function* page(t: TokensResult, d: Direction, c: Content, siteUrl: string, stats?: ConceptStats): AsyncIterable<PageEvent> {
  const allowed = new Set([...c.images.map((i) => i.src), ...(d.keep.logoUrl ? [d.keep.logoUrl] : [])]);

  // 1. Art direction
  yield { type: "status", message: "Writing the art-direction brief." };
  const brief = (await complete({ system: BRIEF_SYSTEM, prompt: briefPrompt(t, d, c, stats ? statsSummary(stats) : ""), tier: "smart", maxTokens: 2500, effort: "low" })).trim();

  // 2. First design, streamed
  yield { type: "status", message: "Designing the first version." };
  let raw = "";
  for await (const chunk of completeStream({ system: SYSTEM, prompt: buildPrompt(t, d, c, siteUrl, undefined, brief), tier: "smart", maxTokens: 16000 })) {
    raw += chunk;
    yield { type: "delta", text: chunk };
  }
  let { css, body } = splitParts(raw);
  if (!css && !body) throw new Error("The design model returned no page");

  // 3. Critic: deterministic lint + token rules + a critic model
  const first = describe(findViolations(css, body, t));
  const slop = slopLint(css, body);
  yield { type: "status", message: `Critic review (${first.length} token issues, ${slop.length} template tells found by code).` };
  const critique = (await complete({ system: CRITIC_SYSTEM, prompt: criticPrompt(brief, css, body, slop, first), tier: "smart", maxTokens: 2500, effort: "low" })).trim();

  // 4. Revision, streamed
  yield { type: "status", message: "Revising with the critic's notes." };
  yield { type: "restart" };
  let raw2 = "";
  const revisePrompt = `${buildPrompt(t, d, c, siteUrl, first, brief)}

## Your previous version
<style>${css}</style>
${body}

## Critic notes (apply all of them)
${critique}
${slop.map((s) => `- ${s}`).join("\n")}

Return the complete improved page: <style>…</style> then <header>…</footer>.`;
  // Low effort: the thinking happened in the brief, the first version and the critique. Keeps the route under 300 s.
  for await (const chunk of completeStream({ system: SYSTEM, prompt: revisePrompt, tier: "smart", maxTokens: 16000, effort: "low" })) {
    raw2 += chunk;
    yield { type: "delta", text: chunk };
  }
  const parts = splitParts(raw2);
  if (parts.css && parts.body) {
    css = parts.css;
    body = parts.body;
  }

  // 5. Enforce tokens in code
  const after = describe(findViolations(css, body, t));
  let autoFixed: string[] = [];
  if (after.length) {
    const f = autofix(css, body, t);
    css = f.css;
    body = f.body;
    autoFixed = f.fixed;
  }
  const s = sanitizeBody(body, allowed);
  yield {
    type: "final",
    css,
    body: s.body,
    report: { firstPass: first, afterRetry: after, autoFixed, removed: s.removed, retried: true, brief, slop, critique },
  };
}
