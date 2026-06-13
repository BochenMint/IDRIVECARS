import type { MetadataRoute } from "next";
import { getAllTests } from "@/lib/content/testy";
import { getNewsItems } from "@/lib/content/news";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tests, news] = await Promise.all([getAllTests(), getNewsItems(200)]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/testy", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/galerie", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/news", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/blog", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/o-mnie", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "/kontakt", priority: 0.4, changeFrequency: "yearly" as const }
  ].map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority
  }));

  const testPages: MetadataRoute.Sitemap = tests.map((test) => ({
    url: absoluteUrl(`/testy/${test.slug}`),
    lastModified: new Date(test.publishedAt),
    changeFrequency: "yearly",
    priority: 0.7
  }));

  const newsPages: MetadataRoute.Sitemap = news
    .filter((item) => item.publishedAt)
    .map((item) => ({
      url: absoluteUrl(`/news/${item.slug}`),
      lastModified: new Date(item.publishedAt),
      changeFrequency: "monthly",
      priority: 0.5
    }));

  return [...staticPages, ...testPages, ...newsPages];
}
