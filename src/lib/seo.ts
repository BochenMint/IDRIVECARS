import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SOCIAL_LINKS
} from "@/lib/site";

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
 * Czyści dowolny tekst (markdown/HTML) do płaskiej meta-description.
 * Usuwa znaczniki, linki, nagłówki i emfazę, skleja białe znaki i przycina
 * do `maxLength` na granicy słowa. Pusty wejściowy tekst → domyślny opis witryny.
 */
export function toMetaDescription(
  input: string | undefined | null,
  maxLength = 160
): string {
  if (!input || !input.trim()) return SITE_DESCRIPTION;

  let text = input;
  text = text.replace(/```[\s\S]*?```/g, " "); // bloki kodu
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, " "); // obrazy
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1"); // linki → tekst
  text = text.replace(/<[^>]+>/g, " "); // znaczniki HTML
  text = decodeEntities(text); // encje → znaki
  text = text.replace(/<[^>]+>/g, " "); // znaczniki ujawnione po dekodowaniu
  text = text.replace(/^[\s>#]+/gm, " "); // nagłówki / cytaty na początku linii
  text = text.replace(/[*_`~]+/g, ""); // emfaza / kod inline
  text = text.replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated;
  return `${base.replace(/[\s.,;:–-]+$/, "")}…`;
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
  brand?: string;
  model?: string;
  year?: number;
  bodyType?: string;
  engine?: string;
  tags?: string[];
  publishedAt: string;
  modifiedAt?: string;
  image?: string;
};

/**
 * Węzeł BlogPosting dla testu, z encją `Car` w polu `about`.
 * Bez `reviewRating` (blog nie używa ocen liczbowych) — unika ostrzeżeń
 * „review without rating" w Search Console, zachowując kontekst encji pojazdu.
 */
export function articleNode(input: ArticleNodeInput) {
  const carName = [input.brand, input.model].filter(Boolean).join(" ").trim();
  return {
    "@type": "BlogPosting",
    "@id": `${input.url}#article`,
    isPartOf: { "@id": WEBSITE_ID },
    headline: input.title.slice(0, 110),
    name: input.title,
    description: input.description,
    inLanguage: "pl-PL",
    datePublished: input.publishedAt,
    dateModified: input.modifiedAt ?? input.publishedAt,
    author: { "@id": AUTHOR_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    url: input.url,
    articleSection: "Testy",
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
