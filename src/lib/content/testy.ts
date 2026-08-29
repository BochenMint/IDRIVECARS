import type { GalleryImage } from "./gallery";
import type { Article, ArticleMeta } from "./types-article";
import {
  estimateReadingMinutes,
  getAllArticleMetas,
  getAllArticleSlugs,
  getArticleBySlug,
  getRelatedArticlesByBrand
} from "./articles";

export type { ArticleMeta as TestMeta, Article as Test } from "./types-article";

/** Wstawia pojedyncze zdjęcia z galerii co kilka akapitów w HTML treści (max 4 zdjęcia). */
export function injectInlineGalleryImages(
  contentHtml: string,
  images: GalleryImage[],
  options: { everyNParagraphs?: number; maxImages?: number } = {}
): string {
  const { everyNParagraphs = 2, maxImages = 4 } = options;
  if (images.length === 0) return contentHtml;

  const regex = /<\/p>/g;
  let result = contentHtml;
  let paragraphIndex = 0;
  let imagesUsed = 0;
  let offset = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(contentHtml)) !== null) {
    paragraphIndex++;
    if (
      paragraphIndex % everyNParagraphs === 0 &&
      imagesUsed < maxImages &&
      images[imagesUsed]
    ) {
      const img = images[imagesUsed];
      const responsiveAttrs = img.srcSet
        ? ` srcset="${escapeHtml(img.srcSet)}" sizes="${escapeHtml(img.sizes ?? "100vw")}"`
        : "";
      const figureHtml = `<figure class="article-inline-image my-10"><img src="${img.src}"${responsiveAttrs} alt="${escapeHtml(img.alt)}" loading="lazy" decoding="async" class="w-full" /></figure>`;
      result =
        result.slice(0, match.index + offset + 4) +
        figureHtml +
        result.slice(match.index + offset + 4);
      offset += figureHtml.length;
      imagesUsed++;
    }
  }

  return result;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function getAllTestSlugs(): Promise<string[]> {
  return getAllArticleSlugs({
    category: undefined,
    includeDrafts: false
  });
}

export { estimateReadingMinutes };

export async function getRelatedTestsByBrand(
  slug: string,
  brand: string,
  limit = 3
): Promise<ArticleMeta[]> {
  return getRelatedArticlesByBrand(slug, brand, limit);
}

export async function getAllTests(): Promise<ArticleMeta[]> {
  const all = await getAllArticleMetas();
  return all.filter((a) => a.contentDir === "testy");
}

export async function getTestBySlug(slug: string): Promise<Article> {
  const article = await getArticleBySlug(slug, "testy");
  if (!article) {
    throw new Error(`Nie znaleziono testu: ${slug}`);
  }
  return article;
}
