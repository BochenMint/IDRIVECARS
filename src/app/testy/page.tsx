import { TestCard } from "@/components/TestCard";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllTests } from "@/lib/content/testy";

export const metadata = {
  title: "Testy",
  description: "Autorskie testy samochodów Marcina Bochenka."
};

export default async function TestsPage() {
  const tests = await getAllTests();
  const heroFallbacks = await Promise.all(
    tests.map((t) => getFirstGalleryImageSrc(t.galleryDir))
  );

  return (
    <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
      <header className="reveal-section mb-20 border-b border-soft pb-16 md:mb-28 md:pb-20">
        <p className="label-mono mb-8 text-stone-muted">{tests.length} artykułów</p>
        <h1 className="font-display display-track text-display-lg uppercase text-ink">
          Testy
        </h1>
        <p className="mt-8 max-w-md text-lead font-light text-subtle">
          Indeks autorskich testów — od pierwszej jazdy po dłuższą relację z auta.
        </p>
      </header>

      {tests.length === 0 ? (
        <p className="font-light text-subtle">Brak artykułów.</p>
      ) : (
        <div>
          {tests.map((test, i) => (
            <TestCard
              key={test.slug}
              test={test}
              heroImageFallback={heroFallbacks[i] ?? null}
              variant="row"
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
