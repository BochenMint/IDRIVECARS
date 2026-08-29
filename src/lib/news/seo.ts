import type { Metadata } from "next";
import type { NewsItem } from "@/lib/content/types-news";
import { absoluteUrl, toMetaDescription, toPlainText } from "@/lib/seo";
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
    description: toPlainText(item.lead),
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

/** Metadata (canonical, OG, Twitter) dla strony /news/[slug]. */
export function buildNewsMetadata(item: NewsItem): Metadata {
  const pageUrl = item.canonicalUrl ?? buildNewsCanonicalUrl(item.slug);
  const title = item.seoTitle ?? `${item.title} | News`;
  const description = toMetaDescription(item.seoDescription ?? item.lead);
  const imageUrl = item.image ? absoluteUrl(item.image) : undefined;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "article",
      locale: "pl_PL",
      siteName: SITE_NAME,
      publishedTime: item.publishedAt,
      modifiedTime: item.publishedAt,
      ...(imageUrl && {
        images: [{ url: imageUrl, alt: item.title }]
      })
    },
    twitter: {
      card: (imageUrl ? "summary_large_image" : "summary") as "summary_large_image" | "summary",
      title,
      description,
      ...(imageUrl && { images: [imageUrl] })
    },
    robots: item.status === "published" ? { index: true, follow: true } : { index: false, follow: false }
  };
}
