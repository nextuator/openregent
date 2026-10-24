"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Run } from "./RunView";
import { toPng } from "html-to-image";
import { useT } from "@/lib/i18n";
import { SlideDeck } from "./SlideDeck";
import { useShopFonts } from "./TokensView";

/** Same-origin proxy so the PNG export can read the pixels. */
const px = (u: string) => `/api/img?u=${encodeURIComponent(u)}`;

/** Shop tokens as --shop-* custom properties (same values as the homepage's --color-* / --font-*). */
function shopVars(tokensCss: string): CSSProperties {
  const style: Record<string, string> = {};
  for (const line of tokensCss.split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const name = line.slice(0, i).trim().replace(/^--/, "--shop-");
    style[name] = line.slice(i + 1).trim().replace(/;$/, "").replace(/var\(--/g, "var(--shop-");
  }
  return style as CSSProperties;
}

function Scaled({ w, h, children, label, nodeRef }: { w: number; h: number; children: ReactNode; label: string; nodeRef?: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / w));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [w]);
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 font-semibold">{label}</figcaption>
      <div ref={ref} className="relative w-full overflow-hidden rounded-frame border border-rule" style={{ aspectRatio: `${w} / ${h}` }}>
        <div className="absolute left-0 top-0" style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div ref={nodeRef} style={{ width: w, height: h }}>{children}</div>
        </div>
      </div>
    </figure>
  );
}

const v = (name: string) => `var(--shop-${name})`;

