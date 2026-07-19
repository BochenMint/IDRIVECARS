/** Decyzja użytkownika – do uczenia modelu AI (warto napisać / pominąć). */
export type UserDecision = "worth" | "skip";

/** Wpis newsa (agregowany z RSS, serwis prasowy producenta lub ręcznie). */
export type NewsItem = {
  slug: string;
  title: string;
  lead: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  image?: string;
  status?: "draft" | "published" | "rejected";
  /** Źródło: rss | press_portal */
  sourceType?: "rss" | "press_portal";
  /** Id producenta z content/press-sources.json (gdy sourceType === press_portal) */
  manufacturerId?: string;
  /** Decyzja redaktora – do uczenia AI */
  userDecision?: UserDecision | null;
  decidedAt?: string | null;
  /** Referencja stylu: artykuły z /testy (konkret, pierwsza osoba, krótkie akapity) */
  styleReference?: "testy";
};
