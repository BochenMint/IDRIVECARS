import type { MetadataRoute } from "next";
import { getAllArticleMetas } from "@/lib/content/articles";
import { articlePublicPath } from "@/lib/content/categories";
import { getNewsItems } from "@/lib/content/news";
import { buildNewsCanonicalUrl } from "@/lib/news/seo";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, news] = await Promise.all([getAllArticleMetas(), getNewsItems(200)]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, changeFrequency: "weekly", priority: 1.0, lastModified: new Date() },
    { url: `${SITE_URL}/testy`, changeFrequency: "weekly", priority: 0.9, lastModified: new Date() },
    {
      url: `${SITE_URL}/pierwsza-jazda`,
      changeFrequency: "weekly",
      priority: 0.85,
      lastModified: new Date()
    },
    { url: `${SITE_URL}/galerie`, changeFrequency: "monthly", priority: 0.7, lastModified: new Date() },
    { url: `${SITE_URL}/news`, changeFrequency: "daily", priority: 0.6, lastModified: new Date() },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.5, lastModified: new Date() },
    { url: `${SITE_URL}/felieton`, changeFrequency: "weekly", priority: 0.5, lastModified: new Date() },
    { url: `${SITE_URL}/o-mnie`, changeFrequency: "yearly", priority: 0.3, lastModified: new Date() },
    { url: `${SITE_URL}/kontakt`, changeFrequency: "yearly", priority: 0.3, lastModified: new Date() },
    {
      url: `${SITE_URL}/polityka-prywatnosci`,
      changeFrequency: "yearly",
      priority: 0.2,
      lastModified: new Date()
    },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2, lastModified: new Date() }
  ];

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}${articlePublicPath(article.category, article.slug)}`,
    changeFrequency: "monthly",
    priority: article.category === "test" ? 0.7 : 0.65,
    lastModified: new Date(article.updatedAt ?? article.publishedAt)
  }));

  const newsPages: MetadataRoute.Sitemap = news.map((item) => ({
    url: item.canonicalUrl ?? buildNewsCanonicalUrl(item.slug),
    changeFrequency: "daily",
    priority: 0.55,
    lastModified: new Date(item.publishedAt)
  }));

  return [...staticPages, ...articlePages, ...newsPages];
}
