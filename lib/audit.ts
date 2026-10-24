import * as cheerio from "cheerio";
import { converter, differenceCiede2000, formatHex, parse } from "culori";
import { measureImages } from "./images";
import { safeFetch } from "./net";
import type { Audit, ColorCluster, Content, Counted, HealthCheck } from "./types";

/* Deterministic audit. Every number here is measured from real CSS and DOM. No LLM. */

const CSS_FILE_LIMIT = 12;
const CSS_BYTE_LIMIT = 2 * 1024 * 1024;
const TIMEOUT = 5_000;

export type AuditInput = { html: string; finalUrl: string; markdown: string; pageHeight: number };

type Decl = { selector: string; prop: string; value: string };

/* ---------- helpers ---------- */

function abs(href: string | undefined, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href.trim(), base).toString();
  } catch {
    return null;
  }
}

async function fetchText(url: string, maxBytes = CSS_BYTE_LIMIT): Promise<{ ok: boolean; text: string; status: number }> {
  try {
    const r = await safeFetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "user-agent": "Mozilla/5.0 (compatible; GlowupAudit/1.0)" },
    });
    if (!r.ok) return { ok: false, text: "", status: r.status };
    const text = (await r.text()).slice(0, maxBytes);
    return { ok: true, text, status: r.status };
  } catch {
    return { ok: false, text: "", status: 0 };
  }
}

function tally<T>(items: T[]): Counted<T>[] {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}

function parseDecls(css: string, fallbackSelector = ""): Decl[] {
  const out: Decl[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const pushBlock = (selector: string, body: string) => {
    for (const m of body.matchAll(/([-a-zA-Z]+)\s*:\s*([^;]+)/g)) {
      out.push({ selector: selector.trim(), prop: m[1].toLowerCase(), value: m[2].trim() });
    }
  };
  if (!clean.includes("{")) {
    pushBlock(fallbackSelector, clean);
    return out;
  }
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) pushBlock(m[1], m[2]);
  return out;
}

const COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?)\([^)]*\)/g;

