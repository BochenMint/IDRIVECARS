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
    <div className="px-gutter pb-20 pt-28">
      <header className="mb-16 border-b border-line pb-10">
        <p className="label-mono mb-4">{tests.length} artykułów</p>
        <h1 className="font-display text-display-lg uppercase">Testy</h1>
      </header>

      {tests.length === 0 ? (
        <p className="text-subtle">Brak artykułów.</p>
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
