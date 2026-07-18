/**
 * schema.org JSON-LD builders.
 * All use central configuration from `site.ts`.
 */
import { absoluteUrl, siteConfig } from './site';

const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
const WEBSITE_ID = `${siteConfig.url}/#website`;
const PERSON_ID = `${siteConfig.url}/#marcin-bochenek`;

export type TestMeta = {
  slug: string;
  title: string;
  brand: string;
  model: string;
  generation?: string;
  year?: number;
  version?: string;
  publishedAt: string;
  lead?: string;
  originalUrl?: string;
  heroImage?: string;
  galleryDir?: string;
  tags?: string[];
  bodyType?: string;
  drivetrain?: string;
  engine?: string;
  power?: string;
  torque?: string;
  gearbox?: string;
  rating?: number;
};

/** Publisher / brand of the site. */
export function organizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(siteConfig.logo),
    },
    founder: { '@id': PERSON_ID },
    email: siteConfig.email,
    description: siteConfig.description,
  };
}

/** Representation of the entire website. */
export function websiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: siteConfig.language,
    description: siteConfig.description,
    publisher: { '@id': ORGANIZATION_ID },
  };
}

/** Site author (Person) — used on About page and as article author. */
export function personSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: siteConfig.author.name,
    jobTitle: siteConfig.author.jobTitle,
    url: siteConfig.author.url,
    worksFor: { '@id': ORGANIZATION_ID },
  };
}

/** Breadcrumb trail. `items` ordered from homepage to current page. */
export function breadcrumbSchema(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function buildCarEntity(meta: TestMeta): Record<string, unknown> {
  const vehicleName = [meta.brand, meta.model, meta.version].filter(Boolean).join(' ');

  const car: Record<string, unknown> = {
    '@type': 'Car',
    name: vehicleName,
    brand: { '@type': 'Brand', name: meta.brand },
    model: meta.model,
  };
  if (meta.year) car.modelDate = String(meta.year);
  if (meta.bodyType) car.bodyType = meta.bodyType;
  if (meta.drivetrain) car.driveWheelConfiguration = meta.drivetrain;
  if (meta.engine) {
    car.vehicleEngine = {
      '@type': 'EngineSpecification',
      name: meta.engine,
      ...(meta.power ? { enginePower: meta.power } : {}),
      ...(meta.torque ? { torque: meta.torque } : {}),
    };
  }
  if (meta.gearbox) car.vehicleTransmission = meta.gearbox;
  return car;
}

/** Article / car test — includes vehicle description (`about`). */
export function articleSchema(meta: TestMeta, imageUrl: string | null): Record<string, unknown> {
  const url = absoluteUrl(`/testy/${meta.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: meta.title,
    description: meta.lead ?? meta.title,
    ...(imageUrl ? { image: [absoluteUrl(imageUrl)] } : {}),
    datePublished: meta.publishedAt,
    dateModified: meta.publishedAt,
    inLanguage: siteConfig.language,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORGANIZATION_ID },
    isPartOf: { '@id': WEBSITE_ID },
    about: buildCarEntity(meta),
    ...(meta.tags && meta.tags.length > 0 ? { keywords: meta.tags.join(', ') } : {}),
  };
}

/** Review schema for tests with ratings — Review + aggregateRating when rating present. */
export function reviewSchema(meta: TestMeta, imageUrl: string | null): Record<string, unknown> {
  const url = absoluteUrl(`/testy/${meta.slug}`);
  const car = buildCarEntity(meta);

  const review: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: meta.title,
    description: meta.lead ?? meta.title,
    ...(imageUrl ? { image: [absoluteUrl(imageUrl)] } : {}),
    datePublished: meta.publishedAt,
    inLanguage: siteConfig.language,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORGANIZATION_ID },
    itemReviewed: car,
  };

  if (meta.rating != null) {
    review.reviewRating = {
      '@type': 'Rating',
      ratingValue: meta.rating,
      bestRating: 10,
      worstRating: 1,
    };
    review.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: meta.rating,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 1,
    };
  }

  return review;
}

/** Single news item as NewsArticle. */
export function newsArticleSchema(item: {
  slug: string;
  title: string;
  lead?: string;
  publishedAt: string;
  sourceName?: string;
}): Record<string, unknown> {
  const url = absoluteUrl(`/news/${item.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: item.title,
    ...(item.lead ? { description: item.lead } : {}),
    datePublished: item.publishedAt,
    dateModified: item.publishedAt,
    inLanguage: siteConfig.language,
    publisher: { '@id': ORGANIZATION_ID },
    isPartOf: { '@id': WEBSITE_ID },
    ...(item.sourceName
      ? {
          isBasedOn: {
            '@type': 'CreativeWork',
            name: item.sourceName,
          },
        }
      : {}),
  };
}

/** Item list — e.g. test index. */
export function itemListSchema(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}
