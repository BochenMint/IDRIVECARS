import type { Metadata } from "next";
import Link from "next/link";
import { pageCanonical } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description: `Polityka prywatności serwisu ${SITE_NAME} — informacje o przetwarzaniu danych, plikach cookies i narzędziach analitycznych.`,
  ...pageCanonical("/polityka-prywatnosci")
};

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
      <div className="prose-editorial mx-auto max-w-3xl">
        <header className="reveal-section mb-16 border-b border-soft pb-12">
          <p className="label-mono mb-6 text-stone-muted">Prawne</p>
          <h1 className="font-display display-track text-display-lg uppercase text-ink">
            Polityka prywatności
          </h1>
          <p className="mt-6 text-sm text-subtle">Ostatnia aktualizacja: 12 lipca 2026</p>
        </header>

        <div className="reveal-section-delayed space-y-10 font-light leading-[1.85] text-ink/80">
          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">1. Administrator</h2>
            <p>
              Administratorem serwisu {SITE_NAME} ({SITE_URL}) jest Marcin Bochenek.
              Kontakt w sprawach prywatności:{" "}
              <a href="mailto:kontakt@idrivecars.pl" className="text-ink underline-offset-4 hover:underline">
                kontakt@idrivecars.pl
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">2. Zakres danych</h2>
            <p>
              Serwis jest głównie informacyjny. Nie prowadzimy kont użytkowników ani formularzy
              zbierających dane osobowe. Możemy przetwarzać:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>dane techniczne (adres IP, typ przeglądarki, system) — logi serwera,</li>
              <li>dane z plików cookies i podobnych technologii — patrz{" "}
                <Link href="/cookies" className="text-ink underline-offset-4 hover:underline">
                  Polityka cookies
                </Link>
                ,</li>
              <li>korespondencję e-mail, jeśli sam się z nami skontaktujesz.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">3. Cele i podstawy prawne</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>udostępnienie treści serwisu — art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes),</li>
              <li>statystyka i bezpieczeństwo — art. 6 ust. 1 lit. f RODO,</li>
              <li>marketing i reklama (Google Analytics, Google Ads, AdSense) — art. 6 ust. 1 lit. a RODO (zgoda przez baner cookies),</li>
              <li>odpowiedź na zapytania e-mail — art. 6 ust. 1 lit. f RODO.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">4. Odbiorcy danych</h2>
            <p>
              Dane mogą być przekazywane dostawcom infrastruktury (hosting) oraz podmiotom z grupy
              Google (Analytics, Ads, AdSense) — zgodnie z ich politykami i ustawieniami konta.
              Hosting: serwer własny (Mac Mini), domena idrivecars.pl.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">5. Okres przechowywania</h2>
            <p>
              Logi serwera — do 90 dni. Dane analityczne — zgodnie z ustawieniami Google Analytics
              (domyślnie 14 miesięcy). Korespondencja e-mail — do czasu zakończenia sprawy lub
              żądania usunięcia.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">6. Twoje prawa</h2>
            <p>
              Przysługuje Ci prawo dostępu, sprostowania, usunięcia, ograniczenia przetwarzania,
              sprzeciwu oraz przenoszenia danych — w zakresie przewidzianym RODO. Skargę możesz
              złożyć do Prezesa UODO. Napisz na{" "}
              <a href="mailto:kontakt@idrivecars.pl" className="text-ink underline-offset-4 hover:underline">
                kontakt@idrivecars.pl
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">7. Zmiany</h2>
            <p>
              Polityka może być aktualizowana. Nowa wersja będzie publikowana pod tym adresem z
              datą aktualizacji.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
