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
  | { type: "captured"; meta: CaptureMeta; viewport: string; full: string }
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
