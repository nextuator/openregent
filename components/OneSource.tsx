"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Run } from "./RunView";
import { useShopFonts } from "./TokensView";

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

function Scaled({ w, h, children, label }: { w: number; h: number; children: ReactNode; label: string }) {
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
        <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
      </div>
    </figure>
  );
}

const v = (name: string) => `var(--shop-${name})`;

export function OneSource({ run }: { run: Run }) {
  const t = run.tokens!, d = run.direction!, c = run.content!;
  useShopFonts(t.fontsHref);
  const photos = c.images.filter((i) => i.src !== d.keep.logoUrl && i.src !== c.logoUrl);
  const hero = photos[0];
  const second = photos[1] ?? photos[0];
  const logo = d.keep.logoUrl ?? c.logoUrl;
  const info = c.contact.hours.slice(0, 3).join(" · ") || c.contact.address.join(", ");
  const vars = shopVars(t.css);

  const Brand = ({ size }: { size: number }) =>
    logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={d.brand.name} style={{ height: size, width: "auto", objectFit: "contain" }} />
    ) : (
      <span style={{ fontFamily: v("font-display"), fontSize: size * 0.8, fontWeight: 700 }}>{d.brand.name}</span>
    );

  return (
    <div className="grid gap-8">
      <p className="max-w-[70ch] text-lg">The homepage, the post and the slide all read the same {t.css.split("\n").length} tokens. Change a token and all three change.</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Scaled w={1280} h={800} label="Homepage">
          {run.html ? (
            <iframe title="Homepage thumbnail" srcDoc={run.html} sandbox="" className="h-full w-full border-0" tabIndex={-1} />
          ) : (
            <div className="h-full w-full bg-sheet" />
          )}
        </Scaled>
        <Scaled w={1080} h={1080} label="Post, 1080 × 1080">
          <div data-shop-scope style={{ ...vars, width: 1080, height: 1080, position: "relative", overflow: "hidden" }}>
            {hero && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.src} alt={hero.alt} style={{ position: "absolute", inset: 0, width: "100%", height: "62%", objectFit: "cover" }} />
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
      <Scaled w={1920} h={1080} label="Slide, 1920 × 1080">
        <div data-shop-scope style={{ ...vars, width: 1920, height: 1080, display: "grid", gridTemplateColumns: second ? "1fr 1fr" : "1fr", background: v("color-bg") }}>
          <div style={{ padding: "120px 112px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Brand size={72} />
            <div>
              <p style={{ fontFamily: v("font-display"), fontSize: 120, lineHeight: 1, margin: 0, color: v("color-text") }}>{d.copy.slideTitle}</p>
              <p style={{ fontFamily: v("font-body"), fontSize: 44, lineHeight: 1.3, margin: "32px 0 0", color: v("color-text-muted"), maxWidth: "22ch" }}>{d.copy.slideSubtitle}</p>
            </div>
            {info ? (
              <p style={{ fontFamily: v("font-body"), fontSize: 30, margin: 0, color: v("color-text"), borderTop: `3px solid ${v("color-primary")}`, paddingTop: 28 }}>{info}</p>
            ) : (
              <span />
            )}
          </div>
          {second && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={second.src} alt={second.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
        </div>
      </Scaled>
    </div>
  );
}
