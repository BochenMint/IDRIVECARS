import type { Metadata } from "next";
import { pageCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontakt z IDRIVECARS — współpraca redakcyjna, licencja na zdjęcia, pytania o testy.",
  ...pageCanonical("/kontakt")
};

export default function ContactPage() {
  return (
    <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
      <div className="mx-auto max-w-2xl">
        <header className="reveal-section mb-20 border-b border-soft pb-16 md:mb-28 md:pb-20">
          <p className="label-mono mb-8 text-stone-muted">Napisz</p>
          <h1 className="font-display display-track text-display-lg uppercase text-ink">
            Kontakt
          </h1>
          <p className="mt-8 max-w-md text-lead font-light text-subtle">
            Współpraca redakcyjna, pytania o konkretny test, licencja na zdjęcia.
          </p>
        </header>

        <div className="reveal-section-delayed space-y-12">
          <div>
            <a
              href="mailto:kontakt@idrivecars.pl"
              className="group inline-block font-display display-track text-display-md uppercase text-ink transition-opacity duration-editorial hover:opacity-55"
            >
              kontakt@idrivecars.pl
            </a>
          </div>

          <div className="space-y-6 border-t border-soft pt-12 font-light leading-[1.85] text-ink/75">
            <p>
              Jeśli interesuje Cię współpraca przy materiale motoryzacyjnym,
              skontaktuj się mailowo z krótkim opisem projektu.
            </p>
            <p>
              Zdjęcia z testów są objęte prawem autorskim. Licencja na użycie
              konkretnych fotografii — wyłącznie na podstawie pisemnej zgody.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
