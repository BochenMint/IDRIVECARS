import type { Metadata } from "next";

import Image from "next/image";

import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";

import { Gallery } from "@/components/Gallery";

import { getGalleryImages, getFirstGalleryImageSrc } from "@/lib/content/gallery";

import {
  estimateReadingMinutes,
  getAllTestSlugs,
  getRelatedTestsByBrand,
  getTestBySlug,
  injectInlineGalleryImages
} from "@/lib/content/testy";

import {
  toMetaDescription,
  organizationNode,
  websiteNode,
  personNode,
  breadcrumbNode,
  articleNode,
  jsonLdGraph,
  jsonLdScript
} from "@/lib/seo";

import { SITE_AUTHOR, SITE_NAME, SITE_URL } from "@/lib/site";



type TestPageProps = {
  params: Promise<{ slug: string }>;
};



export async function generateStaticParams() {
  const slugs = await getAllTestSlugs();
  return slugs.map((slug) => ({ slug }));
}



export async function generateMetadata({ params }: TestPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { meta } = await getTestBySlug(slug);

  const displayTitle = meta.headline ?? meta.title;
  const description = toMetaDescription(meta.lead);
  const heroImage =
    (await getFirstGalleryImageSrc(meta.galleryDir)) ?? undefined;
  const pageUrl = `${SITE_URL}/testy/${slug}`;

  return {
    title: displayTitle,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: displayTitle,
      description,
      url: pageUrl,
      type: "article",
      locale: "pl_PL",
      siteName: SITE_NAME,
      publishedTime: meta.publishedAt,
      authors: [SITE_AUTHOR.name],
      section: "Testy",
      tags: meta.tags,
      ...(heroImage && {
        images: [{ url: heroImage, alt: `${meta.brand} ${meta.model}`.trim() || displayTitle }]
      })
    },
    twitter: {
      card: heroImage ? "summary_large_image" : "summary",
      title: displayTitle,
      description
    }
  };
}



