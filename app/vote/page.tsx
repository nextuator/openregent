import Link from "next/link";
import type { Metadata } from "next";
import { VoteView } from "@/components/VoteView";
import { LangSwitcher, T } from "@/lib/i18n";

export const metadata: Metadata = { title: "Vote: which homepage looks better?", robots: { index: false } };

export default function VotePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-3xl">
          <T k="vp.title" />
        </h1>
        <span className="flex flex-wrap items-center gap-2 sm:gap-4">
          <LangSwitcher />
          <Link href="/" className="text-graphite underline underline-offset-4 hover:text-ink">
            <T k="vp.back" />
          </Link>
        </span>
      </div>
      <div className="mt-6">
        <VoteView />
      </div>
    </main>
  );
}
