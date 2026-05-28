import type { Metadata } from "next";
import { Gallery } from "@/components/Gallery";
import { getGalleryImages, getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllTestSlugs, getTestBySlug, injectInlineGalleryImages } from "@/lib/content/testy";
import { SITE_URL } from "@/lib/site";

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
  const description = meta.lead ?? meta.title;
  const heroImage =
    (await getFirstGalleryImageSrc(meta.galleryDir)) ?? undefined;
  const pageUrl = `${SITE_URL}/testy/${slug}`;

  return {
    title: meta.title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: meta.title,
      description,
      url: pageUrl,
      type: "article",
      locale: "pl_PL",
      ...(heroImage && {
        images: [{ url: heroImage, alt: `${meta.brand} ${meta.model}`.trim() || meta.title }]
      })
    },
    twitter: {
      card: heroImage ? "summary_large_image" : "summary",
      title: meta.title,
      description
    }
  };
}

export default async function TestPage({ params }: TestPageProps) {
  const { slug } = await params;
  const { meta, contentHtml } = await getTestBySlug(slug);
  const images = await getGalleryImages(meta.galleryDir);
  const heroImage = images[0]?.src ?? (await getFirstGalleryImageSrc(meta.galleryDir));
  const contentWithInlineImages = injectInlineGalleryImages(contentHtml, images);

  const specs = [
    meta.engine && { label: "Silnik", value: meta.engine },
    meta.power && { label: "Moc", value: meta.power },
    meta.torque && { label: "Moment", value: meta.torque },
    meta.gearbox && { label: "Skrzynia", value: meta.gearbox },
    meta.drivetrain && { label: "Napęd", value: meta.drivetrain },
    meta.bodyType && { label: "Nadwozie", value: meta.bodyType }
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <article>
      {heroImage && (
        <div className="full-bleed relative aspect-[16/9] max-h-[85vh] w-full bg-ink">
          <img
            src={heroImage}
            alt={`${meta.brand} ${meta.model} — ${meta.title}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <header className="px-gutter pb-12 pt-12">
        <p className="label-mono mb-4 text-subtle">
          {meta.brand} {meta.model} {meta.year ?? ""}
        </p>
        <h1 className="font-display text-display-lg uppercase">{meta.title}</h1>

        {specs.length > 0 && (
          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-line pt-8 sm:grid-cols-3 lg:grid-cols-6">
            {specs.map((s) => (
              <div key={s.label}>
                <dt className="label-mono text-subtle">{s.label}</dt>
                <dd className="mt-1 text-sm font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <div className="mx-auto max-w-3xl px-gutter pb-20">
        <section
          className="prose prose-article max-w-none"
          aria-label="Treść artykułu"
          dangerouslySetInnerHTML={{ __html: contentWithInlineImages }}
        />

        {meta.originalUrl && (
          <p className="mt-16 border-t border-line pt-8 text-sm text-subtle">
            Pierwotna publikacja:{" "}
            <a href={meta.originalUrl} target="_blank" rel="noreferrer" className="underline">
              autoGaleria.pl
            </a>
          </p>
        )}
      </div>

      {images.length > 0 && (
        <section className="border-t border-line bg-ink px-gutter py-16">
          <h2 className="label-mono mb-8 text-white/50">Galeria · {images.length} zdjęć</h2>
          <Gallery images={images} dark />
        </section>
      )}
    </article>
  );
}
