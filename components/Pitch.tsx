"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import type { Audit, Content, Direction } from "@/lib/types";
import { Mark } from "./marks";

/* Sales hook: an outreach email built only from measured facts, in the shop's own language. No LLM, no invented claims. */

type L = "de" | "fr" | "it" | "en";

const HEALTH: Record<L, Record<string, string>> = {
  de: { description: "Es fehlt eine Meta-Beschreibung, Google zeigt deshalb zufälligen Text an", h1: "Die Seite hat keine klare Hauptüberschrift (h1)", viewport: "Die Seite ist nicht fürs Handy eingerichtet", alt: "Viele Bilder haben keinen Alternativtext", sitemap: "Es gibt keine sitemap.xml für Google", robots: "Die robots.txt fehlt oder blockiert Suchmaschinen", title: "Der Seitentitel fehlt oder ist zu lang", https: "Die Seite läuft nicht über HTTPS" },
  fr: { description: "Il manque une méta-description, Google affiche donc un texte au hasard", h1: "La page n'a pas de titre principal clair (h1)", viewport: "La page n'est pas adaptée au mobile", alt: "Beaucoup d'images n'ont pas de texte alternatif", sitemap: "Il n'y a pas de sitemap.xml pour Google", robots: "Le fichier robots.txt manque ou bloque les moteurs", title: "Le titre de la page manque ou est trop long", https: "La page n'est pas servie en HTTPS" },
  it: { description: "Manca una meta-descrizione, quindi Google mostra un testo a caso", h1: "La pagina non ha un titolo principale chiaro (h1)", viewport: "La pagina non è ottimizzata per il cellulare", alt: "Molte immagini non hanno testo alternativo", sitemap: "Non c'è una sitemap.xml per Google", robots: "Il file robots.txt manca o blocca i motori di ricerca", title: "Il titolo della pagina manca o è troppo lungo", https: "La pagina non usa HTTPS" },
  en: { description: "There is no meta description, so Google shows random text", h1: "The page has no clear main heading (h1)", viewport: "The page isn't set up for phones", alt: "Many images have no alt text", sitemap: "There is no sitemap.xml for Google", robots: "robots.txt is missing or blocks search engines", title: "The page title is missing or too long", https: "The page isn't served over HTTPS" },
};

