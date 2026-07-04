import { getAllNewsItems } from "@/lib/content/news";
import type { NewsStatus } from "@/lib/content/types-news";
import { loadNewsIndex, loadRawRecord } from "./store";
import type { NewsImageAsset, NewsPipelineStatus } from "./types";

export type NewsReviewKind = "raw" | "mdx";

export type NewsReviewItem = {
  id: string;
  kind: NewsReviewKind;
  title: string;
  status: NewsPipelineStatus | NewsStatus;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  fetchedAt?: string;
  lead?: string;
  images: NewsImageAsset[];
  storagePath?: string;
  slug?: string;
};

export type NewsReviewSummary = {
  raw: number;
  needsAiDraft: number;
  draft: number;
  review: number;
  published: number;
  rejected: number;
};

const REVIEW_STATUSES = new Set<NewsPipelineStatus | NewsStatus>([
  "raw",
  "needs-ai-draft",
  "draft",
  "review"
]);

export async function getNewsReviewItems(limit = 100): Promise<NewsReviewItem[]> {
  const [rawItems, mdxItems] = await Promise.all([
    getRawReviewItems(limit),
    getMdxReviewItems(limit)
  ]);

  return [...rawItems, ...mdxItems]
    .sort((a, b) => {
      const aDate = a.fetchedAt ?? a.publishedAt;
      const bDate = b.fetchedAt ?? b.publishedAt;
      return bDate.localeCompare(aDate);
    })
    .slice(0, limit);
}

export async function getNewsReviewSummary(): Promise<NewsReviewSummary> {
  const [items, allNews] = await Promise.all([getNewsReviewItems(500), getAllNewsItems(500)]);
  return {
    raw: items.filter((item) => item.status === "raw").length,
    needsAiDraft: items.filter((item) => item.status === "needs-ai-draft").length,
    draft: items.filter((item) => item.status === "draft").length,
    review: items.filter((item) => item.status === "review").length,
    published: allNews.filter((item) => item.status === "published").length,
    rejected: allNews.filter((item) => item.status === "rejected").length
  };
}

async function getRawReviewItems(limit: number): Promise<NewsReviewItem[]> {
  const index = await loadNewsIndex();
  const out: NewsReviewItem[] = [];

  for (const entry of index.entries) {
    if (out.length >= limit) break;
    if (!REVIEW_STATUSES.has(entry.status)) continue;

    const record = await loadRawRecord(entry.storagePath);
    if (!record) continue;

    out.push({
      id: record.id,
      kind: "raw",
      title: record.title,
      status: record.status,
      sourceName: record.sourceName,
      sourceUrl: record.sourceUrl,
      publishedAt: record.publishedAt,
      fetchedAt: record.fetchedAt,
      lead: record.lead,
      images: record.images,
      storagePath: record.storagePath
    });
  }

  return out;
}

async function getMdxReviewItems(limit: number): Promise<NewsReviewItem[]> {
  const items = await getAllNewsItems(limit);
  return items
    .filter((item) => REVIEW_STATUSES.has(item.status ?? "published"))
    .map((item) => ({
      id: item.slug,
      kind: "mdx" as const,
      title: item.title,
      status: item.status ?? "published",
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
      lead: item.lead,
      images: item.image ? [{ url: item.image }] : [],
      slug: item.slug,
      storagePath: `content/news/${item.slug}.mdx`
    }));
}
