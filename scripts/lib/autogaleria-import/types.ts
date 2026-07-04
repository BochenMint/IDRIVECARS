export type ProvenanceSource =
  | "elasticsearch-author"
  | "author-nuxt-ssr"
  | "seed-url"
  | "manual";

export type DiscoveredUrl = {
  urlKey: string;
  sourceUrl: string;
  title?: string;
  date?: string;
  discoveredVia: ProvenanceSource;
};

export type AgCategory = {
  id?: number;
  name: string;
  slug: string;
  path?: Array<{ name: string; path?: string }>;
};

export type AgPostApi = {
  id: number;
  title: string;
  excerpt?: string;
  body?: string;
  urlKey: string;
  categories?: AgCategory[];
  tags?: Array<{ id: number; name: string; slug: string }>;
  cars?: Array<{ id: number; name: string; slug: string }>;
  thumbnail?: string | null;
  gallery?: string[];
  author?: { name: string; key: string; avatar?: string | null; description?: string };
  path?: Array<{ name: string; path?: string }>;
  date?: string;
  type?: string;
  pros?: string[];
  cons?: string[];
  tables?: unknown[];
  meta?: { title?: string; description?: string };
};

export type NormalizedArticle = {
  slug: string;
  urlKey: string;
  sourceUrl: string;
  provenance: {
    discoveredVia: ProvenanceSource;
    importedAt: string;
    importer: string;
    rightsNote: string;
  };
  title: string;
  excerpt: string;
  lead: string;
  category: string;
  categories: AgCategory[];
  tags: string[];
  publishedAt: string;
  author: { name: string; key: string };
  headings: Array<{ level: number; text: string }>;
  bodyHtml: string;
  bodyMarkdown: string;
  pros: string[];
  cons: string[];
  summary: string;
  youtube: Array<{ videoId: string; url: string; embedUrl: string }>;
  images: {
    thumbnail: string | null;
    gallery: string[];
    inline: string[];
    absolute: {
      thumbnail: string | null;
      gallery: string[];
      inline: string[];
    };
  };
  tables: unknown[];
  meta: { title: string; description: string };
  cars: string[];
};

export type ImportReport = {
  generatedAt: string;
  authorKey: string;
  authorName: string;
  pagination: {
    mechanism: string;
    endpoint: string;
    pageSize: number;
    totalFromIndex: number;
  };
  counts: {
    discoveredUrls: number;
    uniqueUrls: number;
    fetchedOk: number;
    fetchedFailed: number;
    skippedCached: number;
  };
  discoveredVia: Record<ProvenanceSource, number>;
  failures: Array<{ urlKey: string; sourceUrl: string; error: string }>;
  missingOrUncertain: string[];
  seedUrlsChecked: Array<{ url: string; urlKey: string; status: "ok" | "failed"; author?: string }>;
  outputDirs: {
    articlesJson: string;
    articlesMarkdown: string;
    cache: string;
    images: string;
    urlManifest: string;
    report: string;
  };
  scripts: string[];
};
