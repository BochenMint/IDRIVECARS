export type HouseAd = {
  id: string;
  brand: string;
  tagline: string;
  href: string;
  /** Krótka etykieta linku (widoczna w slocie) */
  cta: string;
};

/** Własne / partnerskie reklamy — rotowane gdy brak AdSense lub w slocie house. */
export const HOUSE_ADS: HouseAd[] = [
  {
    id: "mint-apartments",
    brand: "Mint Apartments",
    tagline: "Apartamenty na krótki pobyt w Gdańsku — rezerwacja bez prowizji portali.",
    href: "https://mintapartments.pl",
    cta: "mintapartments.pl"
  },
  {
    id: "marcin-bochenek",
    brand: "Marcin Bochenek",
    tagline: "Autor IDRIVECARS — testy, web i projekty cyfrowe.",
    href: "https://marcinbochenek.pl",
    cta: "marcinbochenek.pl"
  },
  {
    id: "plumm",
    brand: "Plumm",
    tagline: "Księgowość online dla JDG — faktury KSeF, PIT, VAT i ZUS w jednej aplikacji.",
    href: "https://plumm.pl",
    cta: "plumm.pl"
  }
];
