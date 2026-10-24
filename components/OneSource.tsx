"use client";

import type { Run } from "./RunView";

export function OneSource({ run }: { run: Run }) {
  return <p className="text-graphite">The post and slide for {run.direction?.brand.name} appear here.</p>;
}
