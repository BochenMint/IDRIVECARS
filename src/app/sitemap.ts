import type { MetadataRoute } from "next";
import { getAllTests } from "@/lib/content/testy";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tests = await getAllTests();

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/testy",
    "/galerie",
    "/o-mnie",
    "/kontakt"
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date()
  }));

  const testPages: MetadataRoute.Sitemap = tests.map((test) => ({
    url: `${SITE_URL}/testy/${test.slug}`,
    lastModified: new Date(test.publishedAt)
  }));

  return [...staticPages, ...testPages];
}

