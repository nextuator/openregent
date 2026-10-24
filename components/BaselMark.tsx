/* Basel motifs, drawn in code. We use the flag form (black Baslerstab on a white square), which anyone may use,
   not the cantonal coat of arms in its shield form, which Swiss law reserves for the canton. */

/** The Baslerstab (crozier) alone, in the given colour. */
export function Baslerstab({ size = 24, color = "var(--color-ink)", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={`shrink-0 ${className}`}>
      {/* crook */}
      <path d="M50 44 V30 C50 14 76 12 74 30 C73 40 61 41 60 33" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      {/* knot */}
      <path d="M36 47 L50 40 L64 47 L57 52 L50 49 L43 52 Z" fill={color} />
      {/* shaft */}
      <rect x="45.5" y="50" width="9" height="28" fill={color} />
      {/* foot with three points */}
      <path d="M38 77 H62 L59 85 L54.5 81 L50 92 L45.5 81 L41 85 Z" fill={color} />
    </svg>
  );
}

/** The Basel flag: black Baslerstab on a white square with a fine black frame. */
export function BaselMark({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0 border-[1.5px] border-ink bg-sheet" style={{ width: size, height: size }} aria-hidden>
      <Baslerstab size={size - 3} />
    </span>
  );
}

/** Swiss cross on red, the flag form. Decorative. */
export function SwissCross({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" fill="var(--color-redline)" />
      <path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill="#ffffff" />
    </svg>
  );
}

/** A solid Basel-black rule under the header. */
export function BaselBand() {
  return <div aria-hidden className="h-[3px] w-full bg-ink" />;
}
