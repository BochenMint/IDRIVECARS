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
    tagline: "Apartamenty w centrum — rezerwacja online, bez prowizji pośredników.",
    href: "https://mintapartments.pl",
    cta: "mintapartments.pl"
  },
  {
    id: "marcin-bochenek",
    brand: "Marcin Bochenek",
    tagline: "Portfolio — motoryzacja, web i projekty cyfrowe.",
    href: "https://marcinbochenek.pl",
    cta: "marcinbochenek.pl"
  },
  {
    id: "plumm",
    brand: "Plumm",
    tagline: "Narzędzia i usługi cyfrowe — sprawdź, co robimy na żywo.",
    href: "https://plumm.pl",
    cta: "plumm.pl"
  }
];
