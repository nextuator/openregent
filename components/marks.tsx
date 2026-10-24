import type { ReactNode } from "react";

/** Hand-drawn highlighter swipe behind a measured fact. Use for measured values only. */
export function Mark({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block px-1 num ${className}`}>
      <svg
        aria-hidden
        className="pointer-events-none absolute -inset-x-0.5 top-[12%] h-[82%] w-[calc(100%+4px)] -z-0"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
      >
        <path
          d="M2.5 4.2 C 18 2.6, 40 3.4, 62 2.4 S 92 2.9, 98.2 3.6 L 97.1 8.5 L 99.3 12.8 L 97.6 17.6 C 76 18.4, 47 16.9, 24 18.1 S 6 17.2, 1.4 17.9 L 3.1 13.1 L 0.8 9.2 Z"
          fill="var(--color-highlight)"
          opacity="0.85"
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

/** Red-pen squiggle under a failed check or a gap. */
export function Squiggle({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block pb-1">
      {children}
      <svg aria-hidden className="pointer-events-none absolute -bottom-0.5 left-0 h-2 w-full" viewBox="0 0 100 8" preserveAspectRatio="none">
        <path
          d="M1 5 C 6 1, 10 1, 14 5 S 22 9, 26 5 S 34 1, 38 5 S 46 9, 50 5 S 58 1, 62 5 S 70 9, 74 5 S 82 1, 86 5 S 94 8, 99 4"
          fill="none"
          stroke="var(--color-redline)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Red margin tick for "change" sentences. */
export function Tick() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0">
      <path d="M2 9.5 L6 13 L14 2.5" fill="none" stroke="var(--color-redline)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
