import Link from "next/link";
import type { Metadata } from "next";
import { VoteView } from "@/components/VoteView";

export const metadata: Metadata = { title: "Vote: which homepage looks better?", robots: { index: false } };

export default function VotePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="display text-3xl">Which homepage looks better?</h1>
        <Link href="/" className="text-graphite underline underline-offset-4 hover:text-ink">
          Back to Glowup
        </Link>
      </div>
      <div className="mt-6">
        <VoteView />
      </div>
    </main>
  );
}
