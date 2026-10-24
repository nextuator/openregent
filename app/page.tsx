import Link from "next/link";
import { BaselBand, BaselMark, Baslerstab, SwissCross } from "@/components/BaselMark";
import { Limits } from "@/components/Limits";
import { ProofCard } from "@/components/ProofCard";
import { Samples } from "@/components/Samples";
import { UrlForm } from "@/components/UrlForm";
import { VoteTally } from "@/components/VoteTally";
import { LangSwitcher, T } from "@/lib/i18n";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <span className="flex items-center gap-2">
          <BaselMark size={28} />
          <SwissCross size={28} />
          <span className="display ml-1 text-xl">Glowup</span>
          <span className="hidden text-sm text-graphite sm:inline">Basel</span>
        </span>
        <span className="flex flex-wrap items-center gap-2 sm:gap-3">
          <LangSwitcher />
          <span aria-hidden className="hidden h-6 w-px bg-rule sm:block" />
          <Link href="/vote" className="rounded-control border-[1.5px] border-ink px-3 py-1 font-semibold hover:bg-ink hover:text-sheet">
            <T k="nav.vote" />
          </Link>
        </span>
      </header>
      <BaselBand />

      {/* 1. Hero */}
      <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <h1 className="display max-w-[16ch] text-3xl sm:text-hero">
            <T k="hero.a" /> <em className="hl italic"><T k="hero.b" /></em>
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg text-graphite">
            <T k="hero.short" />
          </p>
          <div className="relative mt-8">
            <UrlForm />
          </div>
          <p className="mt-3 text-sm text-graphite">
            <T k="hero.try" />
          </p>
          <div className="mt-1">
            <Limits />
          </div>
        </div>
        <div className="hidden lg:block">
          <ProofCard />
        </div>
      </section>

      {/* 2. One before/after */}
      <Samples limit={1} />

      {/* 3. Sales hook */}
      <section aria-labelledby="sell" className="relative my-14 grid gap-8 overflow-hidden bg-ink p-6 text-sheet sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
        <Baslerstab size={340} color="#ffffff" className="pointer-events-none absolute -right-20 -top-12 opacity-[0.07]" />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <SwissCross /> <T k="sell.kicker" />
          </p>
          <h2 id="sell" className="display mt-3 text-2xl sm:text-3xl">
            <T k="sell.title" />
          </h2>
          <ul className="mt-5 grid gap-2">
            {["sell.p1", "sell.p2", "sell.p3"].map((k) => (
              <li key={k} className="flex items-center gap-3">
                <span aria-hidden className="h-0.5 w-4 bg-redline" />
                <T k={k} />
              </li>
            ))}
          </ul>
        </div>
        <div className="relative grid gap-3">
          <Link href="/glow?run=fahrschule-basel-ch&tab=pitch" className="rounded-control bg-sheet px-6 py-3 text-center font-semibold text-ink hover:bg-paper">
            <T k="sell.cta" />
          </Link>
          <p className="text-center text-sm text-sheet/70">
            <T k="sell.note" />
          </p>
        </div>
      </section>

      {/* 4. Vote */}
      <section className="grid items-center gap-6 border-y border-ink py-8 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="text-lg">
            <T k="vote.short" />
          </p>
          <VoteTally />
        </div>
        <Link href="/vote" className="rounded-control border-[1.5px] border-ink bg-ink px-6 py-3 text-center font-semibold text-sheet hover:bg-graphite">
          <T k="vote.cta" />
        </Link>
      </section>

      {/* 5. Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-4 py-8 text-sm text-graphite">
        <span className="flex items-center gap-2">
          <BaselMark size={20} />
          <SwissCross size={20} />
          <T k="footer.made" />
        </span>
        <span>
          <T k="footer.note" />
        </span>
      </footer>
    </main>
  );
}
