/** Decyzja użytkownika – do uczenia modelu AI (warto napisać / pominąć). */
export type UserDecision = "worth" | "skip";

export type NewsStatus =
  | "raw"
  | "needs-ai-draft"
  | "draft"
  | "review"
  | "published"
  | "rejected";

/** Wpis newsa (agregowany z RSS, serwis prasowy producenta lub ręcznie). */
export type NewsItem = {
  slug: string;
  title: string;
  lead: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  image?: string;
  status?: NewsStatus;
  /** Źródło: rss | press_portal */
  sourceType?: "rss" | "press_portal";
  /** Id producenta z katalogu źródeł (gdy sourceType === press_portal) */
  manufacturerId?: string;
  /** Decyzja redaktora – do uczenia AI */
  userDecision?: UserDecision | null;
  decidedAt?: string | null;
  /** Referencja stylu: artykuły z /testy (konkret, pierwsza osoba, krótkie akapity) */
  styleReference?: "testy";
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  canonicalUrl?: string;
};

/** Opublikowany news z wyrenderowaną treścią MDX (strona /news/[slug]). */
export type NewsArticle = NewsItem & {
  contentHtml: string;
};
