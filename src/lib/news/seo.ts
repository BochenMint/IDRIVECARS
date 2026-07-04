import type { NewsItem } from "@/lib/content/types-news";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export type NewsArticleSchema = {
  "@context": "https://schema.org";
  "@type": "NewsArticle";
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  author: { "@type": "Person"; name: string; url: string };
  publisher: {
    "@type": "Organization";
    name: string;
    url: string;
  };
  mainEntityOfPage: string;
  image?: string[];
  isBasedOn?: string;
};

export function buildNewsArticleJsonLd(item: NewsItem): NewsArticleSchema {
  const pageUrl = `${SITE_URL}/news/${item.slug}`;
  const schema: NewsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    description: item.lead,
    datePublished: item.publishedAt,
    dateModified: item.publishedAt,
    author: {
      "@type": "Person",
      name: "Marcin Bochenek",
      url: `${SITE_URL}/o-mnie`
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL
    },
    mainEntityOfPage: pageUrl,
    isBasedOn: item.sourceUrl
  };
  if (item.image) {
    const img = item.image.startsWith("http") ? item.image : `${SITE_URL}${item.image}`;
    schema.image = [img];
  }
  return schema;
}

export function buildNewsCanonicalUrl(slug: string): string {
  return `${SITE_URL}/news/${slug}`;
}
