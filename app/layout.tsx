import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import { APP_NAME, APP_URL } from "@/lib/config";
import "./globals.css";

const sans = Instrument_Sans({ variable: "--gl-sans", subsets: ["latin"], axes: ["wdth"] });
const serif = Instrument_Serif({ variable: "--gl-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: `${APP_NAME}: show any local business its better website`,
  description:
    "Paste a website. We measure its design, set target marks, build design tokens and redesign the homepage, a post and a slide from them.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
