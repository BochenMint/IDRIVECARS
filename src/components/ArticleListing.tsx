import { TestCard } from "@/components/TestCard";
import { AdSlot } from "@/components/AdSlot";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import type { ArticleCategory } from "@/lib/content/categories";
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, categoryListingPath } from "@/lib/content/categories";
import { getAllArticleMetas } from "@/lib/content/articles";

type ArticleListingProps = {
  category: ArticleCategory;
};

export async function ArticleListing({ category }: ArticleListingProps) {
  const articles = await getAllArticleMetas({ category });
  const heroFallbacks = await Promise.all(
    articles.map((t) => getFirstGalleryImageSrc(t.galleryDir))
  );

  const label = CATEGORY_LABELS[category];
  const description = CATEGORY_DESCRIPTIONS[category];
  const listingPath = categoryListingPath(category);

  return (
    <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
      <header className="reveal-section mb-20 border-b border-soft pb-16 md:mb-28 md:pb-20">
        <p className="label-mono mb-8">{articles.length} artykułów</p>
        <h1 className="font-display display-track text-display-lg uppercase text-ink">{label}</h1>
        <p className="mt-8 max-w-md text-lead font-light text-subtle">{description}</p>
      </header>

      {articles.length === 0 ? (
        <p className="font-light text-subtle">Brak opublikowanych artykułów w tej kategorii.</p>
      ) : (
        <div>
          {articles.map((test, i) => (
            <div key={test.slug}>
              <TestCard
                test={test}
                heroImageFallback={heroFallbacks[i] ?? null}
                variant="row"
                index={i}
              />
              {i > 0 && (i + 1) % 8 === 0 && (
                <div className="my-16 flex justify-center border-y border-soft py-12">
                  <AdSlot
                    slotId="between-cards"
                    format="medium-rectangle"
                    slotIndex={Math.floor(i / 8)}
                    pageKey={`${listingPath}#${i}`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
