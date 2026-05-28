import Link from "next/link";
import { TestCard } from "@/components/TestCard";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllTests } from "@/lib/content/testy";

export default async function HomePage() {
  const tests = await getAllTests();
  const withImages = await Promise.all(
    tests.map(async (test) => ({
      test,
      image: await getFirstGalleryImageSrc(test.galleryDir)
    }))
  );

  const featured =
    withImages.find((t) => t.image) ?? { test: tests[0], image: null };
  const rest = withImages.filter((t) => t.test.slug !== featured.test.slug).slice(0, 8);

  return (
    <>
      {featured.test && (
        <TestCard
          test={featured.test}
          heroImageFallback={featured.image}
          variant="hero"
        />
      )}

      <section className="px-gutter py-20">
        <div className="mb-12 flex items-end justify-between gap-4 border-b border-line pb-6">
          <h2 className="font-display text-display-lg uppercase">Archiwum</h2>
          <Link href="/testy" className="label-mono editorial-link shrink-0">
            Wszystkie ({tests.length})
          </Link>
        </div>

        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {rest.map(({ test, image }) => (
            <TestCard key={test.slug} test={test} heroImageFallback={image} variant="grid" />
          ))}
        </div>
      </section>
    </>
  );
}