function toPx(raw: string): number | null {
  const m = raw.trim().match(/^(-?\d*\.?\d+)(px|rem|em|pt)$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  const px = unit === "px" ? n : unit === "pt" ? (n * 4) / 3 : n * 16;
  return Math.round(px * 2) / 2;
}

const SYSTEM_FONTS = new Set([
  "arial", "helvetica", "helvetica neue", "times", "times new roman", "sans-serif", "serif",
  "system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui", "ui-sans-serif", "ui-serif",
  "verdana", "georgia", "tahoma", "monospace", "courier new", "courier",
]);

function firstFamily(value: string): string | null {
  const v = value.replace(/!important/i, "").trim();
  if (/^(var\(|inherit|initial|unset|revert)/i.test(v)) return null;
  const first = v.split(",")[0].trim().replace(/^['"]|['"]$/g, "").trim();
  return first || null;
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/* ---------- colours ---------- */

function clusterColors(raws: string[]): { literals: number; distinct: number; clusters: ColorCluster[] } {
  const byHex = new Map<string, { count: number; samples: Set<string> }>();
  let literals = 0;
  for (const raw of raws) {
    const c = parse(raw);
    if (!c) continue;
    const hex = formatHex(c);
    if (!hex) continue;
    literals++;
    const e = byHex.get(hex) ?? { count: 0, samples: new Set<string>() };
    e.count++;
    if (e.samples.size < 3) e.samples.add(raw);
    byHex.set(hex, e);
  }
  const de = differenceCiede2000();
  const sorted = [...byHex.entries()].sort((a, b) => b[1].count - a[1].count);
  const clusters: ColorCluster[] = [];
  for (const [hex, e] of sorted) {
    const hit = clusters.find((c) => de(c.hex, hex) < 4);
    if (hit) {
      hit.count += e.count;
      for (const s of e.samples) if (hit.samples.length < 3 && !hit.samples.includes(s)) hit.samples.push(s);
    } else {
      clusters.push({ hex, count: e.count, samples: [...e.samples] });
    }
  }
  clusters.sort((a, b) => b.count - a.count);
  return { literals, distinct: byHex.size, clusters: clusters.slice(0, 12) };
}

function warmCoolHint(clusters: ColorCluster[]): string {
  const toHsl = converter("hsl");
  let x = 0, y = 0, w = 0, satSum = 0, chromatic = 0, neutral = 0;
  for (const c of clusters) {
    const hsl = toHsl(c.hex);
    if (!hsl) continue;
    const s = hsl.s ?? 0;
    if (s < 0.12 || hsl.h === undefined) {
      neutral++;
      continue;
    }
    chromatic++;
    const weight = c.count * s;
    const rad = ((hsl.h ?? 0) * Math.PI) / 180;
    x += Math.cos(rad) * weight;
    y += Math.sin(rad) * weight;
    w += weight;
    satSum += s * c.count;
  }
  if (!w) return `measured: no chromatic colours in the top ${clusters.length} clusters (${neutral} neutral), so the palette reads as neutral grey`;
  const hue = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
  const totalCount = clusters.reduce((a, c) => a + (((toHsl(c.hex)?.s ?? 0) >= 0.12) ? c.count : 0), 0);
  const sat = Math.round((satSum / Math.max(1, totalCount)) * 100);
  const band = hue <= 70 || hue >= 300 ? "warm" : hue >= 170 && hue <= 280 ? "cool" : "between warm and cool";
  return `measured: weighted mean hue ${hue}° (${band}), mean saturation ${sat}% across ${chromatic} chromatic clusters; ${neutral} neutral clusters`;
}

/* ---------- content ---------- */

const DAY_RE =
  /\b(mo|di|mi|do|fr|sa|so|mon|tue|wed|thu|fri|sat|sun|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lu|ma|me|je|ve|di)\b\.?/i;
const TIME_RE = /\d{1,2}[:.h]\d{2}|\b(geschlossen|closed|fermé|ruhetag)\b/i;
const PHONE_RE = /(?:\+41|0041|\b0)\s?\(?\d{2}\)?[\s./-]?\d{3}[\s./-]?\d{2}[\s./-]?\d{2}\b/g;
const POSTCODE_RE = /\b(?:CH-)?[1-9]\d{3}\s+[A-ZÄÖÜ][\p{L}.-]+/u;
const STREET_RE = /(strasse|straße|gasse|weg|platz|graben|allee|rain|ring|str\.|street|road|rue|avenue)\s*\d+/i;

const SOCIAL: [string, RegExp][] = [
  ["Instagram", /instagram\.com/i],
  ["Facebook", /facebook\.com/i],
  ["TikTok", /tiktok\.com/i],
  ["LinkedIn", /linkedin\.com/i],
  ["YouTube", /youtube\.com|youtu\.be/i],
  ["X", /(^|\.)x\.com|twitter\.com/i],
  ["Pinterest", /pinterest\./i],
  ["Tripadvisor", /tripadvisor\./i],
];

function markdownLines(md: string): string[] {
  return md
    .split("\n")
    .map((l) =>
      cleanText(
        l
          .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
          .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
          .replace(/[*_#>|`]/g, " "),
      ),
    )
    .filter(Boolean);
}

export function visibleChars(md: string): number {
  return markdownLines(md).join(" ").length;
}

function extractContent($: cheerio.CheerioAPI, base: string, markdown: string): Content {
  const nav = [
    ...new Set(
      $("header a, nav a")
        .map((_, a) => cleanText($(a).text()))
        .get()
        .filter((t) => t.length > 1 && t.length < 40),
    ),
  ].slice(0, 12);

  const images: Content["images"] = [];
  const seen = new Set<string>();
  $("img").each((_, el) => {
    const $el = $(el);
    const srcset = $el.attr("srcset") || $el.attr("data-srcset");
    const fromSet = srcset?.split(",").map((s) => s.trim().split(/\s+/)[0]).pop();
    const src = abs($el.attr("data-src") || $el.attr("src") || fromSet, base);
    if (!src || !/^https?:/i.test(src) || seen.has(src)) return;
    const w = parseInt($el.attr("width") ?? "", 10);
    const h = parseInt($el.attr("height") ?? "", 10);
    if ((w && w < 40) || (h && h < 40)) return;
    if (/icon|pixel|tracking|spacer|blank\.gif|facebook\.com\/tr|\.svg(\?|$)|emoji/i.test(src)) return;
    seen.add(src);
    images.push({ src, alt: cleanText($el.attr("alt") ?? "") });
  });

  let logoUrl: string | null = null;
  $("img").each((_, el) => {
    if (logoUrl) return;
    const $el = $(el);
    const hay = [$el.attr("src"), $el.attr("alt"), $el.attr("class"), $el.attr("id"), $el.parent().attr("class")]
      .join(" ")
      .toLowerCase();
    if (hay.includes("logo")) logoUrl = abs($el.attr("src") || $el.attr("data-src"), base);
  });
  if (!logoUrl) logoUrl = abs($("header img").first().attr("src"), base);

  const phones = new Set<string>();
  const emails = new Set<string>();
  $("a[href^='tel:']").each((_, a) => {
    phones.add(cleanText($(a).text()) || decodeURIComponent($(a).attr("href")!.slice(4)));
  });
  $("a[href^='mailto:']").each((_, a) => {
    emails.add(decodeURIComponent($(a).attr("href")!.slice(7).split("?")[0]));
  });

  const lines = markdownLines(markdown);
  for (const l of lines) for (const m of l.matchAll(PHONE_RE)) phones.add(m[0].trim());

  const address: string[] = [];
  const hours: string[] = [];
  lines.forEach((l, i) => {
    if (l.length > 140) return;
    if (POSTCODE_RE.test(l) && l.length < 60 && !/bewertung|review|rating|avis|stern|sterne|kunden/i.test(l) && address.length < 4) {
      const prev = lines[i - 1];
      if (prev && STREET_RE.test(prev) && !address.includes(prev)) address.push(prev);
      if (!address.includes(l)) address.push(l);
    } else if (STREET_RE.test(l) && l.length < 60 && address.length < 4 && POSTCODE_RE.test(lines[i + 1] ?? "")) {
      // picked up with the postcode line
    }
    if (DAY_RE.test(l) && TIME_RE.test(l) && hours.length < 10 && !hours.includes(l)) hours.push(l);
  });

  const social: Content["social"] = [];
  $("a[href]").each((_, a) => {
    const href = abs($(a).attr("href"), base);
    if (!href) return;
    for (const [network, re] of SOCIAL) {
      if (re.test(new URL(href).hostname) && !social.some((s) => s.network === network)) {
        social.push({ network, url: href });
      }
    }
  });

  return {
    title: cleanText($("title").first().text()),
    description: cleanText($('meta[name="description"]').attr("content") ?? ""),
    h1s: $("h1").map((_, h) => cleanText($(h).text())).get().filter(Boolean),
    lang: $("html").attr("lang") ?? "",
    nav,
    images: images.slice(0, 20),
    logoUrl,
    contact: {
      phones: [...phones].slice(0, 4),
      emails: [...emails].slice(0, 4),
      address,
      hours,
    },
    social,
    markdown: markdown.slice(0, 20000),
  };
}

/* ---------- health ---------- */

async function healthChecks($: cheerio.CheerioAPI, finalUrl: string, content: Content): Promise<HealthCheck[]> {
  const origin = new URL(finalUrl).origin;
  const [robots, sitemap] = await Promise.all([
    fetchText(`${origin}/robots.txt`, 200_000),
    safeFetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(TIMEOUT) })
      .then(async (r) => ({ ok: r.ok && /<(urlset|sitemapindex)/i.test((await r.text()).slice(0, 5000)), status: r.status }))
      .catch(() => ({ ok: false, status: 0 })),
  ]);

  let blocksAll = false;
  let robotsSitemap = false;
  if (robots.ok) {
    let inStar = false;
    for (const raw of robots.text.split("\n")) {
      const line = raw.split("#")[0].trim();
      const [k, ...rest] = line.split(":");
      const key = k?.toLowerCase().trim();
      const val = rest.join(":").trim();
      if (key === "user-agent") inStar = val === "*";
      else if (key === "disallow" && inStar && val === "/") blocksAll = true;
      else if (key === "sitemap") robotsSitemap = true;
    }
  }

  const imgs = $("img");
  const withAlt = imgs.filter((_, el) => !!$(el).attr("alt")?.trim()).length;
  const altPct = imgs.length ? Math.round((withAlt / imgs.length) * 100) : 100;
  const h1 = content.h1s.length;
  const titleLen = content.title.length;

  return [
    { id: "https", label: "Served over HTTPS", pass: finalUrl.startsWith("https://"), detail: new URL(finalUrl).protocol.replace(":", "") },
    {
      id: "title",
      label: "Page title",
      pass: titleLen > 0 && titleLen <= 65,
      detail: titleLen ? `${titleLen} characters` : "missing",
    },
    { id: "description", label: "Meta description", pass: !!content.description, detail: content.description ? `${content.description.length} characters` : "missing" },
    { id: "h1", label: "Exactly one h1", pass: h1 === 1, detail: `${h1} found` },
    { id: "viewport", label: "Mobile viewport meta", pass: $('meta[name="viewport"]').length > 0, detail: $('meta[name="viewport"]').length ? "present" : "missing" },
    { id: "alt", label: "Images with alt text", pass: altPct >= 90, detail: `${altPct}% of ${imgs.length}` },
    {
      id: "robots",
      label: "robots.txt allows crawling",
      pass: robots.ok && !blocksAll,
      detail: !robots.ok ? `not reachable (${robots.status || "timeout"})` : blocksAll ? "Disallow: / for all bots" : "reachable",
    },
    {
      id: "sitemap",
      label: "sitemap.xml",
      pass: sitemap.ok,
      detail: sitemap.ok ? "reachable" : robotsSitemap ? "not at /sitemap.xml (listed in robots.txt)" : `not reachable (${sitemap.status || "timeout"})`,
    },
  ];
}

/* ---------- main ---------- */

function googleFontFamilies(href: string): string[] {
  try {
    const u = new URL(href, "https://fonts.googleapis.com");
    return u.searchParams
      .getAll("family")
      .flatMap((f) => f.split("|"))
      .map((f) => f.split(":")[0].replace(/\+/g, " ").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function audit(input: AuditInput): Promise<{ audit: Audit; content: Content }> {
  const { html, finalUrl, markdown, pageHeight } = input;
  const $ = cheerio.load(html);

  // 1. CSS sources
  const hrefs = $("link[rel~='stylesheet'], link[rel='preload'][as='style']")
    .map((_, l) => abs($(l).attr("href"), finalUrl))
    .get()
    .filter((h): h is string => !!h);
  const uniqueHrefs = [...new Set(hrefs)].slice(0, CSS_FILE_LIMIT);
  const fetched = await Promise.all(uniqueHrefs.map((u) => fetchText(u)));
  let budget = CSS_BYTE_LIMIT;
  const files: Audit["css"]["files"] = [];
  const sheets: string[] = [];
  uniqueHrefs.forEach((url, i) => {
    const f = fetched[i];
    const text = f.text.slice(0, Math.max(0, budget));
    budget -= text.length;
    files.push({ url, bytes: text.length, ok: f.ok });
    if (text) sheets.push(text);
  });
  const blocks = $("style").map((_, s) => $(s).html() ?? "").get();
  const attrs = $("[style]").map((_, el) => $(el).attr("style") ?? "").get();

  const decls: Decl[] = [
    ...sheets.flatMap((s) => parseDecls(s)),
    ...blocks.flatMap((s) => parseDecls(s)),
    ...attrs.flatMap((s) => parseDecls(s, "[style]")),
  ];

  // 2. Counts
  const colorRaws: string[] = [];
  const families: string[] = [];
  const sizes: { px: number; selector: string }[] = [];
  const weights: string[] = [];
  const lineHeights: string[] = [];
  const radii: string[] = [];
  const shadows: string[] = [];
  let gradients = 0;

  for (const d of decls) {
    const v = d.value.replace(/\s*!important\s*$/i, "");
    for (const m of v.matchAll(COLOR_RE)) colorRaws.push(m[0]);
    gradients += (v.match(/(?:linear|radial|conic)-gradient\(/gi) ?? []).length;
    switch (d.prop) {
      case "font-family": {
        const f = firstFamily(v);
        if (f) families.push(f);
        break;
      }
      case "font": {
        const m = v.match(/(\d*\.?\d+(?:px|rem|em|pt))(?:\s*\/\s*\S+)?\s+(.+)$/i);
        if (m) {
          const px = toPx(m[1]);
          if (px) sizes.push({ px, selector: d.selector });
          const f = firstFamily(m[2]);
          if (f) families.push(f);
        }
        break;
      }
      case "font-size": {
        const px = toPx(v);
        if (px) sizes.push({ px, selector: d.selector });
        break;
      }
      case "font-weight":
        weights.push(v === "bold" ? "700" : v === "normal" ? "400" : v);
        break;
      case "line-height":
        lineHeights.push(v);
        break;
      case "border-radius":
        if (!/^0(px|%)?$/.test(v)) radii.push(v);
        break;
      case "box-shadow":
        if (!/^(none|initial|inherit|unset)$/i.test(v)) shadows.push(v);
        break;
    }
  }

  const colors = clusterColors(colorRaws);

  const linkedGoogle = $("link[href*='fonts.googleapis.com']").map((_, l) => $(l).attr("href") ?? "").get();
  const importedGoogle = [...[...sheets, ...blocks].join("\n").matchAll(/fonts\.googleapis\.com\/css2?\?[^"')\s;]+/g)].map((m) => m[0]);
  const googleFonts = [...new Set([...linkedGoogle, ...importedGoogle].flatMap(googleFontFamilies))];

  const familyCounts = tally(families.map((f) => f.toLowerCase())).map(({ value, count }) => ({
    name: families.find((f) => f.toLowerCase() === value) ?? value,
    count,
    system: SYSTEM_FONTS.has(value),
  }));

  const sizeCounts = tally(sizes.map((s) => s.px));
  const bodySizes = tally(sizes.filter((s) => /(^|[\s,>])(body|p)(\s*$|[\s,:.>])/i.test(s.selector)).map((s) => s.px));
  const bodyFontPx = bodySizes[0]?.value ?? sizeCounts[0]?.value ?? null;

  // 3. Page facts
  const content = extractContent($, finalUrl, markdown);

  // 3b. Real image sizes (for honest crops and no upscaling)
  const imgSizes = await measureImages(content.images.map((i) => i.src));
  content.images = content.images.map((i) => ({ ...i, ...(imgSizes[i.src] ?? {}) }));

  // 4. Density
  const chars = visibleChars(markdown);
  const charsPer1000px = pageHeight ? Math.round((chars / pageHeight) * 1000) : 0;

  // 5. Health
  const health = await healthChecks($, finalUrl, content);

  // 6. Hints
  const radiiCounts = tally(radii);
  const shadowCounts = tally(shadows);
  const systemCount = familyCounts.filter((f) => f.system).length;
  const hints = {
    warm_cool: warmCoolHint(colors.clusters),
    systematic_crafted: `measured: ${familyCounts.length} font families (${systemCount} system defaults${familyCounts[0] ? `, most used: ${familyCounts[0].name}` : ""}), ${radiiCounts.length} distinct radii, ${colors.distinct} distinct colours`,
    flat_deep: `measured: ${shadowCounts.length} shadow levels, ${gradients} gradients`,
    dense_airy: `measured: ${charsPer1000px} visible characters per 1000 px of page height (${chars} chars over ${pageHeight} px), body text ${bodyFontPx ?? "unknown"} px`,
  };

  return {
    audit: {
      finalUrl,
      pageHeight,
      css: {
        files,
        styleBlocks: blocks.length,
        styleAttrs: attrs.length,
        totalBytes: CSS_BYTE_LIMIT - budget + blocks.join("").length + attrs.join("").length,
      },
      colors,
      fonts: { families: familyCounts.slice(0, 12), googleFonts },
      type: {
        sizes: sizeCounts.slice(0, 16),
        weights: tally(weights).slice(0, 10),
        lineHeights: tally(lineHeights).slice(0, 10),
      },
      radii: radiiCounts.slice(0, 16),
      shadows: shadowCounts.slice(0, 12),
      gradients,
      density: { chars, charsPer1000px, bodyFontPx },
      health,
      hints,
    },
    content,
  };
}
