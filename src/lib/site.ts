/** Kanoniczny URL witryny (SEO, sitemap, Open Graph). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://idrivecars.pl";

/** Nazwa marki — tytuły, JSON-LD, Open Graph. */
export const SITE_NAME = "IDRIVECARS";

/** Domyślny opis witryny (meta description, Open Graph, JSON-LD). */
export const SITE_DESCRIPTION =
  "Autorskie testy samochodów, pierwsze jazdy i galerie zdjęć Marcina Bochenka — bez clickbaitu, z własnymi zdjęciami i uczciwą oceną.";

/** Locale witryny (Open Graph / hreflang). */
export const SITE_LOCALE = "pl_PL";

/** Słowa kluczowe witryny (meta keywords — pomocniczo). */
export const SITE_KEYWORDS = [
  "testy samochodów",
  "recenzje samochodów",
  "pierwsza jazda",
  "blog motoryzacyjny",
  "motoryzacja",
  "dane techniczne",
  "Marcin Bochenek",
  "IDRIVECARS"
];

/**
 * Profile społecznościowe autora/marki — używane w JSON-LD jako `sameAs`.
 * Uzupełnij realnymi adresami (Instagram, YouTube, X itd.); puste = pominięte w schema.
 */
export const SOCIAL_LINKS: string[] = [];

/** Testy z galerią na stronie głównej (kolejność = priorytet; tylko slugi z manifestem). */
export const FEATURED_TEST_SLUGS = [
  "mercedes-maybach-s-600",
  "volkswagen-passat-alltrack-all-inclusive",
  "ford-focus-rs-najlepszy-z-chuliganow",
  "mazda-mx-5-nd-do-korzeni",
  "bentley-continental-gt-v8-s-convertible",
  "bmw-435i-cabriolet",
  "volkswagen-xl1",
  "lexus-nx-300h-f-sport",
  "lexus-rc-f",
  "volvo-xc90",
  "pierwsza-jazda-octavia-rs",
  "pierwsza-jazda-rs6",
  "pierwsza-jazda-corvette-c7",
  "pierwsza-jazda-porsche-on-track",
  "pierwsza-jazda-abarth-595-turismo",
  "nowy-jeep-cherokee"
] as const;

/** Pierwsze zdjęcie hero na stronie głównej (landscape / lepszy kadr). */
export const FEATURED_HERO_IMAGE_OVERRIDES: Partial<
  Record<(typeof FEATURED_TEST_SLUGS)[number], string>
> = {
  "mercedes-maybach-s-600": "/galleries/mercedes-maybach-s-600/13.webp"
};

export const SITE_AUTHOR = {
  name: "Marcin Bochenek",
  url: `${SITE_URL}/o-mnie`
} as const;
