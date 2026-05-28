import Link from "next/link";
import type { TestMeta } from "../lib/content/types";

type TestCardProps = {
  test: TestMeta;
  heroImageFallback?: string | null;
  variant?: "grid" | "row" | "hero";
  index?: number;
};

export function TestCard({
  test,
  heroImageFallback,
  variant = "grid",
  index
}: TestCardProps) {
  const heroSrc = heroImageFallback?.replace(/\\/g, "/") ?? null;
  const heroAlt = [test.brand, test.model].filter(Boolean).join(" ") || test.title;

  if (variant === "hero") {
    return (
      <Link href={`/testy/${test.slug}`} className="group relative block min-h-[100svh] w-full">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt={heroAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        <div className="relative flex min-h-[100svh] flex-col justify-end px-gutter pb-16 pt-32">
          <p className="label-mono mb-4 text-white/60">
            {test.brand} {test.model} {test.year ?? ""}
          </p>
          <h1 className="font-display text-display-xl uppercase text-white">{test.title}</h1>
          {test.lead && (
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75">{test.lead}</p>
          )}
          <span className="label-mono mt-10 inline-block text-white/50 transition group-hover:text-white">
            Czytaj test →
          </span>
        </div>
      </Link>
    );
  }

  if (variant === "row") {
    return (
      <article className="group border-b border-line">
        <Link
          href={`/testy/${test.slug}`}
          className="grid grid-cols-[auto_1fr] gap-6 py-8 sm:grid-cols-[4rem_1fr_12rem] sm:items-center sm:gap-10"
        >
          <span className="label-mono hidden text-subtle sm:block">
            {index !== undefined ? String(index + 1).padStart(2, "0") : "—"}
          </span>
          <div className="min-w-0 space-y-2">
            <p className="label-mono text-subtle">
              {test.brand} {test.model} {test.year ?? ""}
            </p>
            <h2 className="font-display text-2xl uppercase leading-none tracking-wide transition group-hover:opacity-60 sm:text-3xl">
              {test.title}
            </h2>
          </div>
          <div className="col-span-2 aspect-[16/10] overflow-hidden bg-ink/5 sm:col-span-1 sm:aspect-[4/3]">
            {heroSrc ? (
              <img
                src={heroSrc}
                alt={heroAlt}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center label-mono text-subtle">
                —
              </div>
            )}
          </div>
        </Link>
      </article>
    );
  }

  return (
    <article className="group">
      <Link href={`/testy/${test.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-ink">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt={heroAlt}
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="label-mono mb-2 text-white/50">
            {test.brand} {test.model}
          </p>
          <h3 className="font-display text-2xl uppercase leading-none text-white">{test.title}</h3>
        </div>
      </Link>
    </article>
  );
}
