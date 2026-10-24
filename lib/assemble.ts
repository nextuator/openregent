import { APP_NAME } from "./config";

/* Pure, client-safe assembly of the generated homepage document. Used while streaming and for the final page. */

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Splits LLM output into its <style> block and its body markup (tolerates partial output). */
export function splitParts(raw: string): { css: string; body: string } {
  const s = raw.indexOf("<style");
  if (s < 0) return { css: "", body: "" };
  const open = raw.indexOf(">", s);
  const close = raw.indexOf("</style>", open);
  if (close < 0) return { css: raw.slice(open + 1), body: "" };
  let body = raw.slice(close + 8).trim();
  body = body.replace(/```\s*$/, "");
  return { css: raw.slice(open + 1, close), body };
}

const RESET = `*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);font-size:var(--text-base);line-height:1.55;padding-top:36px}
html,body{overflow-x:clip;max-width:100%}
img,svg,video,iframe{max-width:100%;height:auto;display:block}
h1,h2,h3,h4,p,li,a{overflow-wrap:break-word;hyphens:auto}
header,main,section,footer,nav,div{min-width:0}
a{color:inherit}
h1,h2,h3,h4{font-family:var(--font-display);line-height:1.1;margin:0 0 .5em}
p{margin:0 0 1em;max-width:70ch}
.glowup-concept-banner{position:fixed;top:0;left:0;right:0;z-index:2147483647;height:36px;display:flex;align-items:center;justify-content:center;padding:0 12px;background:var(--color-text);color:var(--color-bg);font:600 13px/1.2 var(--font-body);text-align:center}`;

export function assembleDocument(opts: { lang: string; brand: string; tokensCss: string; fontsHref: string; css: string; body: string }): string {
  const brand = escapeHtml(opts.brand);
  return `<!doctype html>
<html lang="${escapeHtml(opts.lang || "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${brand}: concept redesign</title>
<base target="_blank">
<link rel="stylesheet" href="${escapeHtml(opts.fontsHref)}">
<style>
:root{
${opts.tokensCss}
}
${RESET}
</style>
<style>
${opts.css}
</style>
</head>
<body>
<div class="glowup-concept-banner" role="note">Concept redesign by ${escapeHtml(APP_NAME)}. Not affiliated with ${brand}.</div>
${opts.body}
</body>
</html>`;
}
