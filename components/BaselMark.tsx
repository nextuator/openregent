/** A simplified Basel crosier (Baslerstab) in ink, as a small local mark. Decorative. */
export function BaselMark({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size * 1.4} viewBox="0 0 20 28" className="shrink-0">
      <path
        d="M10 2c3.6 0 6 2.3 6 5.4 0 2.6-1.8 4.3-4 4.6l1.6 2.2H8.9l1.4-2.3C8.5 11.7 7.4 10.6 7.4 9c0-1.6 1.2-2.7 2.7-2.7 1.2 0 2 .7 2 1.6 0 .8-.6 1.3-1.3 1.3-.4 0-.8-.2-1-.5.1 1 .9 1.6 2 1.6 1.7 0 2.8-1.2 2.8-2.9C14.6 5.2 12.7 3.8 10 3.8 7 3.8 4.8 6 4.8 9c0 1.5.5 2.8 1.4 3.8L4.4 14C3.3 12.7 2.8 11 2.8 9.2 2.8 5 5.9 2 10 2Z M9.2 15h1.6v8.2l2.4 1.6v1.4H6.8v-1.4l2.4-1.6Z"
        fill="var(--color-ink)"
      />
    </svg>
  );
}

/** Swiss cross in a red square (the flag), decorative. */
export function SwissCross({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="3" fill="var(--color-redline)" />
      <path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill="var(--color-sheet)" />
    </svg>
  );
}
