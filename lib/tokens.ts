import { clampChroma, converter, differenceCiede2000, formatHex, parse, wcagContrast } from "culori";
import { conceptFonts, pickConcept } from "./concept";
import { completeJson } from "./llm";
import { COLOR_TOKENS, TokenSetSchema, type Audit, type ContrastCheck, type Direction, type TokenSet, type TokensResult } from "./types";

export const FONT_ALLOWLIST: Record<string, { generic: "serif" | "sans-serif"; weights: string | null }> = {
  Fraunces: { generic: "serif", weights: "400;600;700" },
  "Young Serif": { generic: "serif", weights: "400" },
  "Libre Caslon Text": { generic: "serif", weights: "400;700" },
  "DM Serif Display": { generic: "serif", weights: "400" },
  "Instrument Serif": { generic: "serif", weights: "400" },
  Archivo: { generic: "sans-serif", weights: "400;600;700;800" },
  Manrope: { generic: "sans-serif", weights: "400;600;700;800" },
  "Work Sans": { generic: "sans-serif", weights: "400;600;700" },
  Figtree: { generic: "sans-serif", weights: "400;600;700" },
  Karla: { generic: "sans-serif", weights: "400;600;700" },
  Rubik: { generic: "sans-serif", weights: "400;600;700" },
  "Space Grotesk": { generic: "sans-serif", weights: "400;600;700" },
  "Nunito Sans": { generic: "sans-serif", weights: "400;600;700" },
  "Bricolage Grotesque": { generic: "sans-serif", weights: "400;600;700" },
};

const toOklch = converter("oklch");

export const TOKEN_VAR: Record<(typeof COLOR_TOKENS)[number], string> = {
  bg: "bg",
  surface: "surface",
  text: "text",
  textMuted: "text-muted",
  border: "border",
  primary: "primary",
  onPrimary: "on-primary",
  accent: "accent",
  onAccent: "on-accent",
};

/* ---------- contrast (OKLCH: keep hue, move lightness) ---------- */

function withL(hex: string, l: number): string {
  const c = toOklch(hex)!;
  return formatHex(clampChroma({ ...c, mode: "oklch", l: Math.max(0, Math.min(1, l)) }, "oklch"));
}

/** Moves fg lightness away from bg until the ratio is met; if fg runs out of room, moves bg too. */
function ensureContrast(fg: string, bg: string, min: number): { fg: string; bg: string; ok: boolean } {
  if (wcagContrast(fg, bg) >= min) return { fg, bg, ok: true };
  const bgL = toOklch(bg)!.l;
  const dir = bgL > 0.6 ? -1 : 1;
  let f = fg;
  for (let l = toOklch(fg)!.l; l >= 0 && l <= 1; l += dir * 0.01) {
    f = withL(fg, l);
    if (wcagContrast(f, bg) >= min) return { fg: f, bg, ok: true };
  }
  let b = bg;
  for (let l = bgL; l >= 0 && l <= 1; l -= dir * 0.01) {
    b = withL(bg, l);
    if (wcagContrast(f, b) >= min) return { fg: f, bg: b, ok: true };
  }
  return { fg: f, bg: b, ok: false };
}

export function fixContrast(t: TokenSet): ContrastCheck[] {
  const c = t.color;
  const checks: ContrastCheck[] = [];
  const run = (pair: string, fgKey: keyof TokenSet["color"], bgKey: keyof TokenSet["color"], min: number, moveBg: boolean) => {
    const before = c[fgKey] + c[bgKey];
    const r = moveBg ? ensureContrast(c[fgKey], c[bgKey], min) : { ...ensureContrast(c[fgKey], c[bgKey], min), bg: c[bgKey] };
    c[fgKey] = r.fg;
    c[bgKey] = r.bg;
    const ratio = Math.round(wcagContrast(c[fgKey], c[bgKey]) * 100) / 100;
    checks.push({ pair, ratio, min, pass: ratio >= min, adjusted: before !== c[fgKey] + c[bgKey] });
  };
  // text/bg: 7:1 if reachable, else 4.5:1
  const black = wcagContrast("#000000", c.bg), white = wcagContrast("#ffffff", c.bg);
  run("text on bg", "text", "bg", Math.max(black, white) >= 7 ? 7 : 4.5, false);
  run("text-muted on bg", "textMuted", "bg", 4.5, false);
  run("text on surface", "text", "surface", 4.5, false);
  run("on-primary on primary", "onPrimary", "primary", 4.5, true);
  run("on-accent on accent", "onAccent", "accent", 4.5, true);
  return checks;
}

