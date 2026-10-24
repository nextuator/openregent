"use client";

import { useEffect, useRef, useState } from "react";
import { proxyImages } from "@/lib/assemble";

/** A 1440 px wide page, scaled down to fit its box and cropped to the first screen. Not interactive. */
export function Thumb({ html, src, alt }: { html?: string; src?: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1440));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative aspect-[1440/900] w-full overflow-hidden rounded-control border border-rule bg-sheet">
      {html ? (
        <div className="pointer-events-none absolute left-0 top-0" style={{ width: 1440, height: 900, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <iframe title={alt} srcDoc={proxyImages(html)} sandbox="" tabIndex={-1} className="h-full w-full border-0" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" />
      )}
    </div>
  );
}
