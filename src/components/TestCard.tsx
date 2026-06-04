import Image from "next/image";
import Link from "next/link";
import type { TestMeta } from "../lib/content/types";

const IMAGE_QUALITY = 75;

type TestCardProps = {
  test: TestMeta;
  heroImageFallback?: string | null;
  variant?: "grid" | "row" | "hero";
  index?: number;
  /** Few gallery assets → smaller image accent (home grid). */
  galleryImageCount?: number;
};

export function TestCard({
  test,
  heroImageFallback,
  variant = "grid",
  index,
  galleryImageCount
}: TestCardProps) {
  const heroSrc = heroImageFallback?.replace(/\\/g, "/") ?? null;
  const heroAlt = [test.brand, test.model].filter(Boolean).join(" ") || test.title;
  const sparseGallery = galleryImageCount !== undefined && galleryImageCount < 3;

  if (variant === "hero") {
    return (
      <Link href={`/testy/${test.slug}`} className="group relative block full-bleed w-full">
        <div className="relative h-[min(72vh,52rem)] w-full max-h-[72vh] min-h-[42vh] overflow-hidden">
          {heroSrc ? (
            <Image
              src={heroSrc}
              alt={heroAlt}
              fill
              priority
              quality={IMAGE_QUALITY}
              sizes="100vw"
              className="object-cover object-center opacity-[0.97] transition-[opacity,transform] duration-editorial group-hover:opacity-90 group-hover:scale-[1.02] motion-reduce:transform-none"
            />
          ) : (
            <div className="absolute inset-0 bg-ink" />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end px-gutter pb-16 pt-20 md:pb-20 md:pt-24">
            <p className="label-mono mb-6 text-stone-muted">
              {test.brand} {test.model} {test.year ?? ""}
            </p>
            <h1 className="font-display display-track text-display-xl uppercase text-stone">{test.title}</h1>
            {test.lead && (
              <p className="mt-8 max-w-lg text-lead font-light text-stone/80">{test.lead}</p>
            )}
            <span className="label-mono mt-12 inline-block text-stone/50 transition-opacity duration-editorial group-hover:opacity-100">
              Czytaj test
            </span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "row") {
    return (
      <article className="group border-b border-soft">
        <Link
          href={`/testy/${test.slug}`}
          className="grid grid-cols-[3.75rem_1fr] gap-6 py-14 sm:grid-cols-[5.5rem_1fr_12rem] sm:items-center sm:gap-12 sm:py-16"
        >
          <span className="font-display text-4xl leading-none tracking-wide text-stone-muted/60 transition-opacity duration-editorial group-hover:text-stone-muted sm:text-[2.75rem]">
            {index !== undefined ? String(index + 1).padStart(2, "0") : "—"}
          </span>
          <div className="min-w-0 space-y-3.5">
            <p className="label-mono text-stone-muted">
              {test.brand} {test.model} {test.year ?? ""}
            </p>
            <h2 className="font-display display-track text-display-md uppercase transition-opacity duration-editorial group-hover:opacity-55">
              {test.title}
            </h2>
          </div>
          <div className="relative col-span-2 aspect-[16/10] max-h-28 overflow-hidden sm:col-span-1 sm:max-h-none sm:aspect-[4/3]">
            {heroSrc ? (
              <Image
                src={heroSrc}
                alt={heroAlt}
                fill
                quality={IMAGE_QUALITY}
                sizes="(max-width: 640px) 100vw, 176px"
                className="object-cover object-center transition-[opacity,transform] duration-editorial group-hover:opacity-80 group-hover:scale-[1.03] motion-reduce:transform-none"
              />
            ) : (
              <div className="flex h-full items-center justify-center label-mono text-subtle">—</div>
            )}
          </div>
        </Link>
      </article>
    );
  }

  const gridAspect = sparseGallery ? "aspect-[3/2]" : "aspect-[16/10]";
  const gridMaxH = sparseGallery ? "max-h-[200px] sm:max-h-[220px]" : "max-h-[240px] sm:max-h-[280px]";

  return (
    <article className="group">
      <Link href={`/testy/${test.slug}`} className="block">
        <div
          className={`relative w-full overflow-hidden ${gridAspect} ${gridMaxH}`}
        >
          {heroSrc ? (
            <Image
              src={heroSrc}
              alt={heroAlt}
              fill
              quality={IMAGE_QUALITY}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
              className="object-cover object-center transition-[opacity,transform] duration-editorial group-hover:opacity-85 group-hover:scale-[1.03] motion-reduce:transform-none"
            />
          ) : (
            <div className="absolute inset-0 bg-ink" />
          )}
        </div>
        <div className="space-y-2.5 pt-6 pb-1 sm:pt-7">
          <p className="label-mono text-stone-muted">
            {test.brand} {test.model}
          </p>
          <h3 className="font-display display-track text-display-md uppercase text-ink transition-opacity duration-editorial group-hover:opacity-55">
            {test.title}
          </h3>
        </div>
      </Link>
    </article>
  );
}