/* ---------- CSS output ---------- */

function fontStack(name: string): string {
  const generic = FONT_ALLOWLIST[name]?.generic ?? "sans-serif";
  return `"${name.replace(/"/g, "")}", ${generic === "serif" ? "Georgia, serif" : "system-ui, sans-serif"}`;
}

export function typeScale(t: TokenSet): Record<string, number> {
  const { base, ratio } = t.scale;
  const r = (n: number) => Math.round(base * Math.pow(ratio, n));
  return { sm: r(-1), base, lg: r(1), xl: r(2), "2xl": r(3), "3xl": r(4) };
}

export function toCss(t: TokenSet, prefix = ""): string {
  const p = `--${prefix}`;
  const lines: string[] = [];
  for (const k of COLOR_TOKENS) lines.push(`${p}color-${TOKEN_VAR[k]}: ${t.color[k]};`);
  lines.push(`${p}font-display: ${fontStack(t.font.display)};`);
  lines.push(`${p}font-body: ${fontStack(t.font.body)};`);
  for (const [k, v] of Object.entries(typeScale(t))) lines.push(`${p}text-${k}: ${v}px;`);
  lines.push(`${p}radius-control: ${t.radius.control}px;`);
  lines.push(`${p}radius-card: ${t.radius.card}px;`);
  lines.push(`${p}space-section: ${t.space.section}px;`);
  lines.push(
    `${p}shadow-card: ${
      t.shadow === "soft"
        ? `0 1px 2px color-mix(in oklab, var(${p}color-text) 8%, transparent), 0 10px 30px color-mix(in oklab, var(${p}color-text) 12%, transparent)`
        : "none"
    };`,
  );
  return lines.join("\n");
}

export function googleFontsHref(t: TokenSet): string {
  const fams = [...new Set([t.font.display, t.font.body])].map((name) => {
    const w = FONT_ALLOWLIST[name]?.weights;
    return `family=${encodeURIComponent(name).replace(/%20/g, "+")}${w ? `:wght@${w}` : ""}`;
  });
  return `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`;
}

/* ---------- LLM pick + code validation ---------- */

const SYSTEM = `You are a design-systems engineer. You turn target marks into one small set of semantic design tokens.
You answer with one JSON object and nothing else.`;

