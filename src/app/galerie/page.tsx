import type { Metadata } from "next";
import { TestCard } from "@/components/TestCard";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllTests } from "@/lib/content/testy";
import { pageCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Galerie",
  description: "Galerie zdjęć z testów IDRIVECARS — własna fotografia Marcina Bochenka.",
  ...pageCanonical("/galerie")
};

export default async function GalleriesPage() {
  const tests = await getAllTests();
  const withGalleries = tests.filter((t) => Boolean(t.galleryDir));
  const images = await Promise.all(
    withGalleries.map((t) => getFirstGalleryImageSrc(t.galleryDir))
  );

  return (
    <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
      <header className="reveal-section mb-24 border-b border-soft pb-16 md:mb-28 md:pb-20">
        <p className="label-mono mb-8 text-stone-muted">{withGalleries.length} galerii</p>
        <h1 className="font-display display-track text-display-lg uppercase text-ink">
          Galerie
        </h1>
        <p className="mt-8 max-w-md text-lead font-light text-subtle">
          Własna fotografia z każdego testu — bez obróbki agencji, bez stocków.
        </p>
      </header>

      {withGalleries.length === 0 ? (
        <p className="font-light text-subtle">
          Uruchom <code className="font-mono text-sm">npm run convert:linked</code> aby wygenerować
          galerie.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-14 lg:grid-cols-3 lg:gap-10">
          {withGalleries.map((test, i) => (
            <TestCard
              key={test.slug}
              test={test}
              heroImageFallback={images[i] ?? null}
              variant="grid"
            />
          ))}
        </div>
      )}
    </div>
  );
}
