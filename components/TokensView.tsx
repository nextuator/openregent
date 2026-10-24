"use client";

import { useEffect } from "react";
import { COLOR_TOKENS, type TokensResult } from "@/lib/types";
import { Mark, Squiggle } from "./marks";

const VAR: Record<string, string> = { textMuted: "text-muted", onPrimary: "on-primary", onAccent: "on-accent" };
const tokenName = (k: string) => `--color-${VAR[k] ?? k}`;

export function useShopFonts(href?: string) {
  useEffect(() => {
    if (!href || document.querySelector(`link[data-shop-fonts="${href}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.dataset.shopFonts = href;
    document.head.appendChild(l);
  }, [href]);
}

export function TokensView({ result, rawCount }: { result: TokensResult; rawCount: number }) {
  const t = result.tokens;
  useShopFonts(result.fontsHref);
  const hexOf = (name: string) => {
    const k = COLOR_TOKENS.find((c) => tokenName(c) === name);
    return k ? t.color[k] : undefined;
  };
  return (
    <div className="max-w-[1100px]">
      <p className="max-w-[70ch] text-lg">
        <Mark>{rawCount}</Mark> distinct colours become <Mark>{COLOR_TOKENS.length}</Mark> semantic colour tokens, 2 fonts and one type scale. Everything
        the redesign, the post and the slide use comes from here.
      </p>

      <section className="border-t border-rule py-8 mt-6">
        <h2 className="display mb-4 text-xl">Colour</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {COLOR_TOKENS.map((k) => (
            <li key={k} className="border border-rule bg-sheet p-2 text-sm">
              <span className="block h-14 border border-rule" style={{ background: t.color[k] }} />
              <code className="mt-2 block font-semibold">{tokenName(k)}</code>
              <span className="num block text-graphite">{t.color[k]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-rule py-8">
        <h2 className="display mb-4 text-xl">Raw to semantic</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              <th className="py-2 pr-4 font-semibold">Measured on the site</th>
              <th className="py-2 font-semibold">Becomes</th>
            </tr>
          </thead>
          <tbody>
            {t.mapping.map((m, i) => (
              <tr key={i} className="border-b border-rule align-top">
                <td className="py-2 pr-4">
                  <span className="flex flex-wrap gap-2">
                    {m.from.map((f) => {
                      const hex = f.match(/#[0-9a-f]{3,8}/i)?.[0];
                      return (
                        <span key={f} className="num inline-flex items-center gap-1.5">
                          {hex && <span className="inline-block h-4 w-4 border border-rule" style={{ background: hex }} />}
                          {f}
                        </span>
                      );
                    })}
                  </span>
                </td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5">
                    {hexOf(m.to) && <span className="inline-block h-4 w-4 border border-rule" style={{ background: hexOf(m.to) }} />}
                    <code>{m.to}</code>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="border-t border-rule py-8">
        <h2 className="display mb-4 text-xl">Type</h2>
        <div className="border border-rule p-6" style={{ background: t.color.bg, color: t.color.text }}>
          <p style={{ fontFamily: `"${t.font.display}"`, fontSize: 42, lineHeight: 1.1 }}>{t.font.display}</p>
          <p className="mt-2" style={{ fontFamily: `"${t.font.body}"`, fontSize: t.scale.base, lineHeight: 1.55 }}>
            {t.font.body} for body text, {t.scale.base} px, scale ratio {t.scale.ratio}.
          </p>
        </div>
        <p className="mt-3 text-sm text-graphite">
          Radius {t.radius.control} px on controls, {t.radius.card} px on cards. Section spacing {t.space.section} px. Shadow: {t.shadow}.
        </p>
      </section>

      <section className="border-t border-rule py-8">
        <h2 className="display mb-4 text-xl">Contrast, checked in code</h2>
        <dl>
          {result.contrast.map((c) => (
            <div key={c.pair} className="flex gap-4 border-b border-rule py-1.5 text-sm">
              <dt className="w-48 text-graphite">{c.pair}</dt>
              <dd className="num">
                {c.pass ? <Mark>{c.ratio}:1</Mark> : <Squiggle>{c.ratio}:1</Squiggle>} (needs {c.min}:1){c.adjusted ? ", lightness adjusted" : ""}
              </dd>
            </div>
          ))}
        </dl>
        {result.notes.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-graphite">
            {result.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-rule py-8">
        <h2 className="display mb-4 text-xl">The tokens</h2>
        <pre className="overflow-x-auto border border-rule bg-sheet p-4 text-sm leading-relaxed">{`:root {\n${result.css
          .split("\n")
          .map((l) => "  " + l)
          .join("\n")}\n}`}</pre>
      </section>
    </div>
  );
}
