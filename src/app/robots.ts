import type { MetadataRoute } from "next";

const BASE_URL = "https://idrivecars.example"; // TODO: podmień na docelową domenę

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/"
    },
    sitemap: `${BASE_URL}/sitemap.xml`
  };
}

