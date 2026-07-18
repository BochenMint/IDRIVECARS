/**
 * Central site configuration — single source of truth for SEO,
 * metadata, structured data (JSON-LD), and sitemaps.
 */

export const siteConfig = {
  name: 'IDRIVECARS',
  /** Canonical production domain (no trailing slash). */
  url: 'https://idrivecars.pl',
  title: 'IDRIVECARS – testy samochodów, pierwsze jazdy i galerie zdjęć',
  description:
    'IDRIVECARS to autorskie testy samochodów, pierwsze jazdy i galerie zdjęć Marcina Bochenka. Rzetelne wrażenia z jazdy, konkretne dane techniczne i duże fotografie — bez clickbaitu.',
  locale: 'pl_PL',
  language: 'pl-PL',
  ogImage: '/opengraph-image',
  logo: '/idrivecars-logo.jpg',
  email: 'kontakt@idrivecars.pl',
  keywords: [
    'testy samochodów',
    'pierwsze jazdy',
    'recenzje samochodów',
    'blog motoryzacyjny',
    'galerie samochodów',
    'dane techniczne',
    'Marcin Bochenek',
    'IDRIVECARS',
  ],
  author: {
    name: 'Marcin Bochenek',
    jobTitle: 'Dziennikarz motoryzacyjny',
    url: 'https://idrivecars.pl/o-mnie',
  },
  /** Default leadgen webhook base (override via env at build/runtime). */
  leadgenUrl: import.meta.env.PUBLIC_LEADGEN_URL ?? 'http://localhost:8000',
  consentCheckboxText:
    'Wyrażam zgodę na przetwarzanie moich danych osobowych w celu kontaktu w sprawie oferty leasingu/wynajmu oraz ubezpieczenia. Administratorem danych jest idrivecars.pl.',
} as const;

/** Build absolute URL from a relative path (with or without leading slash). */
export function absoluteUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig.url}${normalized === '/' ? '' : normalized}`;
}
