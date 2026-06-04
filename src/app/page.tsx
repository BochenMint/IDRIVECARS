import type { Metadata } from "next";
import Link from "next/link";
import { TestCard } from "@/components/TestCard";
import { getGalleryImages } from "@/lib/content/gallery";
import { getAllTests } from "@/lib/content/testy";
import { jsonLdGraph, jsonLdScript, organizationNode, personNode, websiteNode } from "@/lib/seo";
import { FEATURED_HERO_IMAGE_OVERRIDES, FEATURED_TEST_SLUGS, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "IDRIVECARS — autorskie testy samochodów i pierwsze jazdy" },
  description: SITE_DESCRIPTION
};

export default async function HomePage() {
  const tests = await getAllTests();
  const bySlug = new Map(tests.map((t) => [t.slug, t]));

  const withImages = await Promise.all(
    tests.map(async (test) => {
      const images = await getGalleryImages(test.galleryDir);
      return {
        test,
        image: images[0]?.src ?? null,
        galleryImageCount: images.length
      };
    })
  );
  const featuredCandidates = FEATURED_TEST_SLUGS.map((slug) => {
    const test = bySlug.get(slug);
    if (!test) return null;
    const row = withImages.find((t) => t.test.slug === slug);
    const image = FEATURED_HERO_IMAGE_OVERRIDES[slug] ?? row?.image;
    if (!image) return null;
    return { test, image, galleryImageCount: row?.galleryImageCount ?? 0 };
  }).filter(Boolean) as Array<{
    test: (typeof tests)[0];
    image: string;
    galleryImageCount: number;
  }>;

  const featured = featuredCandidates[0] ?? null;
  const gridItems = featuredCandidates.slice(1);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(jsonLdGraph(organizationNode(), websiteNode(), personNode()))
        }}
      />
      {featured && (
        <TestCard
          test={featured.test}
          heroImageFallback={featured.image}
          variant="hero"
          galleryImageCount={featured.galleryImageCount}
        />
      )}

      <section className="reveal-section-delayed bg-canvas px-gutter pb-section pt-32 md:pt-40">
        <div className="mb-20 flex flex-col gap-6 border-b border-soft pb-12 sm:flex-row sm:items-end sm:justify-between md:mb-28 md:pb-14">
          <div className="space-y-4">
            <p className="label-mono text-stone-muted">Indeks</p>
            <h2 className="font-display display-track text-display-lg uppercase text-ink">Wybrane testy</h2>
          </div>
          <Link
            href="/testy"
            className="label-mono nav-link shrink-0 self-start text-stone-muted sm:self-auto"
          >
            Wszystkie ({tests.length})
          </Link>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-16 lg:grid-cols-3 lg:gap-x-12 lg:gap-y-20">
          {gridItems.map(({ test, image, galleryImageCount }) => (
            <div key={test.slug} className="max-w-md sm:max-w-none">
              <TestCard
                test={test}
                heroImageFallback={image}
                variant="grid"
                galleryImageCount={galleryImageCount}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
