import { UrlForm } from "@/components/UrlForm";
import { Gallery } from "@/components/Gallery";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-16 sm:px-8 sm:py-24">
      <h1 className="display max-w-[14ch] text-3xl sm:text-hero">Show any local business its better website.</h1>
      <div className="relative mt-10">
        <UrlForm />
      </div>
      <p className="mt-4 text-graphite">Try a bakery, a bike shop or a dentist in Basel.</p>

      <section className="mt-24" aria-labelledby="saved">
        <h2 id="saved" className="display text-2xl">
          Saved glow-ups
        </h2>
        <Gallery />
      </section>
    </main>
  );
}
