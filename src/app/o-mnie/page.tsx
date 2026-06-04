import Link from "next/link";
import { personNode, breadcrumbNode, jsonLdGraph, jsonLdScript } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata = {
  title: "O mnie",
  description:
    "Marcin Bochenek — dziennikarz motoryzacyjny, autor IDRIVECARS. Autorskie testy, pierwsze jazdy i własne zdjęcia bez clickbaitu."
};

export default function AboutPage() {
  const ld = jsonLdScript(
    jsonLdGraph(
      personNode(),
      breadcrumbNode([
        { name: "Strona główna", url: `${SITE_URL}` },
        { name: "O mnie", url: `${SITE_URL}/o-mnie` }
      ])
    )
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ld }}
      />

      <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
        <div className="mx-auto max-w-2xl">
          <header className="reveal-section mb-20 border-b border-soft pb-16 md:mb-28 md:pb-20">
            <p className="label-mono mb-8 text-stone-muted">Autor</p>
            <h1 className="font-display display-track text-display-lg uppercase text-ink">
              Marcin Bochenek
            </h1>
            <p className="mt-8 max-w-lg text-lead font-light text-subtle">
              Dziennikarz motoryzacyjny. Testy, pierwsze jazdy i własne zdjęcia —
              bez pośredników, bez clickbaitu.
            </p>
          </header>

          <div className="reveal-section-delayed space-y-8 font-light leading-[1.85] text-ink/85">
            <p>
              Przez lata pisałem testy samochodów dla{" "}
              <a
                href="https://autogaleria.pl/"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4 decoration-stone transition-opacity duration-editorial hover:opacity-55"
              >
                autoGaleria.pl
              </a>
              . W tym czasie przejechałem setki tysięcy kilometrów różnymi autami —
              od małych miejskich hatchbacków po egzotyczne supersportowe. Każdy test
              to realna jazda, nie przejażdżka po torze PR-owym.
            </p>

            <p>
              IDRIVECARS to moje własne archiwum. Zebrałem tu teksty, które
              naprawdę warto zachować — sprawdzone i rozbudowane o własny kontekst.
              Żadnych newsów z biur prasowych, żadnych artykułów sponsorowanych
              udających recenzje.
            </p>

            <p>
              Opisuję samochody tak, jak je widzę: z danymi technicznymi,
              szczerymi wrażeniami z jazdy i oceną, której nie dyktuje dział
              marketingu producenta. Zdjęcia są moje — robię je sam, na
              miejscu, przy każdym teście.
            </p>

            <p>
              Interesuję się przede wszystkim autami, w których inżynierowie
              podjęli jakąś decyzję — ciekawą, odważną albo kontrowersyjną.
              Nudzą mnie auta bez charakteru. Fascynują silniki, zawieszenia
              i to, jak konstruktorzy radzą sobie z kompromisami między dynamiką
              a codziennym użytkowaniem.
            </p>
          </div>

          <div className="mt-20 border-t border-soft pt-14">
            <p className="label-mono mb-8 text-stone-muted">Co tu znajdziesz</p>
            <ul className="space-y-5">
              <li>
                <Link
                  href="/testy"
                  className="group flex items-baseline gap-4 transition-opacity duration-editorial hover:opacity-55"
                >
                  <span className="font-display display-track text-display-md uppercase text-ink">
                    Testy
                  </span>
                  <span className="label-mono text-stone-muted group-hover:text-stone-muted">
                    — indeks autorskich testów i pierwszych jazd
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/galerie"
                  className="group flex items-baseline gap-4 transition-opacity duration-editorial hover:opacity-55"
                >
                  <span className="font-display display-track text-display-md uppercase text-ink">
                    Galerie
                  </span>
                  <span className="label-mono text-stone-muted">
                    — własne zdjęcia z każdego testu
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
