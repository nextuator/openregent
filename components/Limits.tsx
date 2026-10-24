"use client";

import { useEffect, useState } from "react";

type L = { ipUsed: number; ipLimit: number };

/** Shows how many live glow-ups this visitor has left today. */
export function Limits() {
  const [l, setL] = useState<L | null>(null);
  useEffect(() => {
    fetch("/api/limits", { cache: "no-store" })
      .then((r) => r.json())
      .then(setL)
      .catch(() => setL(null));
  }, []);
  if (!l) return null;
  const left = Math.max(0, l.ipLimit - l.ipUsed);
  return (
    <p className="text-graphite">
      {left > 0 ? (
        <>
          You have <span className="num font-semibold text-ink">{left}</span> of {l.ipLimit} live glow-ups left today. Each website can be glowed up at most 3 times.
        </>
      ) : (
        <>You&apos;ve used your {l.ipLimit} live glow-ups for today. The vote is always open.</>
      )}
    </p>
  );
}
