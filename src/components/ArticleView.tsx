import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Gallery } from "@/components/Gallery";
import { WallpapersSection } from "@/components/WallpapersSection";
import { getGalleryImages, getFirstGalleryImageSrc } from "@/lib/content/gallery";
import {
  articlePublicPath,
  categoryListingPath,
  CATEGORY_LABELS,
  type ArticleCategory
} from "@/lib/content/categories";
import {
  estimateReadingMinutes,
  getArticleUrl,
  getRelatedArticlesByBrand
} from "@/lib/content/articles";
import type { Article } from "@/lib/content/types-article";
import {
  absoluteUrl,
  articleNode,
  breadcrumbNode,
  jsonLdGraph,
  jsonLdScript,
  organizationNode,
  personNode,
  toMetaDescription,
  websiteNode
} from "@/lib/seo";
import { SITE_AUTHOR, SITE_NAME, SITE_URL } from "@/lib/site";
import { injectInlineGalleryImages } from "@/lib/content/testy";

type ArticleViewProps = {
  article: Article;
};

function SpecsList({ specs }: { specs: Array<{ label: string; value: string }> }) {
  return (
    <dl className="space-y-0">
      {specs.map((s) => (
        <div key={s.label} className="border-t border-soft py-5 first:border-t-0 first:pt-0">
          <dt className="label-mono text-stone-muted">{s.label}</dt>
          <dd className="mt-2 text-[0.9375rem] font-light leading-snug tracking-tight text-ink">
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ArticleMetaBlock({
  meta,
  readingMinutes
}: {
  meta: Article["meta"];
  readingMinutes: number;
}) {
  const dateValid = meta.publishedAt && !Number.isNaN(Date.parse(meta.publishedAt));
  const dateLabel = dateValid
    ? new Date(meta.publishedAt).toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long"
      })
    : undefined;

  const showVehicle = meta.brand && meta.model;

  return (
    <div className="space-y-5">
      {showVehicle && (
        <p className="font-display display-track text-xl normal-case leading-tight tracking-wide text-ink subpixel-antialiased">
          {meta.brand} {meta.model}
          {meta.year ? ` · ${meta.year}` : ""}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="label-mono text-stone-muted">
          <span className="tabular-nums">{readingMinutes}</span> min czytania
        </p>
        {dateLabel && (
          <time dateTime={meta.publishedAt} className="label-mono text-stone-muted">
            {dateLabel}
          </time>
        )}
        <p className="label-mono text-stone-muted">{meta.author}</p>
      </div>
    </div>
  );
}

function schemaTypeForCategory(
  category: ArticleCategory
): "BlogPosting" | "NewsArticle" | "Article" {
  if (category === "news") return "NewsArticle";
  if (category === "blog" || category === "felieton") return "Article";
  return "BlogPosting";
}

export async function ArticleView({ article }: ArticleViewProps) {
  const { meta, contentHtml, wallpapers: isWallpapers } = article;
  if (meta.status === "draft" || meta.status === "archived") notFound();

  const readingMinutes = estimateReadingMinutes(contentHtml);
  const relatedTests =
    meta.brand && (meta.category === "test" || meta.category === "pierwsza-jazda")
      ? await getRelatedArticlesByBrand(meta.slug, meta.brand, 3)
      : [];

  const images = await getGalleryImages(meta.galleryDir);
  const heroFromGallery = images[0]?.src ?? (await getFirstGalleryImageSrc(meta.galleryDir));
  const heroImage =
    meta.heroImage?.startsWith("/")
      ? meta.heroImage
      : meta.heroImage
        ? `/${meta.heroImage.replace(/^\/+/, "")}`
        : heroFromGallery;
  const contentWithInlineImages = isWallpapers
    ? contentHtml
    : injectInlineGalleryImages(contentHtml, images);
  const displayTitle = meta.headline ?? meta.seoTitle ?? meta.title;
  const description = toMetaDescription(meta.seoDescription ?? meta.lead);
  const pageUrl = getArticleUrl(meta, SITE_URL);
  const categoryLabel = CATEGORY_LABELS[meta.category];
  const listingPath = categoryListingPath(meta.category);

  const specs = [
    meta.engine && { label: "Silnik", value: meta.engine },
    meta.power && { label: "Moc", value: meta.power },
    meta.torque && { label: "Moment", value: meta.torque },
    meta.gearbox && { label: "Skrzynia", value: meta.gearbox },
    meta.drivetrain && { label: "Napęd", value: meta.drivetrain },
    meta.bodyType && { label: "Nadwozie", value: meta.bodyType }
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const heroImageAbsolute = absoluteUrl(heroImage);

  const ld = jsonLdGraph(
    organizationNode(),
    websiteNode(),
    personNode(),
    breadcrumbNode([
      { name: "Strona główna", url: SITE_URL },
      { name: categoryLabel, url: `${SITE_URL}${listingPath}` },
      { name: displayTitle, url: pageUrl }
    ]),
    articleNode({
      title: displayTitle,
      description,
      url: pageUrl,
      category: meta.category,
      schemaType: schemaTypeForCategory(meta.category),
      brand: meta.brand,
      model: meta.model,
      year: meta.year,
      bodyType: meta.bodyType,
      engine: meta.engine,
      tags: meta.tags,
      publishedAt: meta.publishedAt,
      modifiedAt: meta.updatedAt,
      image: heroImageAbsolute,
      authorName: meta.author
    })
  );

  const breadcrumbItems = [
    { name: "Strona główna", href: "/" },
    { name: categoryLabel, href: listingPath },
    { name: displayTitle }
  ];

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
      />

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
            aria-label={`Wideo: ${displayTitle}`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/35 to-transparent" />
        </div>
      ) : heroImage ? (
        <div className="full-bleed relative aspect-[16/9] max-h-[90vh] w-full overflow-hidden">
          <Image
            src={heroImage}
            alt={`${meta.brand ?? ""} ${meta.model ?? ""} — ${displayTitle}`.trim()}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/35 to-transparent" />
        </div>
      ) : null}

      <header className="bg-canvas px-gutter pb-8 pt-12 lg:hidden">
        <ArticleMetaBlock meta={meta} readingMinutes={readingMinutes} />
        <div className="mt-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        <h1 className="font-display display-track mt-3 text-display-lg uppercase text-ink">
          {displayTitle}
        </h1>
        {meta.lead && (
          <p className="mt-6 max-w-2xl text-lead font-light text-subtle">{meta.lead}</p>
        )}
        {specs.length > 0 && (
          <div className="mt-10 border-t border-soft pt-8">
            <SpecsList specs={specs} />
          </div>
        )}
      </header>

      <div className="bg-canvas px-gutter pb-24 pt-4 lg:pb-32 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] lg:gap-x-20 xl:grid-cols-[minmax(14rem,18rem)_minmax(0,44rem)] xl:gap-x-32">
          <aside className="hidden lg:block" aria-label="Metadane artykułu">
            <div className="sticky top-28 space-y-0 border-t border-soft pt-12">
              <ArticleMetaBlock meta={meta} readingMinutes={readingMinutes} />
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
              <h1 className="font-display display-track text-display-lg uppercase text-ink">
                {displayTitle}
              </h1>
              {meta.lead && (
                <p className="mt-6 max-w-2xl text-lead font-light text-subtle">{meta.lead}</p>
              )}
            </header>

            <section
              className="prose prose-article max-w-none font-light lg:max-w-[65ch] lg:pt-16"
              aria-label="Treść artykułu"
              dangerouslySetInnerHTML={{ __html: contentWithInlineImages }}
            />

            {meta.videoUrl && (
              <div className="mt-16 border-t border-soft pt-10">
                <p className="label-mono mb-5 text-stone-muted">Film</p>
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

            <div className="mt-16 border-t border-soft pt-10">
              <p className="label-mono text-stone-muted">
                Tekst
                {images.length > 0 ? " i zdjęcia" : ""} ·{" "}
                <Link href="/o-mnie" className="editorial-link">
                  {SITE_AUTHOR.name}
                </Link>
              </p>
              {meta.tags && meta.tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tagi">
                  {meta.tags.map((tag) => (
                    <li
                      key={tag}
                      className="label-mono border border-soft px-2 py-1 text-stone-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
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
                  {(() => {
                    try {
                      return new URL(meta.originalUrl).hostname.replace(/^www\./, "");
                    } catch {
                      return meta.originalUrl;
                    }
                  })()}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {images.length > 0 &&
        (isWallpapers ? (
          <WallpapersSection images={images} title={displayTitle} />
        ) : (
          <section
            className="reveal-section bg-ink px-gutter py-24 md:py-32"
            aria-label="Galeria zdjęć"
          >
            <h2 className="label-mono mb-12 text-stone/55">Galeria · {images.length} zdjęć</h2>
            <Gallery images={images} dark />
          </section>
        ))}

      {relatedTests.length > 0 && meta.brand && (
        <aside className="border-t border-soft bg-canvas px-gutter py-20 md:py-28">
          <h2 className="label-mono mb-12 text-stone-muted">Więcej artykułów · {meta.brand}</h2>
          <ul className="mx-auto max-w-3xl divide-y divide-line/80">
            {relatedTests.map((t) => (
              <li key={t.slug}>
                <Link
                  href={articlePublicPath(t.category, t.slug)}
                  className="group flex flex-col gap-1 py-6 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <span className="font-display display-track text-lg uppercase transition-opacity duration-editorial group-hover:opacity-55">
                    {t.title}
                  </span>
                  {t.model && <span className="label-mono text-stone-muted">{t.model}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}

export function buildArticleMetadata(article: Article, heroImage?: string) {
  const { meta } = article;
  const displayTitle = meta.headline ?? meta.seoTitle ?? meta.title;
  const description = toMetaDescription(meta.seoDescription ?? meta.lead);
  const pageUrl = meta.canonicalUrl?.startsWith("http")
    ? meta.canonicalUrl
    : getArticleUrl(meta, SITE_URL);

  return {
    title: meta.seoTitle ?? displayTitle,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: meta.seoTitle ?? displayTitle,
      description,
      url: pageUrl,
      type: "article" as const,
      locale: "pl_PL",
      siteName: SITE_NAME,
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt ?? meta.publishedAt,
      authors: [meta.author],
      section: CATEGORY_LABELS[meta.category],
      tags: meta.tags,
      ...(heroImage && {
        images: [{ url: absoluteUrl(heroImage) ?? heroImage, alt: displayTitle }]
      })
    },
    twitter: {
      card: (heroImage ? "summary_large_image" : "summary") as "summary_large_image" | "summary",
      title: meta.seoTitle ?? displayTitle,
      description,
      ...(heroImage && { images: [absoluteUrl(heroImage) ?? heroImage] })
    },
    robots:
      meta.status === "published"
        ? { index: true, follow: true }
        : { index: false, follow: false }
  };
}
