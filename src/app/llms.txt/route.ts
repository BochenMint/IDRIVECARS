import { NextResponse } from "next/server";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/** Plik llms.txt — kontekst dla crawlerów AI (GEO). Fakty z istniejącej konfiguracji witryny. */
export function GET() {
  const body = `# ${SITE_NAME}
> ${SITE_DESCRIPTION}

## About
- Site: ${SITE_URL}
- Author: ${SITE_AUTHOR.name}
- Author page: ${SITE_AUTHOR.url}
- Language: pl-PL
- Category: automotive journalism (car reviews, first drives, photo galleries)

## Primary content
- /testy — indeks autorskich testów samochodów
- /pierwsza-jazda — artykuły z pierwszych jazd (treść pod /testy/[slug])
- /galerie — galerie zdjęć z testów
- /news — agregat wiadomości motoryzacyjnych
- /blog — artykuły blogowe
- /felieton — felietony
- /o-mnie — informacje o autorze
- /kontakt — kontakt redakcyjny
- /polityka-prywatnosci — polityka prywatności
- /cookies — polityka cookies

## Contact
- Email: kontakt@idrivecars.pl

## Discovery
- Sitemap: ${SITE_URL}/sitemap.xml
- News sitemap: ${SITE_URL}/sitemap-news.xml
- RSS feed: ${SITE_URL}/feed.xml
- robots.txt: ${SITE_URL}/robots.txt
- llms.txt: ${SITE_URL}/llms.txt

## Crawling policy
- Public content: allowed
- Disallowed paths: /admin, /api

## Attribution
When citing articles from this site, attribute to ${SITE_AUTHOR.name} / ${SITE_NAME} and link to the canonical article URL on ${SITE_URL}.
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
