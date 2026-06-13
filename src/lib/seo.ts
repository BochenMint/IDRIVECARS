/**
 * Buildery danych strukturalnych schema.org (JSON-LD).
 * Wszystkie korzystają z centralnej konfiguracji w `site.ts`.
 */
import { absoluteUrl, siteConfig } from "./site";
import type { TestMeta } from "./content/types";

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;
const PERSON_ID = `${siteConfig.url}/#marcin-bochenek`;

/** Wydawca / marka serwisu. */
export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(siteConfig.logo)
    },
    founder: { "@id": PERSON_ID },
    email: siteConfig.email,
    description: siteConfig.description
  };
}

/** Reprezentacja całej witryny. */
export function websiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: siteConfig.language,
    description: siteConfig.description,
    publisher: { "@id": ORGANIZATION_ID }
  };
}

/** Autor serwisu (Person) — używany na stronie „O mnie” i jako autor artykułów. */
export function personSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: siteConfig.author.name,
    jobTitle: siteConfig.author.jobTitle,
    url: siteConfig.author.url,
    worksFor: { "@id": ORGANIZATION_ID }
  };
}

/** Ścieżka okruszków (breadcrumbs). `items` w kolejności od strony głównej do bieżącej. */
export function breadcrumbSchema(items: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

/** Artykuł / test samochodu — wraz z opisem pojazdu (`about`). */
export function articleSchema(meta: TestMeta, imageUrl: string | null): Record<string, unknown> {
  const url = absoluteUrl(`/testy/${meta.slug}`);
  const vehicleName = [meta.brand, meta.model, meta.version].filter(Boolean).join(" ");

  const car: Record<string, unknown> = {
    "@type": "Car",
    name: vehicleName,
    brand: { "@type": "Brand", name: meta.brand },
    model: meta.model
  };
  if (meta.year) car.modelDate = String(meta.year);
  if (meta.bodyType) car.bodyType = meta.bodyType;
  if (meta.drivetrain) car.driveWheelConfiguration = meta.drivetrain;
  if (meta.engine) {
    car.vehicleEngine = {
      "@type": "EngineSpecification",
      name: meta.engine,
      ...(meta.power ? { enginePower: meta.power } : {}),
      ...(meta.torque ? { torque: meta.torque } : {})
    };
  }
  if (meta.gearbox) car.vehicleTransmission = meta.gearbox;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: meta.title,
    description: meta.lead ?? meta.title,
    ...(imageUrl ? { image: [absoluteUrl(imageUrl)] } : {}),
    datePublished: meta.publishedAt,
    dateModified: meta.publishedAt,
    inLanguage: siteConfig.language,
    author: { "@id": PERSON_ID },
    publisher: { "@id": ORGANIZATION_ID },
    isPartOf: { "@id": WEBSITE_ID },
    about: car,
    ...(meta.tags && meta.tags.length > 0 ? { keywords: meta.tags.join(", ") } : {})
  };
}

/** Pojedynczy news jako NewsArticle. */
export function newsArticleSchema(item: {
  slug: string;
  title: string;
  lead?: string;
  publishedAt: string;
  sourceName?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(`/news/${item.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: item.title,
    ...(item.lead ? { description: item.lead } : {}),
    datePublished: item.publishedAt,
    dateModified: item.publishedAt,
    inLanguage: siteConfig.language,
    publisher: { "@id": ORGANIZATION_ID },
    isPartOf: { "@id": WEBSITE_ID }
  };
}

/** Lista pozycji (CollectionPage / ItemList) — np. spis testów. */
export function itemListSchema(
  items: Array<{ name: string; path: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path)
    }))
  };
}
