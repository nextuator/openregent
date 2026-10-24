import { parseStats, pickConcept, pickConceptLearned } from "./concept";
import { completeJson } from "./llm";
import { hgetallToObject, redis } from "./store";
import { AXES, DirectionSchema, type Audit, type Content, type Direction } from "./types";

const SYSTEM = `You are the design director in a website audit. You follow one method: Audit, then target marks, then design tokens, then one source of design.
You never invent facts. Every brand fact and every word of copy must come from the scraped content you are given.
You answer with one JSON object and nothing else.`;

export function auditSummary(a: Audit): string {
  return [
    `Colour literals: ${a.colors.literals}, distinct: ${a.colors.distinct}`,
    `Top colour clusters: ${a.colors.clusters.map((c) => `${c.hex} ×${c.count}`).join(", ")}`,
    `Font families: ${a.fonts.families.map((f) => `${f.name} ×${f.count}${f.system ? " (system)" : ""}`).join(", ") || "none declared"}`,
    `Google Fonts linked: ${a.fonts.googleFonts.join(", ") || "none"}`,
    `Font sizes (px): ${a.type.sizes.slice(0, 10).map((s) => `${s.value}×${s.count}`).join(", ")}`,
    `Distinct radii: ${a.radii.length}; shadow levels: ${a.shadows.length}; gradients: ${a.gradients}`,
    `Density: ${a.density.charsPer1000px} chars per 1000 px, body ${a.density.bodyFontPx ?? "?"} px`,
    `Failed health checks: ${a.health.filter((h) => !h.pass).map((h) => `${h.label} (${h.detail})`).join("; ") || "none"}`,
    "",
    "Measured hints (cite these numbers in the basis of the matching axis):",
    ...Object.entries(a.hints).map(([k, v]) => `- ${k}: ${v}`),
  ].join("\n");
}

export function brandFacts(c: Content): string {
  return [
    `Title: ${c.title || "none"}`,
    `Meta description: ${c.description || "none"}`,
    `h1: ${c.h1s.join(" | ") || "none"}`,
    `Navigation: ${c.nav.join(", ") || "none"}`,
    `Logo URL: ${c.logoUrl ?? "none"}`,
    `Phones: ${c.contact.phones.join(", ") || "none"}`,
    `Emails: ${c.contact.emails.join(", ") || "none"}`,
    `Address: ${c.contact.address.join(", ") || "none"}`,
    `Opening hours: ${c.contact.hours.join("; ") || "none"}`,
    `Social: ${c.social.map((s) => `${s.network} ${s.url}`).join(", ") || "none"}`,
  ].join("\n");
}

/** The CTA must point at something the site really has. Fall back to the site itself. */
function groundCta(d: Direction, c: Content, siteUrl: string): Direction {
  const href = d.copy.ctaHref;
  const digits = (s: string) => s.replace(/\D/g, "").replace(/^(41|0041)/, "0");
  let ok = false;
  if (href.startsWith("tel:")) ok = c.contact.phones.some((p) => digits(p).endsWith(digits(href).slice(-9)));
  else if (href.startsWith("mailto:")) ok = c.contact.emails.includes(href.slice(7));
  else {
    try {
      const h = new URL(href).hostname.replace(/^www\./, "");
      const site = new URL(siteUrl).hostname.replace(/^www\./, "");
      ok = h === site || h.endsWith("." + site) || c.social.some((s) => s.url === href) || c.markdown.includes(href);
    } catch {
      ok = false;
    }
  }
  if (ok) return d;
  const phone = c.contact.phones[0];
  const fallback = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : siteUrl;
  return { ...d, copy: { ...d.copy, ctaHref: fallback, cta: phone ? "Call us" : d.copy.cta } };
}

export async function direction(audit: Audit, content: Content, viewportJpegBase64: string, avoid?: string[]): Promise<Direction> {
  const axesSpec = AXES.map(
    (a) => `- ${a.id}: 0 = ${a.left}, 100 = ${a.right}${a.measured ? " (measured axis: basis starts with \"measured:\" and cites the measured hint numbers)" : " (basis starts with \"reading of copy:\" or \"screenshot:\")"}`,
  ).join("\n");

  const prompt = `Site: ${audit.finalUrl}

## Audit (measured in code)
${auditSummary(audit)}

## Brand facts (scraped)
${brandFacts(content)}

## Page text (markdown, truncated)
${content.markdown.slice(0, 6000)}

## The screenshot
The attached image is the first viewport of the current homepage.

## Task
Set target marks on 7 axes for a glow-up of this homepage. "now" is where the current site sits, "target" is where the redesign should sit.
Axes:
${axesSpec}

Rules:
- Glow-up, not rebrand: keep the primary hue and the logo. keep.primaryHex is the brand colour, taken from the audit clusters or the logo.
- For each axis, "change" is one concrete sentence in this style: "Swap the cool slate greys for warm neutrals and one warm accent."
- Copy must be grounded in the page text. Never invent prices, reviews, ratings, awards, founding years, staff names or numbers.
- Write the copy in the site's own language (html lang "${content.lang || "unknown"}").
- cta is a real action the site supports (call, email, order, book, visit). ctaHref is a tel:, mailto: or a real URL that appears in the content above.

Return exactly this JSON shape:
{
  "brand": { "name": "", "offer": "≤12 words", "audience": "≤10 words", "voice": "≤10 words" },
  "keep": { "primaryHex": "#rrggbb", "logoUrl": "url or null", "why": "≤15 words" },
  "axes": [ { "id": "warm_cool", "now": 0, "target": 0, "basis": "", "change": "" } ],
  "copy": { "heroHeadline": "≤8 words", "heroSub": "≤22 words", "cta": "2-3 words", "ctaHref": "",
            "postHeadline": "≤7 words", "postLine": "≤14 words", "slideTitle": "≤6 words", "slideSubtitle": "≤14 words" }
}
The axes array has all 7 axes in the order listed above.`;

  const d = await completeJson(DirectionSchema, {
    system: SYSTEM,
    prompt,
    image: { base64: viewportJpegBase64, mediaType: "image/jpeg" },
    tier: "fast",
    maxTokens: 4000,
  });

  const order = AXES.map((a) => a.id);
  d.axes.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  if (d.keep.logoUrl && d.keep.logoUrl !== content.logoUrl && !content.images.some((i) => i.src === d.keep.logoUrl)) {
    d.keep.logoUrl = content.logoUrl;
  }
  // Rotate layout concepts across recent glow-ups so they look different from each other.
  const recent = avoid ?? (await redis<string[]>(["LRANGE", "concepts", 0, 2]).catch(() => [] as string[]));
  // Learn from the blind vote: concepts that win more get picked more (Thompson sampling).
  const stats = parseStats(hgetallToObject(await redis<string[]>(["HGETALL", "bandit"]).catch(() => [] as string[])));
  d.concept = (avoid ? pickConcept(d, recent) : pickConceptLearned(d, recent, stats)).id;
  if (!avoid) await redis(["LPUSH", "concepts", d.concept]).catch(() => 0);
  return groundCta(d, content, audit.finalUrl);
}
