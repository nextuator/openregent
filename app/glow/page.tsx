import { Suspense } from "react";
import { RunView } from "@/components/RunView";

export default function GlowPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[1280px] px-4 py-10 sm:px-8">Loading…</main>}>
      <RunView />
    </Suspense>
  );
}
