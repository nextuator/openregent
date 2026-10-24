import Link from "next/link";
import { BaselMark, SwissCross } from "@/components/BaselMark";
import { Learning } from "@/components/Learning";
import { Limits } from "@/components/Limits";
import { ProofCard } from "@/components/ProofCard";
import { Samples } from "@/components/Samples";
import { UrlForm } from "@/components/UrlForm";
import { VoteTally } from "@/components/VoteTally";
import { LangSwitcher, T } from "@/lib/i18n";

const METHOD = [1, 2, 3, 4];
const DIFF = [1, 2, 3];

export default function Home() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule py-4">
        <span className="flex items-center gap-2">
          <BaselMark />
          <span className="display text-xl">Glowup</span>
          <span className="hidden items-center gap-1.5 text-sm text-graphite sm:flex">Basel <SwissCross size={14} /></span>
        </span>
        <span className="flex items-center gap-3">
          <LangSwitcher />
          <span aria-hidden className="h-6 w-px bg-rule" />
          <Link href="/vote" className="rounded-control border-[1.5px] border-ink px-3 py-1 font-semibold hover:bg-ink hover:text-sheet">
            <T k="nav.vote" />
          </Link>
        </span>
      </header>

      <section className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <h1 className="display max-w-[16ch] text-3xl sm:text-hero">
            <T k="hero.a" /> <em className="hl italic"><T k="hero.b" /></em>
          </h1>
          <p className="mt-6 max-w-[56ch] text-lg text-graphite">
            <T k="hero.sub" />
          </p>
          <div className="relative mt-10">
            <UrlForm />
          </div>
          <p className="mt-3 text-sm text-graphite">
            <T k="hero.try" />
          </p>
          <div className="mt-2">
            <Limits />
          </div>
        </div>
        <div className="hidden lg:block">
          <ProofCard />
        </div>
      </section>

      <section aria-labelledby="sell" className="mb-14 grid gap-6 rounded-frame bg-ink p-6 text-sheet sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-highlight">
            <SwissCross /> <T k="sell.kicker" />
          </p>
          <h2 id="sell" className="display mt-3 text-2xl sm:text-3xl">
            <T k="sell.title" />
          </h2>
          <p className="mt-3 max-w-[56ch] text-sheet/80">
            <T k="sell.body" />
          </p>
        </div>
        <div className="grid gap-3">
          <Link href="/glow?run=fahrschule-basel-ch&tab=pitch" className="rounded-control bg-highlight px-6 py-3 text-center font-semibold text-ink hover:brightness-95">
            <T k="sell.cta" />
          </Link>
          <p className="text-center text-sm text-sheet/70">
            <T k="sell.note" />
          </p>
        </div>
      </section>

      <section aria-labelledby="diff" className="border-t border-rule py-14">
        <h2 id="diff" className="display max-w-[24ch] text-2xl sm:text-3xl">
          <T k="diff.title" />
        </h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {DIFF.map((n) => (
            <li key={n} className="rounded-frame border border-rule bg-sheet p-6">
              <h3 className="text-lg font-semibold">
                <T k={`diff.${n}t`} />
              </h3>
              <p className="mt-2 text-graphite">
                <T k={`diff.${n}d`} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Samples />

      <section aria-labelledby="method" className="border-t border-rule py-14">
        <h2 id="method" className="display text-2xl">
          <T k="method.title" />
        </h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD.map((n) => (
            <li key={n} className="border-t-[1.5px] border-ink pt-4">
              <span className="display num text-xl">{n}</span>
              <h3 className="mt-2 font-semibold">
                <T k={`m${n}.t`} />
              </h3>
              <p className="mt-1 text-graphite">
                <T k={`m${n}.d`} />
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="learns" className="border-t border-rule py-14">
        <h2 id="learns" className="display text-2xl">
          <T k="learns.title" />
        </h2>
        <p className="mt-2 max-w-[64ch] text-graphite">
          <T k="learns.body" />
        </p>
        <Learning />
      </section>

      <section className="grid items-center gap-6 rounded-frame border border-rule bg-sheet p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <h2 className="display text-2xl">
            <T k="vote.title" />
          </h2>
          <p className="mt-2 max-w-[60ch] text-graphite">
            <T k="vote.body" />
          </p>
          <VoteTally />
        </div>
        <Link href="/vote" className="rounded-control border-[1.5px] border-ink bg-ink px-6 py-3 text-center font-semibold text-sheet hover:bg-graphite">
          <T k="vote.cta" />
        </Link>
      </section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-rule py-8 text-sm text-graphite">
        <span className="flex items-center gap-2">
          <BaselMark size={16} />
          <T k="footer.made" />
        </span>
        <span>
          <T k="footer.note" />
        </span>
      </footer>
    </main>
  );
}
