import Link from "next/link";
import { Learning } from "@/components/Learning";
import { Limits } from "@/components/Limits";
import { ProofCard } from "@/components/ProofCard";
import { Samples } from "@/components/Samples";
import { VoteTally } from "@/components/VoteTally";
import { UrlForm } from "@/components/UrlForm";

const METHOD = [
  { n: 1, t: "Audit", d: "We open the real site and count every colour, font, radius and shadow in its CSS." },
  { n: 2, t: "Target marks", d: "Seven axes, from warm to cool and dense to airy: where it is now, where it should go." },
  { n: 3, t: "Design tokens", d: "One small set of colours, fonts and spacing, checked for contrast in code." },
  { n: 4, t: "One source", d: "A redesigned homepage, a post and a slide, all from the same tokens." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
      <header className="flex items-baseline justify-between border-b border-rule py-5">
        <span className="display text-xl">Glowup</span>
        <Link href="/vote" className="text-graphite underline-offset-4 hover:text-ink hover:underline">
          Vote
        </Link>
      </header>

      <section className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.35fr_1fr]">
        <div>
        <h1 className="display max-w-[16ch] text-3xl sm:text-hero">
          Show any local business its <em className="hl italic">better website.</em>
        </h1>
        <p className="mt-6 max-w-[56ch] text-lg text-graphite">
          Paste the address of a shop, café or practice. Glowup measures its design from the real CSS, sets a direction and redesigns it, in about a minute.
        </p>
        <div className="relative mt-10">
          <UrlForm />
        </div>
        <div className="mt-4">
          <Limits />
        </div>
        </div>
        <div className="hidden lg:block">
          <ProofCard />
        </div>
      </section>

      <section aria-labelledby="method" className="border-t border-rule py-14">
        <h2 id="method" className="display text-2xl">
          The method
        </h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD.map((m) => (
            <li key={m.n} className="border-t-[1.5px] border-ink pt-4">
              <span className="display num text-xl">{m.n}</span>
              <h3 className="mt-2 font-semibold">{m.t}</h3>
              <p className="mt-1 text-graphite">{m.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <Samples />

      <section aria-labelledby="learns" className="border-t border-rule py-14">
        <h2 id="learns" className="display text-2xl">
          It learns from your votes
        </h2>
        <p className="mt-2 max-w-[64ch] text-graphite">
          Every redesign follows one of seven art directions. Each blind vote is an A/B test: did this direction beat the real site? A Thompson-sampling bandit
          picks directions that win more often, and the art director sees the results, so new glow-ups get better with every vote.
        </p>
        <Learning />
      </section>

      <section className="grid items-center gap-6 rounded-frame border border-rule bg-sheet p-6 sm:grid-cols-[1fr_auto] sm:p-8">
        <div>
          <h2 className="display text-2xl">Real site or redesign?</h2>
          <p className="mt-2 max-w-[60ch] text-graphite">Two homepages of the same business, side by side. One is real, one is a Glowup concept. Vote for the one that looks better.</p>
          <VoteTally />
        </div>
        <Link href="/vote" className="rounded-control border-[1.5px] border-ink bg-ink px-6 py-3 text-center font-semibold text-sheet hover:bg-graphite">
          Start voting
        </Link>
      </section>

      <footer className="mt-16 flex flex-wrap items-baseline justify-between gap-4 border-t border-rule py-8 text-sm text-graphite">
        <span>
          <span className="display text-base text-ink">Glowup</span> · Vibe Code Fest Basel 2026
        </span>
        <span>Concept redesigns only. Not affiliated with the businesses shown.</span>
      </footer>
    </main>
  );
}
