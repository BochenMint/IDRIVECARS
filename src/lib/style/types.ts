/** Typ artykułu w korpusie stylu Marcina Bochenka. */
export type StyleArticleKind =
  | "test"
  | "pierwsza-jazda"
  | "felieton"
  | "news"
  | "blog"
  | "galeria"
  | "other";

/** Jedna pozycja korpusu (JSONL). */
export type StyleCorpusEntry = {
  slug: string;
  title: string;
  lead: string;
  publishedAt: string;
  category: string;
  kind: StyleArticleKind;
  tags: string[];
  brands: string[];
  models: string[];
  headings: string[];
  /** Oczyszczony tekst bez linków/HTML. */
  bodyPlain: string;
  /** Reprezentatywne fragmenty (nie pełny tekst — do few-shot). */
  excerpts: {
    opening: string;
    middle: string;
    closing: string;
  };
  pros: string[];
  cons: string[];
  summary: string;
  sourceUrl: string;
  wordCount: number;
};

/** Profil stylu dla lokalnego modelu. */
export type MarcinStyleProfile = {
  version: 1;
  author: "Marcin Bochenek";
  authorKey: "marcin-bochenek";
  generatedAt: string;
  corpusStats: {
    articleCount: number;
    byKind: Record<StyleArticleKind, number>;
    avgLeadWords: number;
    avgBodyWords: number;
    avgHeadingsPerTest: number;
    firstPersonRatio: number;
    readerAddressRatio: number;
  };
  voice: {
    tone: string[];
    rhythm: string;
    perspective: string;
    humor: string;
    criticism: string;
    metaphors: string[];
  };
  leads: {
    patterns: string[];
    examples: Array<{ title: string; lead: string; kind: StyleArticleKind }>;
    rules: string[];
  };
  headings: {
    testPatterns: string[];
    examples: string[];
    rules: string[];
  };
  structures: {
    test: string[];
    pierwszaJazda: string[];
    felieton: string[];
    news: string[];
  };
  newsRules: string[];
  antiPatterns: string[];
  plagiarismPolicy: string;
  fingerprint: {
    /** 5-słowne shingles (znormalizowane) do anty-plagiatu. */
    shingleCount: number;
  };
};

export type FewShotQuery = {
  title: string;
  lead?: string;
  tags?: string[];
  brand?: string;
  model?: string;
  manufacturerId?: string;
  keywords?: string[];
  /** Preferowany rodzaj przykładu: news → krótsze news/felieton. */
  preferKind?: StyleArticleKind[];
};

export type FewShotExample = {
  slug: string;
  title: string;
  kind: StyleArticleKind;
  lead: string;
  excerpt: string;
  score: number;
  reason: string;
};

export type StyleGuardrailInput = {
  title: string;
  lead: string;
  bodyMarkdown: string;
  sourceUrl?: string;
  sourceName?: string;
};

export type StyleGuardrailResult = {
  ok: boolean;
  score: number;
  checks: Array<{
    id: string;
    ok: boolean;
    severity: "error" | "warn";
    message: string;
  }>;
};
