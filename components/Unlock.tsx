"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import type { Run } from "./RunView";
import { BaselMark, SwissCross } from "./BaselMark";

/* Pay only for a result you like: the preview is free; CHF 9 (demo checkout, nothing is charged) unlocks the
   download of the website and one-click hosting at a private link. */

const PRICE = "CHF 9.00";
const keyOf = (run: Run, slug: string | null) => `glowup-unlocked:${slug ?? run.url}`;

function stripBanner(html: string) {
  return html.replace(/<div class="glowup-concept-banner"[\s\S]*?<\/div>/, "").replace("</head>", "<style>body{padding-top:0!important}</style></head>");
}

export function Unlock({ run, slug }: { run: Run; slug: string | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<{ owner: boolean } | null>(null);
  const [hosting, setHosting] = useState<boolean | null>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [owner, setOwner] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(keyOf(run, slug));
      setUnlocked(v ? JSON.parse(v) : null);
    } catch {
      setUnlocked(null);
    }
    fetch("/api/publish", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setHosting(!!j.available))
      .catch(() => setHosting(false));
  }, [run, slug]);

  if (!run.html) return null;
  const brand = run.direction?.brand.name ?? "";
  const file = `${brand.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "glowup"}.html`;

  function pay() {
    setPaying(true);
    setTimeout(() => {
      const v = { owner };
      try {
        localStorage.setItem(keyOf(run, slug), JSON.stringify(v));
      } catch {
        /* ignore */
      }
      setUnlocked(v);
      setPaying(false);
      setOpen(false);
    }, 1200);
  }

  function download() {
    const html = unlocked?.owner ? stripBanner(run.html!) : run.html!;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function publish() {
    setBusy(true);
    try {
      const r = await fetch("/api/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(slug ? { slug } : { runId: run.runId }) });
      const j = await r.json();
      if (j.url) setLink(new URL(j.url, location.origin).toString());
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-4 border-[1.5px] border-ink bg-sheet p-4 sm:p-5">
        {unlocked ? (
          <>
            <span className="font-semibold">{t("pay.unlocked")}</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button onClick={download} className="rounded-control border-[1.5px] border-ink bg-ink px-4 py-2 font-semibold text-sheet hover:bg-graphite">
                {t("pay.download")}
              </button>
              <button
                onClick={() => void publish()}
                disabled={!hosting || busy || (!slug && !run.runId)}
                title={!hosting ? t("pay.soon") : undefined}
                className="rounded-control border-[1.5px] border-ink bg-sheet px-4 py-2 font-semibold hover:bg-paper disabled:opacity-50"
              >
                {hosting ? (busy ? "…" : t("pay.publish")) : t("pay.soon")}
              </button>
            </div>
            {link && (
              <p className="w-full text-sm">
                {t("pay.live")}{" "}
                <a href={link} target="_blank" rel="noopener" className="break-all font-semibold underline underline-offset-4">
                  {link}
                </a>
              </p>
            )}
          </>
        ) : (
          <>
            <div>
              <p className="font-semibold">{t("pay.like")}</p>
              <p className="text-sm text-graphite">{t("pay.free")}</p>
            </div>
            <button onClick={() => setOpen(true)} className="ml-auto rounded-control border-[1.5px] border-ink bg-ink px-5 py-2.5 font-semibold text-sheet hover:bg-graphite">
              {t("pay.cta", { price: PRICE })}
            </button>
          </>
        )}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="fixed inset-0 z-50 overflow-y-auto bg-ink/60 p-4">
          <div className="mx-auto my-8 grid max-w-3xl overflow-hidden bg-sheet md:grid-cols-[1fr_1.1fr]">
            {/* order summary */}
            <div className="bg-paper p-6 sm:p-8">
              <span className="flex items-center gap-2">
                <BaselMark size={24} />
                <SwissCross size={24} />
                <span className="display ml-1 text-lg">Glowup</span>
              </span>
              <p className="mt-6 text-sm text-graphite">{t("pay.order")}</p>
              <p className="display mt-1 text-2xl">{brand}</p>
              <ul className="mt-5 grid gap-2 text-sm">
                {["pay.i1", "pay.i2", "pay.i3"].map((k) => (
                  <li key={k} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-0.5 w-3 shrink-0 bg-redline" />
                    {t(k)}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-baseline justify-between border-t border-rule pt-4">
                <span>{t("pay.total")}</span>
                <span className="num text-2xl font-semibold">{PRICE}</span>
              </div>
              <p className="mt-2 text-sm text-graphite">{t("pay.vat")}</p>
            </div>

            {/* payment */}
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <h2 id="checkout-title" className="display text-2xl">
                  {t("pay.title")}
                </h2>
                <button onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none text-graphite hover:text-ink">
                  ×
                </button>
              </div>
              <p className="mt-2 inline-block bg-highlight px-2 py-1 text-sm font-semibold">{t("pay.demo")}</p>
              <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                <span className="rounded-control border-[1.5px] border-ink px-3 py-2 text-center font-semibold">TWINT</span>
                <span className="rounded-control border border-rule px-3 py-2 text-center text-graphite">{t("pay.card")}</span>
              </div>
              <label className="mt-4 grid gap-1 text-sm">
                <span className="text-graphite">{t("pay.email")}</span>
                <input type="email" placeholder="name@beispiel.ch" className="rounded-control border border-rule px-3 py-2 text-base" />
              </label>
              <label className="mt-4 flex items-start gap-3 text-sm">
                <input type="checkbox" checked={owner} onChange={(e) => setOwner(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-ink)]" />
                <span>{t("pay.owner")}</span>
              </label>
              <button
                onClick={pay}
                disabled={paying}
                className="mt-6 w-full rounded-control border-[1.5px] border-ink bg-ink px-5 py-3 text-lg font-semibold text-sheet hover:bg-graphite disabled:opacity-60"
              >
                {paying ? t("pay.processing") : t("pay.pay", { price: PRICE })}
              </button>
              <p className="mt-3 text-xs text-graphite">{t("pay.fine")}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
