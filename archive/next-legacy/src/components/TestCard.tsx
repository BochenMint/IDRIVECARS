import Link from "next/link";
import type { TestMeta } from "../lib/content/types";

type TestCardProps = {
  test: TestMeta;
  heroImageFallback?: string | null;
};

export function TestCard({ test, heroImageFallback }: TestCardProps) {
  const rawHero = test.heroImage
    ? `/${test.heroImage.replace(/^\/?/, "").replace(/\\/g, "/")}`
    : null;
  const heroSrc = (heroImageFallback ?? rawHero)?.replace(/\\/g, "/") ?? null;
  const isFirstDrive = test.title.toLowerCase().includes("pierwsza jazda");

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-200/60">
      <Link href={`/testy/${test.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-neutral-100">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt={test.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs text-muted">
            Galeria w przygotowaniu
          </div>
        )}
        {isFirstDrive && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink backdrop-blur">
            Pierwsza jazda
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
          {test.brand} {test.model} {test.year ?? ""}
        </p>
        <h3 className="font-display text-xl leading-snug tracking-tight">
          <Link href={`/testy/${test.slug}`} className="hover:opacity-80">
            {test.title}
          </Link>
        </h3>
        {test.lead && (
          <p className="line-clamp-2 text-sm leading-relaxed text-neutral-600">{test.lead}</p>
        )}
      </div>
    </article>
  );
}
