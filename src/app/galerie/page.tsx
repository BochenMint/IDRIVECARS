import { TestCard } from "@/components/TestCard";
import { getAllTests } from "@/lib/content/testy";

export const metadata = {
  title: "Galerie zdjęć",
  description:
    "Galerie zdjęć z autorskich testów IDRIVECARS – duże kadry, detale i klimat każdego samochodu."
};

export default async function GalleriesPage() {
  const tests = await getAllTests();
  const withGalleries = tests.filter((test) => Boolean(test.galleryDir));

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Galerie</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          Galerie zdjęć z testów
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
          Zdjęcia są sercem IDRIVECARS. Każdy test ma własną galerię – po konwersji do WEBP ładuje się
          szybko, zachowując jakość.
        </p>
      </header>

      {withGalleries.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Gdy tylko przekonwertujesz pierwsze galerie (skrypt <code>npm run convert:galleries</code>),
          pojawią się tutaj w formie kart prowadzących do poszczególnych testów.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {withGalleries.map((test) => (
            <TestCard key={test.slug} test={test} />
          ))}
        </div>
      )}
    </section>
  );
}

