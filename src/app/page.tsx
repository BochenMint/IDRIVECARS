import Link from "next/link";
import { TestCard } from "@/components/TestCard";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllTests } from "@/lib/content/testy";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tests = await getAllTests();
  const latestTests = tests.slice(0, 6);
  const heroFallbacks = await Promise.all(
    latestTests.map((t) => getFirstGalleryImageSrc(t.galleryDir))
  );
  const heroImage = heroFallbacks.find(Boolean) ?? null;

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center gap-6 p-8 sm:p-10 lg:p-14">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted">
              Portfolio dziennikarskie
            </p>
            <h1 className="font-display text-balance text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              Testy samochodów bez krzyku. Z własnymi zdjęciami.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-neutral-600">
              IDRIVECARS to autorski blog motoryzacyjny Marcina Bochenka — spokojna typografia,
              duże fotografie i rzetelne pierwsze jazdy zamiast clickbaitu.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/testy"
                className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                Przeglądaj testy
              </Link>
              <Link
                href="/galerie"
                className="rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-sm font-medium text-ink transition hover:border-neutral-400"
              >
                Galerie zdjęć
              </Link>
            </div>
          </div>

          <div className="relative min-h-[280px] bg-neutral-100 lg:min-h-[420px]">
            {heroImage ? (
              <>
                <img
                  src={heroImage}
                  alt="Zdjęcie z testu samochodu"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent lg:bg-gradient-to-l lg:from-black/20" />
              </>
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-muted">
                Galerie w trakcie importu
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-8 border-t border-neutral-200/80 pt-10 lg:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Testy</p>
          <p className="text-sm leading-relaxed text-neutral-600">
            Długie formy z danymi technicznymi, wrażeniami z jazdy i pełnymi galeriami — materiały
            pierwotnie publikowane na autoGaleria.pl.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Pierwsze jazdy</p>
          <p className="text-sm leading-relaxed text-neutral-600">
            Krótsze formy z eventów prasowych i premier — Focus RS, Passat, Fabia, Fiat 500 i
            dziesiątki innych modeli w archiwum.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Blog</p>
          <p className="text-sm leading-relaxed text-neutral-600">
            Wkrótce krótsze wpisy, obserwacje z rynku i materiały spoza testów długich. Na start —
            archiwum testów i galerie.
          </p>
        </div>
      </section>

      {latestTests.length > 0 && (
        <section className="mt-16 space-y-8">
          <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Archiwum</p>
              <h2 className="mt-1 font-display text-3xl tracking-tight">Najnowsze testy</h2>
            </div>
            <Link
              href="/testy"
              className="shrink-0 text-sm font-medium text-muted transition hover:text-ink"
            >
              Wszystkie →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestTests.map((test, i) => (
              <TestCard
                key={test.slug}
                test={test}
                heroImageFallback={heroFallbacks[i] ?? null}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
