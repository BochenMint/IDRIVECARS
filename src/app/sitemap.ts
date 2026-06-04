import type { MetadataRoute } from "next";
import { getAllTests } from "@/lib/content/testy";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tests = await getAllTests();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, changeFrequency: "weekly", priority: 1.0, lastModified: new Date() },
    { url: `${SITE_URL}/testy`, changeFrequency: "weekly", priority: 0.9, lastModified: new Date() },
    { url: `${SITE_URL}/galerie`, changeFrequency: "monthly", priority: 0.7, lastModified: new Date() },
    { url: `${SITE_URL}/news`, changeFrequency: "daily", priority: 0.6, lastModified: new Date() },
    { url: `${SITE_URL}/o-mnie`, changeFrequency: "yearly", priority: 0.3, lastModified: new Date() },
    { url: `${SITE_URL}/kontakt`, changeFrequency: "yearly", priority: 0.3, lastModified: new Date() }
  ];

  const testPages: MetadataRoute.Sitemap = tests.map((test) => ({
    url: `${SITE_URL}/testy/${test.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: new Date(test.publishedAt)
  }));

  return [...staticPages, ...testPages];
}
