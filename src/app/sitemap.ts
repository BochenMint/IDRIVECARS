import type { MetadataRoute } from "next";
import { getAllTests } from "@/lib/content/testy";

const BASE_URL = "https://idrivecars.example"; // TODO: podmień na docelową domenę

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tests = await getAllTests();

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/testy",
    "/galerie",
    "/blog",
    "/o-mnie",
    "/kontakt"
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date()
  }));

  const testPages: MetadataRoute.Sitemap = tests.map((test) => ({
    url: `${BASE_URL}/testy/${test.slug}`,
    lastModified: new Date(test.publishedAt)
  }));

  return [...staticPages, ...testPages];
}