function buildEmail(lang: L, d: Direction, a: Audit) {
  const brand = d.brand.name;
  const fails = a.health.filter((h) => !h.pass && HEALTH[lang][h.id]).slice(0, 2).map((h) => HEALTH[lang][h.id]);
  const body = a.density.bodyFontPx && a.density.bodyFontPx < 16 ? a.density.bodyFontPx : null;
  const fonts = a.fonts.families.length;
  const colours = a.colors.distinct;
  const T = {
    de: {
      subject: `Ein Konzept für die Website von ${brand}`,
      hi: "Grüezi",
      intro: `ich habe mir die Website von ${brand} angeschaut und daraus ein Konzept für eine neue Startseite gemacht, mit Ihren eigenen Fotos, Texten und Öffnungszeiten.`,
      found: "Drei Dinge sind mir aufgefallen:",
      c: `${colours} verschiedene Farbwerte und ${fonts} Schriften: Der Auftritt wirkt dadurch uneinheitlich.`,
      b: body ? `Der Fliesstext ist nur ${body} px gross und auf dem Handy schwer lesbar.` : "",
      offer: `Das Konzept zeigt, wie ${brand} mit einem klaren Farb- und Schriftsystem aussehen könnte, inklusive passendem Instagram-Post. Darf ich es Ihnen in zehn Minuten zeigen, gerne auch bei Ihnen vor Ort?`,
      bye: "Freundliche Grüsse",
    },
    fr: {
      subject: `Un concept pour le site de ${brand}`,
      hi: "Bonjour",
      intro: `j'ai regardé le site de ${brand} et j'en ai tiré un concept de nouvelle page d'accueil, avec vos propres photos, textes et horaires.`,
      found: "Trois choses m'ont frappé :",
      c: `${colours} valeurs de couleur différentes et ${fonts} polices : l'image paraît peu cohérente.`,
      b: body ? `Le texte courant ne fait que ${body} px et se lit mal sur mobile.` : "",
      offer: `Le concept montre à quoi ${brand} pourrait ressembler avec un système clair de couleurs et de polices, avec le post Instagram assorti. Puis-je vous le montrer en dix minutes, volontiers sur place ?`,
      bye: "Meilleures salutations",
    },
    it: {
      subject: `Un concept per il sito di ${brand}`,
      hi: "Buongiorno",
      intro: `ho guardato il sito di ${brand} e ne ho ricavato un concept per una nuova homepage, con le vostre foto, i vostri testi e i vostri orari.`,
      found: "Tre cose mi hanno colpito:",
      c: `${colours} valori di colore diversi e ${fonts} caratteri: l'immagine risulta poco coerente.`,
      b: body ? `Il testo è di soli ${body} px e si legge male sul cellulare.` : "",
      offer: `Il concept mostra come potrebbe apparire ${brand} con un sistema chiaro di colori e caratteri, incluso il post Instagram abbinato. Posso mostrarvelo in dieci minuti, anche da voi?`,
      bye: "Cordiali saluti",
    },
    en: {
      subject: `A concept for the ${brand} website`,
      hi: "Hello",
      intro: `I looked at the ${brand} website and made a concept for a new homepage from it, using your own photos, words and opening hours.`,
      found: "Three things stood out:",
      c: `${colours} different colour values and ${fonts} fonts, so the look feels inconsistent.`,
      b: body ? `Body text is only ${body} px, which is hard to read on a phone.` : "",
      offer: `The concept shows how ${brand} could look with one clear colour and type system, including a matching Instagram post. May I show it to you in ten minutes, in person if you like?`,
      bye: "Kind regards",
    },
  }[lang];
  const points = [T.c, ...fails, T.b].filter(Boolean).slice(0, 3);
  const text = `${T.hi}\n\n${T.intro}\n\n${T.found}\n${points.map((p) => `– ${p}`).join("\n")}\n\n${T.offer}\n\n${T.bye}\n`;
  return { subject: T.subject, text };
}

export function Pitch({ direction, audit, content }: { direction: Direction; audit: Audit; content: Content }) {
  const t = useT();
  const siteLang = (["de", "fr", "it", "en"].includes(content.lang.slice(0, 2)) ? content.lang.slice(0, 2) : "de") as L;
  const initial = useMemo(() => buildEmail(siteLang, direction, audit), [siteLang, direction, audit]);
  const [subject, setSubject] = useState(initial.subject);
  const [text, setText] = useState(initial.text);
  const [copied, setCopied] = useState(false);
  const to = content.contact.emails[0] ?? "";
  const failed = audit.health.filter((h) => !h.pass).length;

  return (
    <div className="max-w-[820px]">
      <h2 className="display text-2xl">{t("pitch.title")}</h2>
      <p className="mt-2 text-graphite">{t("pitch.sub")}</p>
      <p className="mt-4">
        <Mark>{audit.colors.distinct}</Mark> {t("proof.distinct")} · <Mark>{audit.fonts.families.length}</Mark> {t("proof.families")} · <Mark>{failed}</Mark> SEO
      </p>
      <div className="mt-6 grid gap-3 rounded-frame border border-rule bg-sheet p-5">
        <label className="grid gap-1 text-sm">
          <span className="text-graphite">{t("pitch.to")}</span>
          <span className="font-semibold">{to || t("pitch.noemail")}</span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-graphite">{t("pitch.subject")}</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-control border border-rule px-3 py-2 text-base" />
        </label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} className="rounded-control border border-rule p-3 text-base leading-relaxed" />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              void navigator.clipboard.writeText(`${subject}\n\n${text}`).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="rounded-control border-[1.5px] border-ink bg-ink px-5 py-2.5 font-semibold text-sheet hover:bg-graphite"
          >
            {copied ? t("pitch.copied") : t("pitch.copy")}
          </button>
          {to && (
            <a
              href={`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}
              className="rounded-control border-[1.5px] border-ink bg-sheet px-5 py-2.5 font-semibold hover:bg-paper"
            >
              {t("pitch.mail")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
