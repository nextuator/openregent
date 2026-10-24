import { assembleDocument } from "./assemble";
import { audit } from "./audit";
import { direction } from "./direction";
import { capture } from "./gaffa";
import { page, type PageReport } from "./page";
import { tokens } from "./tokens";
import type { Audit, CaptureMeta, Content, Direction, TokensResult } from "./types";

export type FullRun = {
  url: string;
  meta: CaptureMeta;
  audit: Audit;
  content: Content;
  direction: Direction;
  tokens: TokensResult;
  html: string;
  report: PageReport;
  viewportJpeg: Buffer;
  fullJpeg: Buffer;
};

/** Runs the whole glow-up server-side (used by the prerun script). */
export async function runAll(url: string, log: (s: string) => void = console.log): Promise<FullRun> {
  const cap = await capture(url);
  log(`captured ${cap.finalUrl} in ${cap.ms} ms`);
  const { audit: a, content } = await audit({ html: cap.html, finalUrl: cap.finalUrl, markdown: cap.markdown, pageHeight: cap.pageHeight });
  log(`audit: ${a.colors.literals} colour literals, ${a.colors.distinct} distinct, ${a.fonts.families.length} families`);
  const d = await direction(a, content, cap.viewportJpeg.toString("base64"));
  log(`direction: ${d.brand.name}`);
  const t = await tokens(d, a);
  log(`tokens: ${t.tokens.font.display} / ${t.tokens.font.body}, notes: ${t.notes.length}`);
  let css = "", body = "", report: PageReport | undefined;
  for await (const ev of page(t, d, content, cap.finalUrl)) {
    if (ev.type === "status") log(ev.message);
    if (ev.type === "final") ({ css, body, report } = ev);
  }
  if (!report) throw new Error("page did not finish");
  log(`page: violations first pass ${report.firstPass.length}, after retry ${report.afterRetry.length}, auto-fixed ${report.autoFixed.length}`);
  const html = assembleDocument({ lang: content.lang?.split("-")[0] || "en", brand: d.brand.name, tokensCss: t.css, fontsHref: t.fontsHref, css, body });
  const { html: _h, markdown: _m, viewportJpeg, fullJpeg, ...meta } = cap;
  void _h;
  void _m;
  return { url, meta, audit: a, content, direction: d, tokens: t, html, report, viewportJpeg, fullJpeg };
}

/** Re-does concept, tokens and page from a saved run (no new capture, no new direction call). */
export async function regenerate(
  saved: Pick<FullRun, "url" | "meta" | "audit" | "content" | "direction">,
  avoid: string[],
  log: (s: string) => void = console.log,
  force?: string,
): Promise<Omit<FullRun, "viewportJpeg" | "fullJpeg">> {
  const { pickConcept } = await import("./concept");
  const d: Direction = { ...saved.direction, concept: force };
  d.concept = pickConcept(d, avoid).id;
  log(`concept: ${d.concept}`);
  const t = await tokens(d, saved.audit);
  log(`tokens: ${t.tokens.font.display} / ${t.tokens.font.body}`);
  let css = "", body = "", report: PageReport | undefined;
  for await (const ev of page(t, d, saved.content, saved.meta.finalUrl)) {
    if (ev.type === "status") log(ev.message);
    if (ev.type === "final") ({ css, body, report } = ev);
  }
  if (!report) throw new Error("page did not finish");
  log(`page: violations first pass ${report.firstPass.length}, after retry ${report.afterRetry.length}, auto-fixed ${report.autoFixed.length}`);
  const html = assembleDocument({ lang: saved.content.lang?.split("-")[0] || "en", brand: d.brand.name, tokensCss: t.css, fontsHref: t.fontsHref, css, body });
  return { ...saved, direction: d, tokens: t, html, report };
}