function SpecsList({ specs }: { specs: Array<{ label: string; value: string }> }) {
  return (
    <dl className="space-y-0">
      {specs.map((s) => (
        <div key={s.label} className="border-t border-soft py-5 first:border-t-0 first:pt-0">
          <dt className="label-mono text-stone-muted">{s.label}</dt>
          <dd className="mt-2 text-[0.9375rem] font-light leading-snug tracking-tight text-ink">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}



function ArticleMeta({
  brand,
  model,
  year,
  publishedAt,
  readingMinutes
}: {
  brand: string;
  model: string;
  year?: number;
  publishedAt: string;
  readingMinutes: number;
}) {
  const dateValid = publishedAt && !isNaN(Date.parse(publishedAt));
  const dateLabel = dateValid
    ? new Date(publishedAt).toLocaleDateString("pl-PL", { year: "numeric", month: "long" })
    : undefined;

  return (
    <div className="space-y-5">
      <p className="font-display display-track text-xl normal-case leading-tight tracking-wide text-ink subpixel-antialiased">
        {brand} {model}
        {year ? ` · ${year}` : ""}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="label-mono text-stone-muted">
          <span className="tabular-nums">{readingMinutes}</span> min czytania
        </p>

        {dateLabel && (
          <time
            dateTime={publishedAt}
            className="label-mono text-stone-muted"
          >
            {dateLabel}
          </time>
        )}
      </div>
    </div>
  );
}



export default async function TestPage({ params }: TestPageProps) {
  const { slug } = await params;
  const { meta, contentHtml } = await getTestBySlug(slug);
  const readingMinutes = estimateReadingMinutes(contentHtml);
  const relatedTests = await getRelatedTestsByBrand(slug, meta.brand, 3);
  const images = await getGalleryImages(meta.galleryDir);
  const heroImage = images[0]?.src ?? (await getFirstGalleryImageSrc(meta.galleryDir));
  const contentWithInlineImages = injectInlineGalleryImages(contentHtml, images);

  const displayTitle = meta.headline ?? meta.title;

  const specs = [
    meta.engine && { label: "Silnik", value: meta.engine },
    meta.power && { label: "Moc", value: meta.power },
    meta.torque && { label: "Moment", value: meta.torque },
    meta.gearbox && { label: "Skrzynia", value: meta.gearbox },
    meta.drivetrain && { label: "Napęd", value: meta.drivetrain },
    meta.bodyType && { label: "Nadwozie", value: meta.bodyType }
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const pageUrl = `${SITE_URL}/testy/${slug}`;
  const heroImageAbsolute = heroImage
    ? heroImage.startsWith("http")
      ? heroImage
      : `${SITE_URL}${heroImage}`
    : undefined;

  const ld = jsonLdGraph(
    organizationNode(),
    websiteNode(),
    personNode(),
    breadcrumbNode([
      { name: "Strona główna", url: SITE_URL },
      { name: "Testy", url: `${SITE_URL}/testy` },
      { name: displayTitle, url: pageUrl }
    ]),
    articleNode({
      title: displayTitle,
      description: toMetaDescription(meta.lead),
      url: pageUrl,
      brand: meta.brand,
      model: meta.model,
      year: meta.year,
      bodyType: meta.bodyType,
      engine: meta.engine,
      tags: meta.tags,
      publishedAt: meta.publishedAt,
      image: heroImageAbsolute
    })
  );

  const breadcrumbItems = [
    { name: "Strona główna", href: "/" },
    { name: "Testy", href: "/testy" },
    { name: `${meta.brand} ${meta.model}`.trim() }
  ];

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />

      {/* Hero: wideo (drift clip) lub zdjęcie */}
      {meta.heroVideoUrl ? (
        <div className="full-bleed relative aspect-[16/9] max-h-[90vh] w-full overflow-hidden">
          <video
            src={meta.heroVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            poster={meta.heroVideoPoster ?? heroImage ?? undefined}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/35 to-transparent" />
        </div>
      ) : heroImage ? (
        <div className="full-bleed relative aspect-[16/9] max-h-[90vh] w-full overflow-hidden">
          <Image
            src={heroImage}
            alt={`${meta.brand} ${meta.model} — ${displayTitle}`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/35 to-transparent" />
        </div>
      ) : null}

      {/* Mobile: single column — meta, breadcrumbs, title, specs, then prose */}

      <header className="bg-canvas px-gutter pb-8 pt-12 lg:hidden">
        <ArticleMeta
          brand={meta.brand}
          model={meta.model}
          year={meta.year}
          publishedAt={meta.publishedAt}
          readingMinutes={readingMinutes}
        />

        <div className="mt-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <h1 className="font-display display-track mt-3 text-display-lg uppercase text-ink">{displayTitle}</h1>

        {specs.length > 0 && (
          <div className="mt-10 border-t border-soft pt-8">
            <SpecsList specs={specs} />
          </div>
        )}
      </header>

      {/* Desktop: sticky sidebar + prose column */}

      <div className="bg-canvas px-gutter pb-24 pt-4 lg:pb-32 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] lg:gap-x-20 xl:grid-cols-[minmax(14rem,18rem)_minmax(0,44rem)] xl:gap-x-32">

          <aside className="hidden lg:block" aria-label="Metadane testu">
            <div className="sticky top-28 space-y-0 border-t border-soft pt-12">
              <ArticleMeta
                brand={meta.brand}
                model={meta.model}
                year={meta.year}
                publishedAt={meta.publishedAt}
                readingMinutes={readingMinutes}
              />

              {specs.length > 0 && (
                <div className="mt-10">
                  <SpecsList specs={specs} />
                </div>
              )}
            </div>
          </aside>

          <div className="min-w-0 lg:max-w-none">
            <header className="hidden border-b border-soft pb-16 lg:block">
              <Breadcrumbs items={breadcrumbItems} />
              <h1 className="font-display display-track text-display-lg uppercase text-ink">{displayTitle}</h1>
            </header>

            <section
              className="prose prose-article max-w-none font-light lg:max-w-[65ch] lg:pt-16"
              aria-label="Treść artykułu"
              dangerouslySetInnerHTML={{ __html: contentWithInlineImages }}
            />

            {/* Odtwarzacz pełnego filmu */}
            {meta.videoUrl && (
              <div className="mt-16 border-t border-soft pt-10">
                <p className="label-mono mb-5 text-stone-muted">Film z testu</p>
                <video
                  src={meta.videoUrl}
                  controls
                  poster={meta.heroVideoPoster ?? heroImage ?? undefined}
                  preload="metadata"
                  className="w-full rounded-none bg-ink lg:max-w-[65ch]"
                  style={{ aspectRatio: "16/9" }}
                >
                  Twoja przeglądarka nie obsługuje odtwarzacza wideo.
                </video>
              </div>
            )}

            {/* Author / E-E-A-T block */}

            <div className="mt-16 border-t border-soft pt-10">
              <p className="label-mono text-stone-muted">
                Tekst i zdjęcia ·{" "}
                <Link
                  href="/o-mnie"
                  className="editorial-link"
                >
                  Marcin Bochenek
                </Link>
              </p>
            </div>

            {meta.originalUrl && (
              <p className="mt-8 text-sm text-subtle">
                Pierwotna publikacja:{" "}
                <a
                  href={meta.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="editorial-link underline underline-offset-2"
                >
                  autoGaleria.pl
                </a>
              </p>
            )}
          </div>

        </div>
      </div>

      {images.length > 0 && (
        <section className="reveal-section bg-ink px-gutter py-24 md:py-32">
          <h2 className="label-mono mb-12 text-stone/55">Galeria · {images.length} zdjęć</h2>
          <Gallery images={images} dark />
        </section>
      )}

      {relatedTests.length > 0 && (
        <aside className="border-t border-soft bg-canvas px-gutter py-20 md:py-28">
          <h2 className="label-mono mb-12 text-stone-muted">Więcej testów · {meta.brand}</h2>
          <ul className="mx-auto max-w-3xl divide-y divide-line/80">
            {relatedTests.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/testy/${t.slug}`}
                  className="group flex flex-col gap-1 py-6 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <span className="font-display display-track text-lg uppercase transition-opacity duration-editorial group-hover:opacity-55">
                    {t.title}
                  </span>
                  <span className="label-mono text-stone-muted">{t.model}</span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
