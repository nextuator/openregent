import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { APP_NAME, APP_URL } from "@/lib/config";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const sans = Inter({ variable: "--gl-sans", subsets: ["latin"] });
const serif = Fraunces({ variable: "--gl-serif", subsets: ["latin"], axes: ["opsz", "SOFT"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: `${APP_NAME}: show any local business its better website`,
  description:
    "Paste a website. We measure its design, set target marks, build design tokens and redesign the homepage, a post and a slide from them.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