export async function tokens(dir: Direction, audit: Audit): Promise<TokensResult> {
  const allowed = [...Object.keys(FONT_ALLOWLIST), ...audit.fonts.googleFonts];
  const prompt = `## Target marks (0 = left label, 100 = right label)
${dir.axes.map((a) => `- ${a.id}: now ${a.now}, target ${a.target}. ${a.change}`).join("\n")}

## Keep
Brand primary: ${dir.keep.primaryHex} (${dir.keep.why})
Brand: ${dir.brand.name}, ${dir.brand.offer}. Voice: ${dir.brand.voice}.

## Measured colour clusters (hex ×count, sample raw values)
${audit.colors.clusters.map((c) => `- ${c.hex} ×${c.count} (${c.samples.join(", ")})`).join("\n")}

## Fonts
Currently used: ${audit.fonts.families.map((f) => f.name).join(", ") || "none"}.
Allowed for font.display and font.body (exact names): ${allowed.join(", ")}.

## Rules
- primary keeps the brand hue of ${dir.keep.primaryHex}. accent is one supporting colour.
- warm_cool target drives the neutrals (bg, surface, border, textMuted): low = warm neutrals, high = cool neutrals.
- dense_airy target drives space.section (dense ≈ 56-80, airy ≈ 120-160) and scale.base.
- flat_deep target drives shadow ("none" when below 40) and radius.card.
- systematic_crafted target drives the type pairing: crafted = an expressive serif display, systematic = a clean grotesk.
- mapping explains how the raw clusters collapse into the new tokens: each entry lists raw clusters as "#hex ×count" and the token they become, e.g. { "from": ["#a855f7 ×5", "#9333ea ×2"], "to": "--color-primary" }. Valid targets: ${COLOR_TOKENS.map((k) => `--color-${TOKEN_VAR[k]}`).join(", ")}. Cover every cluster listed above.

Return exactly:
{ "color": { "bg": "#rrggbb", "surface": "", "text": "", "textMuted": "", "border": "", "primary": "", "onPrimary": "", "accent": "", "onAccent": "" },
  "font": { "display": "", "body": "" },
  "scale": { "base": 16|17|18, "ratio": 1.2|1.25|1.333 },
  "radius": { "control": 0-12, "card": 0-24 },
  "space": { "section": 56-160 },
  "shadow": "none" | "soft",
  "mapping": [ { "from": ["#hex ×n"], "to": "--color-…" } ] }`;

  const t = await completeJson(TokenSetSchema, { system: SYSTEM, prompt, tier: "fast", maxTokens: 3000 });
  const notes: string[] = [];

  // Fonts must come from the allowlist or the site's own Google Fonts.
  const pickFont = (name: string, fallback: string) => {
    const hit = allowed.find((a) => a.toLowerCase() === name.trim().toLowerCase());
    if (!hit) notes.push(`Font "${name}" is not allowed, replaced with ${fallback}.`);
    return hit ?? fallback;
  };
  // The layout concept sets the type pairing, so different shops get different typography.
  const cf = conceptFonts(dir);
  t.font.display = pickFont(cf.display, "Fraunces");
  t.font.body = pickFont(cf.body, "Figtree");
  notes.push(`Layout concept "${pickConcept(dir).id}" sets the type pairing: ${t.font.display} with ${t.font.body}.`);

  // Keep the brand hue.
  const keepHue = toOklch(dir.keep.primaryHex)?.h;
  const gotHue = toOklch(t.color.primary)?.h;
  if (keepHue !== undefined && gotHue !== undefined) {
    const d = Math.abs(((keepHue - gotHue + 540) % 360) - 180);
    if (d > 20) {
      notes.push(`Primary ${t.color.primary} drifted ${Math.round(d)}° from the brand hue, reset to ${dir.keep.primaryHex}.`);
      t.color.primary = dir.keep.primaryHex;
    }
  }

  // Mapping targets must be real tokens.
  const valid = new Set(COLOR_TOKENS.map((k) => `--color-${TOKEN_VAR[k]}`));
  t.mapping = t.mapping.filter((m) => valid.has(m.to.trim()));

  for (const k of COLOR_TOKENS) t.color[k] = t.color[k].toLowerCase();
  const contrast = fixContrast(t);
  for (const c of contrast) if (c.adjusted) notes.push(`Adjusted lightness for ${c.pair} to reach ${c.min}:1 (now ${c.ratio}:1).`);

  return { tokens: t, css: toCss(t), fontsHref: googleFontsHref(t), contrast, notes };
}

/** Nearest token colour for a stray literal (ΔE2000). Used by the page validator. */
export function nearestToken(raw: string, t: TokenSet): { token: string; hex: string; deltaE: number } | null {
  const c = parse(raw);
  if (!c) return null;
  const de = differenceCiede2000();
  let best: { token: string; hex: string; deltaE: number } | null = null;
  for (const k of COLOR_TOKENS) {
    const d = de(c, t.color[k]);
    if (!best || d < best.deltaE) best = { token: `--color-${TOKEN_VAR[k]}`, hex: t.color[k], deltaE: Math.round(d * 10) / 10 };
  }
  return best;
}
