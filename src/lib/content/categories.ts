export const ARTICLE_CATEGORIES = [
  "test",
  "pierwsza-jazda",
  "blog",
  "felieton",
  "news"
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  test: "Testy",
  "pierwsza-jazda": "Pierwsza jazda",
  blog: "Blog",
  felieton: "Felietony",
  news: "News"
};

export const CATEGORY_DESCRIPTIONS: Record<ArticleCategory, string> = {
  test: "Autorskie testy samochodów — od krótkiej relacji po dłuższą ocenę modelu.",
  "pierwsza-jazda":
    "Krótkie wrażenia z pierwszego spotkania z modelem — bez pełnego testu, za to na żywo i konkretnie.",
  blog: "Luźniejsze wpisy o motoryzacji, rynku i technologii.",
  felieton: "Subiektywne komentarze i felietony — z dystansem i własnym zdaniem.",
  news: "Krótkie wiadomości ze świata motoryzacji."
};

/** Katalogi MDX w repozytorium (news ma osobny loader). */
export const CATEGORY_CONTENT_DIRS: Record<
  Exclude<ArticleCategory, "news">,
  string
> = {
  test: "testy",
  "pierwsza-jazda": "testy",
  blog: "blog",
  felieton: "felieton"
};

export function isArticleCategory(value: string): value is ArticleCategory {
  return (ARTICLE_CATEGORIES as readonly string[]).includes(value);
}

/** Kanoniczna ścieżka publiczna artykułu (bez domeny). */
export function articlePublicPath(
  category: ArticleCategory,
  slug: string
): string {
  switch (category) {
    case "blog":
      return `/blog/${slug}`;
    case "felieton":
      return `/felieton/${slug}`;
    case "news":
      return `/news/${slug}`;
    case "pierwsza-jazda":
    case "test":
    default:
      return `/testy/${slug}`;
  }
}

/** Ścieżka listingu kategorii. */
export function categoryListingPath(category: ArticleCategory): string {
  switch (category) {
    case "blog":
      return "/blog";
    case "felieton":
      return "/felieton";
    case "pierwsza-jazda":
      return "/pierwsza-jazda";
    case "news":
      return "/news";
    case "test":
    default:
      return "/testy";
  }
}
