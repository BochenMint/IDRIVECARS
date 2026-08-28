import type { Metadata } from "next";
import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS
} from "@/lib/site";

/** Kanoniczny URL strony statycznej (względny — rozwiązywany przez metadataBase). */
export function pageCanonical(path: string): Pick<Metadata, "alternates"> {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return { alternates: { canonical: normalized } };
}

const ORG_ID = `${SITE_URL}/#organization`;
const AUTHOR_ID = `${SITE_URL}/#author`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const LOGO_URL = `${SITE_URL}/idrivecars-logo-dark.png`;

/** Dekoduje najczęstsze encje HTML (również podwójnie zakodowane w treści). */
function decodeEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/**
 * Markdown/HTML → czysty tekst do wyświetlania w podglądach (karty, leady).
 * Nie zmienia treści merytorycznej — usuwa tylko znaczniki i składnię formatowania.
 */
export function toPlainText(
  input: string | undefined | null,
  maxLength?: number
): string {
  if (!input || !input.trim()) return "";

  let text = input;
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/^[\s>#]+/gm, " ");
  text = text.replace(/[*_`~]+/g, "");
  text = text.replace(/\s+/g, " ").trim();

  if (!maxLength || text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated;
  return `${base.replace(/[\s.,;:–-]+$/, "")}…`;
}

/**
 * Czyści dowolny tekst (markdown/HTML) do płaskiej meta-description.
 * Usuwa znaczniki, linki, nagłówki i emfazę, skleja białe znaki i przycina
 * do `maxLength` na granicy słowa. Pusty wejściowy tekst → domyślny opis witryny.
 */
export function toMetaDescription(
  input: string | undefined | null,
  maxLength = 160
): string {
  const plain = toPlainText(input);
  if (!plain) return SITE_DESCRIPTION;
  return toPlainText(plain, maxLength);
}

/** Zamienia ścieżkę lub względny adres na bezwzględny URL (dla OG / JSON-LD). */
export function absoluteUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path}`;
}

/** Węzeł Organization (wydawca) — referowany przez @id w innych węzłach. */
export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: LOGO_URL,
      width: 1880,
      height: 1574
    },
    ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {})
  };
}

/** Węzeł Person (autor) — E-E-A-T, referowany przez @id. */
export function personNode() {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: SITE_AUTHOR.name,
    url: SITE_AUTHOR.url,
    jobTitle: "Dziennikarz motoryzacyjny",
    worksFor: { "@id": ORG_ID },
    ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {})
  };
}

/** Węzeł WebSite — referowany przez @id. */
export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "pl-PL",
    publisher: { "@id": ORG_ID }
  };
}

/** Węzeł BreadcrumbList z listy { name, url }. */
export function breadcrumbNode(items: Array<{ name: string; url: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url
    }))
  };
}

/** Węzeł ItemList (np. indeks testów) z listy { name, url }. */
export function itemListNode(
  items: Array<{ name: string; url: string }>,
  name?: string
) {
  return {
    "@type": "ItemList",
    ...(name ? { name } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url
    }))
  };
}

type ArticleNodeInput = {
  title: string;
  description: string;
  url: string;
  category?: string;
  schemaType?: "BlogPosting" | "NewsArticle" | "Article";
  brand?: string;
  model?: string;
  year?: number;
  bodyType?: string;
  engine?: string;
  tags?: string[];
  publishedAt: string;
  modifiedAt?: string;
  image?: string;
  authorName?: string;
};

/**
 * Węzeł Article/BlogPosting/NewsArticle — z encją Car w polu about dla testów.
 */
export function articleNode(input: ArticleNodeInput) {
  const carName = [input.brand, input.model].filter(Boolean).join(" ").trim();
  const schemaType = input.schemaType ?? "BlogPosting";
  const section =
    input.category === "pierwsza-jazda"
      ? "Pierwsza jazda"
      : input.category === "blog"
        ? "Blog"
        : input.category === "felieton"
          ? "Felietony"
          : input.category === "news"
            ? "News"
            : "Testy";

  return {
    "@type": schemaType,
    "@id": `${input.url}#article`,
    isPartOf: { "@id": WEBSITE_ID },
    headline: input.title.slice(0, 110),
    name: input.title,
    description: input.description,
    inLanguage: "pl-PL",
    datePublished: input.publishedAt,
    dateModified: input.modifiedAt ?? input.publishedAt,
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : { "@id": AUTHOR_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    url: input.url,
    articleSection: section,
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.tags && input.tags.length ? { keywords: input.tags.join(", ") } : {}),
    ...(carName
      ? {
          about: {
            "@type": "Car",
            name: carName,
            ...(input.brand ? { brand: { "@type": "Brand", name: input.brand } } : {}),
            ...(input.model ? { model: input.model } : {}),
            ...(input.year ? { productionDate: String(input.year) } : {}),
            ...(input.bodyType ? { bodyType: input.bodyType } : {}),
            ...(input.engine
              ? { vehicleEngine: { "@type": "EngineSpecification", name: input.engine } }
              : {})
          }
        }
      : {})
  };
}

/** Skrót dla newsów RSS — NewsArticle bez encji Car. */
export function newsArticleNode(
  input: Omit<ArticleNodeInput, "schemaType" | "brand" | "model" | "year" | "bodyType" | "engine">
) {
  return articleNode({ ...input, category: "news", schemaType: "NewsArticle" });
}

/** Owija węzły schema.org w pojedynczy graf JSON-LD (rozwiązuje referencje @id). */
export function jsonLdGraph(...nodes: Array<object | null | undefined>) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean)
  };
}

/** Serializuje JSON-LD do bezpiecznego wstrzyknięcia w <script>. */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
