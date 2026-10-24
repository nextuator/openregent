"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

type L = { ipUsed: number; ipLimit: number };

/** Shows how many live glow-ups this visitor has left today. */
export function Limits() {
  const [l, setL] = useState<L | null>(null);
  const t = useT();
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
      {left > 0 ? t("limits.left", { n: left, max: l.ipLimit }) : t("limits.none", { max: l.ipLimit })}
    </p>
  );
}
