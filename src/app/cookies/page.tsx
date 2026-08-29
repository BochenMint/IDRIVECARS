import type { Metadata } from "next";
import Link from "next/link";
import { pageCanonical } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Polityka cookies",
  description: `Informacje o plikach cookies i technologiach śledzących w serwisie ${SITE_NAME}.`,
  ...pageCanonical("/cookies")
};

export default function CookiesPolicyPage() {
  return (
    <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
      <div className="prose-editorial mx-auto max-w-3xl">
        <header className="reveal-section mb-16 border-b border-soft pb-12">
          <p className="label-mono mb-6 text-stone-muted">Prawne</p>
          <h1 className="font-display display-track text-display-lg uppercase text-ink">
            Polityka cookies
          </h1>
          <p className="mt-6 text-sm text-subtle">Ostatnia aktualizacja: 12 lipca 2026</p>
        </header>

        <div className="reveal-section-delayed space-y-10 font-light leading-[1.85] text-ink/80">
          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">1. Czym są cookies</h2>
            <p>
              Cookies to małe pliki zapisywane w przeglądarce. Używamy ich do działania serwisu,
              statystyk i — po Twojej zgodzie — reklam oraz pomiaru konwersji kampanii.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">2. Rodzaje cookies</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-soft text-left">
                    <th className="py-3 pr-4 font-medium text-ink">Kategoria</th>
                    <th className="py-3 pr-4 font-medium text-ink">Cel</th>
                    <th className="py-3 font-medium text-ink">Wymaga zgody</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-soft/60">
                    <td className="py-3 pr-4">Niezbędne</td>
                    <td className="py-3 pr-4">Działanie serwisu, preferencje banera cookies</td>
                    <td className="py-3">Nie</td>
                  </tr>
                  <tr className="border-b border-soft/60">
                    <td className="py-3 pr-4">Analityczne</td>
                    <td className="py-3 pr-4">Google Analytics 4 — ruch, źródła, strony</td>
                    <td className="py-3">Tak</td>
                  </tr>
                  <tr className="border-b border-soft/60">
                    <td className="py-3 pr-4">Marketingowe</td>
                    <td className="py-3 pr-4">Google Ads, AdSense — reklamy i konwersje</td>
                    <td className="py-3">Tak</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">3. Zarządzanie zgodą</h2>
            <p>
              Przy pierwszej wizycie wyświetlamy baner z wyborem: „Akceptuję” lub „Tylko niezbędne”.
              Zgodę możesz wycofać, usuwając cookies w przeglądarce lub blokując je w ustawieniach.
            </p>
            <p>
              Szczegóły przetwarzania danych:{" "}
              <Link href="/polityka-prywatnosci" className="text-ink underline-offset-4 hover:underline">
                Polityka prywatności
              </Link>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">4. Narzędzia zewnętrzne</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Google Analytics 4</strong> — pomiar ruchu (po zgodzie). Polityka Google:{" "}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-ink underline-offset-4 hover:underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  policies.google.com/privacy
                </a>
              </li>
              <li>
                <strong>Google Ads / AdSense</strong> — reklamy i tagi konwersji (po zgodzie).
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl uppercase tracking-wide text-ink">5. Kontakt</h2>
            <p>
              Pytania o cookies:{" "}
              <a href="mailto:kontakt@idrivecars.pl" className="text-ink underline-offset-4 hover:underline">
                kontakt@idrivecars.pl
              </a>
              . Administrator: Marcin Bochenek, {SITE_NAME}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
