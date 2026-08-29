/** Typ źródła wiadomości w katalogu. */
export type SourceType =
  | "rss"
  | "newsroom_html"
  | "api"
  | "media_kit"
  | "requires_login"
  /** Portale redakcyjne / agregatory — nigdy w auto-skanie oficjalnych newsów. */
  | "external_media";

export type VerificationStatus = "verified" | "needs_review" | "broken";

export type NewsRegion = "EU" | "US" | "JP" | "KR" | "CN" | "global";

/** Wpis w katalogu źródeł (`content/news-catalog/sources.json`). */
export type NewsSourceConfig = {
  id: string;
  name: string;
  brands: string[];
  region: NewsRegion;
  sourceType: SourceType;
  /** URL do pobrania: RSS, API lub listing newsroomu. */
  fetchUrl: string;
  /** Publiczny adres press roomu (link dla redaktora). */
  pressUrl?: string;
  loginRequired: boolean;
  enabled: boolean;
  /** Gdy enabled=false — powód wyłączenia (widoczny w panelu admin). */
  disabledReason?: string;
  maxItemsPerRun?: number;
  priority?: number;
  licenseNotes?: string;
  /** Weryfikacja URL/adaptera — `needs_review` = seed do ręcznej inspekcji. */
  verificationStatus?: VerificationStatus;
  /** Selektory CSS dla adaptera newsroom_html. */
  selectors?: {
    article: string;
    title: string;
    link: string;
    date?: string;
    image?: string;
    summary?: string;
  };
  includeKeywords?: string[];
  excludeKeywords?: string[];
};

/** Status w pipeline publikacji. */
export type NewsPipelineStatus =
  | "raw"
  | "needs-ai-draft"
  | "draft"
  | "review"
  | "published"
  | "rejected";

export type NewsImageAsset = {
  url: string;
  localPath?: string;
  alt?: string;
  credit?: string;
  license?: string;
  width?: number;
  height?: number;
};

export type NewsLicenseInfo = {
  sourceName: string;
  sourceUrl: string;
  usageNotes: string;
  requiresAttribution: boolean;
  commercialUseAllowed?: boolean;
};

/** Surowy materiał prasowy zapisany w `data/news/raw/`. */
export type RawNewsRecord = {
  id: string;
  contentHash: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
  title: string;
  lead?: string;
  bodyText?: string;
  bodyHtml?: string;
  publishedAt: string;
  fetchedAt: string;
  status: NewsPipelineStatus;
  images: NewsImageAsset[];
  license: NewsLicenseInfo;
  manufacturerId?: string;
  tags?: string[];
  /** Ścieżka względna do pliku JSON w data/news/raw/ */
  storagePath: string;
};

export type NewsIndexEntry = {
  id: string;
  contentHash: string;
  sourceUrl: string;
  title: string;
  status: NewsPipelineStatus;
  fetchedAt: string;
  publishedAt: string;
  storagePath: string;
};

export type NewsIndex = {
  version: 1;
  updatedAt: string;
  entries: NewsIndexEntry[];
  /** Szybki lookup po hash treści (deduplikacja). */
  hashIndex: Record<string, string>;
};

/** Element zwracany przez adapter źródła przed zapisem. */
export type FetchedNewsItem = {
  title: string;
  sourceUrl: string;
  publishedAt: string;
  lead?: string;
  bodyText?: string;
  bodyHtml?: string;
  images?: NewsImageAsset[];
};

/** Wejście dla lokalnego modelu AI. */
export type AiDraftInput = {
  jobId: string;
  createdAt: string;
  raw: RawNewsRecord;
  styleReference: "testy";
  site: {
    name: string;
    locale: string;
    baseUrl: string;
  };
  instructions: string;
};

/** Wyjście lokalnego modelu AI. */
export type AiDraftOutput = {
  jobId: string;
  title: string;
  lead: string;
  bodyMarkdown: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    slug?: string;
  };
  tags: string[];
  licenseWarnings: string[];
  /** 0–1; poniżej progu → zawsze review, nigdy autopublish. */
  confidence: number;
  suggestedStatus: "draft" | "review";
};

export type AiJobFile = {
  input: AiDraftInput;
  output?: AiDraftOutput;
  status: "pending" | "completed" | "failed";
  error?: string;
};
