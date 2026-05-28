import { Fragment } from "react";
import { TestCard } from "@/components/TestCard";
import { AdSlot } from "@/components/AdSlot";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllTests } from "@/lib/content/testy";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Testy samochodów",
  description:
    "Autorskie testy samochodów Marcina Bochenka – uczciwe wrażenia z jazdy, konkretne dane i duże zdjęcia."
};

export default async function TestsPage() {
  const tests = await getAllTests();
  const heroFallbacks = await Promise.all(
    tests.map((t) => getFirstGalleryImageSrc(t.galleryDir))
  );

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Testy</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          Testy samochodów IDRIVECARS
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
          Zbiór spokojnie napisanych, autorskich testów z portalu autoGALERIA.pl, przeniesionych tutaj
          z naciskiem na czytelność i zdjęcia. W każdym tekście: dane techniczne, wrażenia z jazdy,
          wnętrze i praktyczność, zużycie paliwa oraz podsumowanie – dla kogo ten samochód i czy warto.
        </p>
      </header>

      {tests.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Na razie jest tu tylko przykładowy artykuł. Gdy przeniesiemy kolejne testy, pojawią się na
          tej liście automatycznie.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test, i) => (
            <Fragment key={test.slug}>
              <TestCard test={test} heroImageFallback={heroFallbacks[i] ?? null} />
              {(i + 1) % 6 === 0 && (
                <div className="flex justify-center md:col-span-2 lg:col-span-3">
                  <AdSlot slotId="between-cards" format="medium-rectangle" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

