import { z } from "zod";

/* ---------- Capture (Gaffa) ---------- */

export type Capture = {
  url: string;
  finalUrl: string;
  html: string;
  markdown: string;
  /** True page height in CSS px (from the full-page screenshot). */
  pageHeight: number;
  viewportJpeg: Buffer;
  fullJpeg: Buffer;
  ms: number;
  credits: number | null;
};

export type CaptureMeta = Omit<Capture, "html" | "markdown" | "viewportJpeg" | "fullJpeg">;

/* ---------- Audit (deterministic) ---------- */

export type Counted<T = string> = { value: T; count: number };

export type ColorCluster = { hex: string; count: number; samples: string[] };

export type HealthCheck = { id: string; label: string; pass: boolean; detail: string };

export type Audit = {
  finalUrl: string;
  pageHeight: number;
  css: {
    files: { url: string; bytes: number; ok: boolean }[];
    styleBlocks: number;
    styleAttrs: number;
    totalBytes: number;
  };
  colors: { literals: number; distinct: number; clusters: ColorCluster[] };
  fonts: {
    families: { name: string; count: number; system: boolean }[];
    googleFonts: string[];
  };
  type: {
    sizes: Counted<number>[];
    weights: Counted[];
    lineHeights: Counted[];
  };
  radii: Counted[];
  shadows: Counted[];
  gradients: number;
  density: { chars: number; charsPer1000px: number; bodyFontPx: number | null };
  health: HealthCheck[];
  hints: {
    warm_cool: string;
    systematic_crafted: string;
    flat_deep: string;
    dense_airy: string;
  };
};

export type Content = {
  title: string;
  description: string;
  h1s: string[];
  lang: string;
  nav: string[];
  images: { src: string; alt: string }[];
  logoUrl: string | null;
  contact: { phones: string[]; emails: string[]; address: string[]; hours: string[] };
  social: { network: string; url: string }[];
  markdown: string;
};

/* ---------- Analyze stream events ---------- */

export type AnalyzeEvent =
  | { type: "captured"; runId: string; meta: CaptureMeta; viewport: string; full: string }
  | { type: "audit"; audit: Audit; content: Content }
  | { type: "error"; code: string; message: string };

/* ---------- Direction (LLM) ---------- */

export const AXES = [
  { id: "warm_cool", left: "Warm", right: "Cool", measured: true },
  { id: "systematic_crafted", left: "Systematic", right: "Crafted", measured: true },
  { id: "flat_deep", left: "Flat", right: "Deep", measured: true },
  { id: "enthusiastic_rational", left: "Enthusiastic", right: "Rational", measured: false },
  { id: "formal_informal", left: "Formal", right: "Informal", measured: false },
  { id: "funny_serious", left: "Funny", right: "Serious", measured: false },
  { id: "dense_airy", left: "Dense", right: "Airy", measured: true },
] as const;

export type AxisId = (typeof AXES)[number]["id"];

const words = (max: number) =>
  z.string().min(1).refine((s) => s.trim().split(/\s+/).length <= max, { message: `must be at most ${max} words` });
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex colour like #1a2b3c");
const MEASURED_AXES = AXES.filter((a) => a.measured).map((a) => a.id) as string[];

export const DirectionSchema = z.object({
  brand: z.object({ name: z.string().min(1).max(80), offer: words(12), audience: words(10), voice: words(10) }),
  keep: z.object({ primaryHex: hex, logoUrl: z.string().nullable(), why: words(15) }),
  axes: z
    .array(
      z.object({
        id: z.enum(AXES.map((a) => a.id) as [AxisId, ...AxisId[]]),
        now: z.number().int().min(0).max(100),
        target: z.number().int().min(0).max(100),
        basis: z.string().min(8),
        change: z.string().min(8).max(240),
      }),
    )
    .length(7)
    .superRefine((axes, ctx) => {
      const ids = new Set(axes.map((a) => a.id));
      if (ids.size !== 7) ctx.addIssue({ code: "custom", message: "each of the 7 axis ids must appear exactly once" });
      for (const a of axes) {
        const measured = MEASURED_AXES.includes(a.id);
        if (measured && !a.basis.startsWith("measured:")) ctx.addIssue({ code: "custom", message: `axis ${a.id}: basis must start with "measured:" and cite the numbers` });
        if (!measured && !/^(reading of copy:|screenshot:)/.test(a.basis)) ctx.addIssue({ code: "custom", message: `axis ${a.id}: basis must start with "reading of copy:" or "screenshot:"` });
      }
    }),
  copy: z.object({
    heroHeadline: words(8),
    heroSub: words(22),
    cta: z.string().min(2).refine((s) => { const n = s.trim().split(/\s+/).length; return n >= 1 && n <= 3; }, "must be 1-3 words"),
    ctaHref: z.string().regex(/^(tel:|mailto:|https?:\/\/)/, "must start with tel:, mailto: or http(s)://"),
    postHeadline: words(7),
    postLine: words(14),
    slideTitle: words(6),
    slideSubtitle: words(14),
  }),
  /** Layout concept id, set in code after the LLM call (not by the model). */
  concept: z.string().optional(),
});
export type Direction = z.infer<typeof DirectionSchema>;

/* ---------- Tokens ---------- */

export const COLOR_TOKENS = ["bg", "surface", "text", "textMuted", "border", "primary", "onPrimary", "accent", "onAccent"] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export const TokenSetSchema = z.object({
  color: z.object(Object.fromEntries(COLOR_TOKENS.map((k) => [k, hex])) as Record<ColorToken, typeof hex>),
  font: z.object({ display: z.string().min(2), body: z.string().min(2) }),
  scale: z.object({ base: z.union([z.literal(16), z.literal(17), z.literal(18)]), ratio: z.union([z.literal(1.2), z.literal(1.25), z.literal(1.333)]) }),
  radius: z.object({ control: z.number().min(0).max(12), card: z.number().min(0).max(24) }),
  space: z.object({ section: z.number().min(56).max(160) }),
  shadow: z.enum(["none", "soft"]),
  mapping: z.array(z.object({ from: z.array(z.string()).min(1), to: z.string() })).max(16),
});
export type TokenSet = z.infer<typeof TokenSetSchema>;

export type ContrastCheck = { pair: string; ratio: number; min: number; pass: boolean; adjusted: boolean };
export type TokensResult = { tokens: TokenSet; css: string; fontsHref: string; contrast: ContrastCheck[]; notes: string[] };