export function OneSource({ run }: { run: Run }) {
  const t = run.tokens!, d = run.direction!, c = run.content!;
  const tr = useT();
  const postRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  const host = (() => { try { return new URL(run.meta?.finalUrl ?? run.url).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const tag = d.brand.name.replace(/[^\p{L}\p{N}]+/gu, "");
  const caption = `${d.copy.postHeadline}\n\n${d.copy.postLine}\n\n${d.copy.cta}: ${host}\n\n#${tag} #Basel #BaselCity #Basilea #MadeInBasel`;
  async function downloadNode(node: HTMLElement, w: number, h: number, name: string) {
    setBusy("slide");
    try {
      const url = await toPng(node, { width: w, height: h, pixelRatio: 1, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tag || "glowup"}-${name}.png`;
      a.click();
    } catch (e) {
      console.warn("PNG export failed", e);
    } finally {
      setBusy("");
    }
  }
  async function download(ref: React.RefObject<HTMLDivElement | null>, w: number, h: number, name: string) {
    if (!ref.current) return;
    setBusy(name);
    try {
      const url = await toPng(ref.current, { width: w, height: h, pixelRatio: 1, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tag || "glowup"}-${name}.png`;
      a.click();
    } catch (e) {
      console.warn("PNG export failed", e);
    } finally {
      setBusy("");
    }
  }
  useShopFonts(t.fontsHref);
  const photos = c.images.filter((i) => i.src !== d.keep.logoUrl && i.src !== c.logoUrl);
  const hero = photos[0];
  const second = photos[1] ?? photos[0];
  const logo = d.keep.logoUrl ?? c.logoUrl;
  const info = c.contact.hours.slice(0, 3).join(" · ") || c.contact.address.join(", ");
  const vars = shopVars(t.css);
  const sl = (c.lang || "de").slice(0, 2);
  const L = (
    {
      de: { measured: "Was wir gemessen haben", colours: "Farbwerte", fonts: "Schriften", seo: "SEO-Probleme", system: "Das neue Design-System" },
      fr: { measured: "Ce que nous avons mesuré", colours: "valeurs de couleur", fonts: "polices", seo: "problèmes SEO", system: "Le nouveau système" },
      it: { measured: "Cosa abbiamo misurato", colours: "valori di colore", fonts: "caratteri", seo: "problemi SEO", system: "Il nuovo sistema" },
      en: { measured: "What we measured", colours: "colour values", fonts: "fonts", seo: "SEO issues", system: "The new design system" },
    } as const
  )[sl === "fr" || sl === "it" || sl === "en" ? sl : "de"];

  const Brand = ({ size }: { size: number }) =>
    logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={px(logo)} alt={d.brand.name} style={{ height: size, width: "auto", objectFit: "contain" }} />
    ) : (
      <span style={{ fontFamily: v("font-display"), fontSize: size * 0.8, fontWeight: 700 }}>{d.brand.name}</span>
    );

  return (
    <div className="grid gap-8">
      <p className="max-w-[70ch] text-lg">The homepage, the post and the slide all read the same {t.css.split("\n").length} tokens. Change a token and all three change.</p>
      <div className="grid gap-4 rounded-frame border border-rule bg-sheet p-5 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-sm text-graphite">{tr("social.caption")}</p>
          <pre className="mt-2 whitespace-pre-wrap font-[inherit] text-base">{caption}</pre>
        </div>
        <div className="flex flex-wrap content-start gap-2 md:flex-col">
          <button onClick={() => void navigator.clipboard.writeText(caption).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })} className="rounded-control border-[1.5px] border-ink bg-sheet px-4 py-2 font-semibold hover:bg-paper">
            {copied ? tr("pitch.copied") : tr("social.copy")}
          </button>
          <button onClick={() => void download(postRef, 1080, 1080, "post")} disabled={!!busy} className="rounded-control border-[1.5px] border-ink bg-ink px-4 py-2 font-semibold text-sheet hover:bg-graphite disabled:opacity-60">
            {busy === "post" ? tr("social.busy") : tr("social.post")}
          </button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Scaled w={1280} h={800} label="Homepage">
          {run.html ? (
            <iframe title="Homepage thumbnail" srcDoc={run.html} sandbox="" className="h-full w-full border-0" tabIndex={-1} />
          ) : (
            <div className="h-full w-full bg-sheet" />
          )}
        </Scaled>
        <Scaled w={1080} h={1080} label="Instagram post, 1080 × 1080" nodeRef={postRef}>
          <div data-shop-scope style={{ ...vars, width: 1080, height: 1080, position: "relative", overflow: "hidden" }}>
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={px(hero.src)} alt={hero.alt} style={{ position: "absolute", inset: 0, width: "100%", height: "62%", objectFit: "cover" }} />
            )}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: hero ? "38%" : "100%", background: v("color-bg"), padding: "48px 64px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: v("font-display"), fontSize: 76, lineHeight: 1.02, margin: 0, color: v("color-text") }}>{d.copy.postHeadline}</p>
                <p style={{ fontFamily: v("font-body"), fontSize: 32, lineHeight: 1.3, margin: "16px 0 0", color: v("color-text-muted") }}>{d.copy.postLine}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Brand size={56} />
                <span style={{ background: v("color-primary"), color: v("color-on-primary"), fontFamily: v("font-body"), fontWeight: 700, fontSize: 30, padding: "16px 32px", borderRadius: v("radius-control") }}>{d.copy.cta}</span>
              </div>
            </div>
          </div>
        </Scaled>
      </div>
      <SlideDeck
        label={tr("social.deck")}
        downloadLabel={tr("social.slide")}
        busy={busy === "slide"}
        onDownload={(node) => void downloadNode(node, 1920, 1080, `slide-${node.dataset.n}`)}
        slides={[
          // 1. Title
          <div key="1" data-shop-scope style={{ ...vars, width: 1920, height: 1080, display: "grid", gridTemplateColumns: second ? "1fr 1fr" : "1fr", background: v("color-bg") }}>
            <div style={{ padding: "120px 112px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Brand size={72} />
              <div>
                <p style={{ fontFamily: v("font-display"), fontSize: 120, lineHeight: 1, margin: 0, color: v("color-text") }}>{d.copy.slideTitle}</p>
                <p style={{ fontFamily: v("font-body"), fontSize: 44, lineHeight: 1.3, margin: "32px 0 0", color: v("color-text-muted"), maxWidth: "22ch" }}>{d.copy.slideSubtitle}</p>
              </div>
              <span />
            </div>
            {second && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={px(second.src)} alt={second.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>,
          // 2. What we measured
          <div key="2" data-shop-scope style={{ ...vars, width: 1920, height: 1080, background: v("color-surface"), padding: "120px 112px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{ fontFamily: v("font-display"), fontSize: 84, lineHeight: 1, margin: 0, color: v("color-text") }}>{L.measured}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 64 }}>
              {[
                [String(run.audit?.colors.distinct ?? "–"), L.colours, "9"],
                [String(run.audit?.fonts.families.length ?? "–"), L.fonts, "2"],
                [String(run.audit?.health.filter((h) => !h.pass).length ?? "–"), L.seo, "0"],
              ].map(([now, label, next]) => (
                <div key={label} style={{ borderTop: `6px solid ${v("color-primary")}`, paddingTop: 32 }}>
                  <p style={{ fontFamily: v("font-display"), fontSize: 160, lineHeight: 1, margin: 0, color: v("color-text") }}>{now}</p>
                  <p style={{ fontFamily: v("font-body"), fontSize: 36, margin: "16px 0 0", color: v("color-text-muted") }}>{label}</p>
                  <p style={{ fontFamily: v("font-body"), fontSize: 36, fontWeight: 700, margin: "24px 0 0", color: v("color-text") }}>→ {next}</p>
                </div>
              ))}
            </div>
            <Brand size={56} />
          </div>,
          // 3. The new design system
          <div key="3" data-shop-scope style={{ ...vars, width: 1920, height: 1080, background: v("color-bg"), padding: "120px 112px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 96, alignItems: "center" }}>
            <div>
              <p style={{ fontFamily: v("font-display"), fontSize: 84, lineHeight: 1, margin: 0, color: v("color-text") }}>{L.system}</p>
              <p style={{ fontFamily: v("font-display"), fontSize: 64, margin: "56px 0 0", color: v("color-text") }}>{t.tokens.font.display}</p>
              <p style={{ fontFamily: v("font-body"), fontSize: 40, margin: "12px 0 0", color: v("color-text-muted") }}>{t.tokens.font.body}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {(["bg", "surface", "text", "primary", "accent", "border"] as const).map((k) => (
                <div key={k} style={{ height: 200, background: t.tokens.color[k], border: `2px solid ${v("color-border")}` }} />
              ))}
            </div>
          </div>,
          // 4. Visit
          <div key="4" data-shop-scope style={{ ...vars, width: 1920, height: 1080, background: v("color-primary"), color: v("color-on-primary"), padding: "120px 112px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <p style={{ fontFamily: v("font-display"), fontSize: 96, lineHeight: 1, margin: 0 }}>{d.copy.cta}</p>
            <div style={{ fontFamily: v("font-body"), fontSize: 44, lineHeight: 1.5 }}>
              {c.contact.address.length > 0 && <p style={{ margin: 0 }}>{c.contact.address.join(", ")}</p>}
              {c.contact.hours.slice(0, 3).map((h) => <p key={h} style={{ margin: 0 }}>{h}</p>)}
              {c.contact.phones[0] && <p style={{ margin: "24px 0 0", fontWeight: 700 }}>{c.contact.phones[0]}</p>}
              <p style={{ margin: "24px 0 0" }}>{host}</p>
            </div>
          </div>,
        ]}
      />
    </div>
  );
}
