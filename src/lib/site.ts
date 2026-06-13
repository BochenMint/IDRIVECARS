/**
 * Centralna konfiguracja serwisu — jedno źródło prawdy dla SEO,
 * metadanych, danych strukturalnych (JSON-LD) i map witryny.
 */

export const siteConfig = {
  name: "IDRIVECARS",
  /** Pełna, kanoniczna domena produkcyjna (bez ukośnika na końcu). */
  url: "https://idrivecars.pl",
  title: "IDRIVECARS – testy samochodów, pierwsze jazdy i galerie zdjęć",
  description:
    "IDRIVECARS to autorskie testy samochodów, pierwsze jazdy i galerie zdjęć Marcina Bochenka. Rzetelne wrażenia z jazdy, konkretne dane techniczne i duże fotografie — bez clickbaitu.",
  locale: "pl_PL",
  language: "pl-PL",
  /** Domyślny obraz Open Graph (1200×630) generowany przez app/opengraph-image. */
  ogImage: "/opengraph-image",
  logo: "/idrivecars-logo.jpg",
  email: "kontakt@idrivecars.pl",
  keywords: [
    "testy samochodów",
    "pierwsze jazdy",
    "recenzje samochodów",
    "blog motoryzacyjny",
    "galerie samochodów",
    "dane techniczne",
    "Marcin Bochenek",
    "IDRIVECARS"
  ],
  author: {
    name: "Marcin Bochenek",
    jobTitle: "Dziennikarz motoryzacyjny",
    url: "https://idrivecars.pl/o-mnie"
  }
} as const;

/** Buduje absolutny URL na podstawie ścieżki względnej (z wiodącym ukośnikiem lub bez). */
export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalized === "/" ? "" : normalized}`;
}
