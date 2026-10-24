import type { Audit, Content } from "@/lib/types";
import { Mark, Squiggle } from "./marks";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-8">
      <h2 className="display mb-4 text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-rule py-1.5 text-sm last:border-0">
      <dt className="w-40 shrink-0 text-graphite">{k}</dt>
      <dd className="min-w-0 break-words">{v}</dd>
    </div>
  );
}

export function AuditView({ audit, content }: { audit: Audit; content: Content }) {
  const a = audit;
  const failed = a.health.filter((h) => !h.pass).length;
  return (
    <div className="max-w-[1100px]">
      <p className="max-w-[70ch] text-lg">
        Measured from {a.css.files.length} stylesheets, {a.css.styleBlocks} style blocks and {a.css.styleAttrs} inline styles. No guessing: every
        number below was counted in the site&apos;s real CSS and DOM.
      </p>

      <Section title="Colour">
        <p className="mb-5 text-lg">
          <Mark>{a.colors.literals}</Mark> colour literals, <Mark>{a.colors.distinct}</Mark> distinct values, grouped into{" "}
          {a.colors.clusters.length} clusters of near-identical colours.
        </p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {a.colors.clusters.map((c) => (
            <li key={c.hex} className="border border-rule bg-sheet p-2 text-sm">
              <span className="block h-12 border border-rule" style={{ background: c.hex }} />
              <span className="num mt-2 block font-semibold">
                {c.hex} ×{c.count}
              </span>
              <span className="block truncate text-graphite" title={c.samples.join(", ")}>
                {c.samples.join(", ")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm italic text-graphite">{a.hints.warm_cool}</p>
      </Section>

      <Section title="Type">
        <p className="mb-5 text-lg">
          <Mark>{a.fonts.families.length}</Mark> font families, <Mark>{a.type.sizes.length}</Mark> font sizes,{" "}
          <Mark>{a.type.weights.length}</Mark> weights.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          <dl>
            {a.fonts.families.map((f) => (
              <Row key={f.name} k={`×${f.count}`} v={<>{f.name}{f.system && <span className="text-graphite"> (system default)</span>}</>} />
            ))}
            {a.fonts.googleFonts.length > 0 && <Row k="Google Fonts" v={a.fonts.googleFonts.join(", ")} />}
          </dl>
          <dl>
            {a.type.sizes.map((s) => (
              <Row key={s.value} k={`${s.value} px`} v={<span className="num">×{s.count}</span>} />
            ))}
          </dl>
          <dl>
            {a.type.weights.map((w) => (
              <Row key={w.value} k={`weight ${w.value}`} v={<span className="num">×{w.count}</span>} />
            ))}
            {a.type.lineHeights.slice(0, 6).map((l) => (
              <Row key={l.value} k={`line-height ${l.value}`} v={<span className="num">×{l.count}</span>} />
            ))}
          </dl>
        </div>
        <p className="mt-4 text-sm italic text-graphite">{a.hints.systematic_crafted}</p>
      </Section>

      <Section title="Shape and depth">
        <p className="mb-5 text-lg">
          <Mark>{a.radii.length}</Mark> distinct radii, <Mark>{a.shadows.length}</Mark> shadow levels, <Mark>{a.gradients}</Mark> gradients.
        </p>
        <div className="grid gap-8 md:grid-cols-2">
          <dl>
            {a.radii.map((r) => (
              <Row key={r.value} k={`×${r.count}`} v={<code className="text-sm">{r.value}</code>} />
            ))}
          </dl>
          <dl>
            {a.shadows.map((s) => (
              <Row key={s.value} k={`×${s.count}`} v={<code className="text-sm">{s.value}</code>} />
            ))}
          </dl>
        </div>
        <p className="mt-4 text-sm italic text-graphite">{a.hints.flat_deep}</p>
      </Section>

      <Section title="Density">
        <p className="text-lg">
          <Mark>{a.density.charsPer1000px}</Mark> visible characters per 1000 px of page height, body text{" "}
          <Mark>{a.density.bodyFontPx ?? "?"} px</Mark>, page <Mark>{a.pageHeight} px</Mark> tall.
        </p>
      </Section>

      <Section title="Does Google see you?">
        <p className="mb-4 text-lg">
          {failed === 0 ? "All checks pass." : (
            <>
              <Mark>{failed}</Mark> of {a.health.length} checks fail.
            </>
          )}
        </p>
        <dl>
          {a.health.map((h) => (
            <Row
              key={h.id}
              k={h.label}
              v={h.pass ? <span>{h.detail}</span> : <Squiggle><span className="font-semibold">{h.detail}</span></Squiggle>}
            />
          ))}
        </dl>
      </Section>

      <Section title="Content found">
        <dl className="max-w-[900px]">
          <Row k="Title" v={content.title || "none"} />
          <Row k="Description" v={content.description || "none"} />
          <Row k="h1" v={content.h1s.join(" · ") || "none"} />
          <Row k="Navigation" v={content.nav.join(", ") || "none"} />
          <Row k="Phone" v={content.contact.phones.join(", ") || "none"} />
          <Row k="Email" v={content.contact.emails.join(", ") || "none"} />
          <Row k="Address" v={content.contact.address.join(", ") || "none"} />
          <Row k="Opening hours" v={content.contact.hours.join("; ") || "none"} />
          <Row k="Social" v={content.social.map((s) => s.network).join(", ") || "none"} />
          <Row k="Images" v={`${content.images.length} usable`} />
          <Row k="Logo" v={content.logoUrl ? "found" : "none"} />
        </dl>
      </Section>

      <Section title="CSS sources">
        <dl>
          {a.css.files.map((f) => (
            <Row key={f.url} k={f.ok ? `${Math.round(f.bytes / 1024)} KB` : "failed"} v={<span className="break-all text-sm">{f.url}</span>} />
          ))}
        </dl>
      </Section>
    </div>
  );
}
