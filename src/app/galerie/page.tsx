import Link from "next/link";
import { TestCard } from "@/components/TestCard";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllTests } from "@/lib/content/testy";

export const metadata = {
  title: "Galerie",
  description: "Galerie zdjęć z testów IDRIVECARS."
};

export default async function GalleriesPage() {
  const tests = await getAllTests();
  const withGalleries = tests.filter((t) => Boolean(t.galleryDir));
  const images = await Promise.all(
    withGalleries.map((t) => getFirstGalleryImageSrc(t.galleryDir))
  );

  return (
    <div className="px-gutter pb-20 pt-28">
      <header className="mb-16 border-b border-line pb-10">
        <p className="label-mono mb-4">{withGalleries.length} galerii</p>
        <h1 className="font-display text-display-lg uppercase">Galerie</h1>
      </header>

      <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
        {withGalleries.map((test, i) => (
          <TestCard key={test.slug} test={test} heroImageFallback={images[i] ?? null} variant="grid" />
        ))}
      </div>

      {withGalleries.length === 0 && (
        <p className="text-subtle">
          Uruchom <code className="font-mono text-sm">npm run convert:linked</code> aby wygenerować
          galerie.
        </p>
      )}
    </div>
  );
}
