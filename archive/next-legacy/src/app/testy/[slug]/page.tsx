import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { JsonLd } from "@/components/JsonLd";
import { getFirstGalleryImageSrc, getGalleryImages } from "@/lib/content/gallery";
import { getAllTestSlugs, getTestBySlug, injectInlineGalleryImages } from "@/lib/content/testy";
import { articleSchema, breadcrumbSchema } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

type TestPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllTestSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: TestPageProps): Promise<Metadata> {
  const { slug } = await params;
  let meta;
  try {
    ({ meta } = await getTestBySlug(slug));
  } catch {
    return { title: "Nie znaleziono testu" };
  }

  const title = `${meta.brand} ${meta.model} – ${meta.title}`;
  const description = meta.lead ?? meta.title;
  const canonical = `/testy/${meta.slug}`;
  const heroImage = await getFirstGalleryImageSrc(meta.galleryDir);
  const ogImage = heroImage ?? siteConfig.ogImage;
  const keywords = [
    meta.brand,
    meta.model,
    meta.version,
    `test ${meta.brand} ${meta.model}`,
    "recenzja",
    ...(meta.tags ?? [])
  ].filter((v): v is string => Boolean(v));

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      publishedTime: meta.publishedAt,
      authors: ["Marcin Bochenek"],
      section: "Testy samochodów",
      tags: meta.tags,
      images: [{ url: ogImage }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage]
    }
  };
}

export default async function TestPage({ params }: TestPageProps) {
  const { slug } = await params;
  let meta;
  let contentHtml: string;
  try {
    ({ meta, contentHtml } = await getTestBySlug(slug));
  } catch {
    notFound();
  }
  const images = await getGalleryImages(meta.galleryDir);
  const contentWithInlineImages = injectInlineGalleryImages(contentHtml, images);
  const heroImage = images[0]?.src ?? null;

  return (
    <article className="space-y-12">
      <JsonLd
        data={[
          articleSchema(meta, heroImage),
          breadcrumbSchema([
            { name: "Strona główna", path: "/" },
            { name: "Testy", path: "/testy" },
            { name: `${meta.brand} ${meta.model}`, path: `/testy/${meta.slug}` }
          ])
        ]}
      />
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
          Test • {meta.brand} {meta.model} {meta.year ?? ""}
        </p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{meta.title}</h1>
        <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
          {meta.engine && <span>Silnik: {meta.engine}</span>}
          {meta.power && <span>Moc: {meta.power}</span>}
          {meta.gearbox && <span>Skrzynia: {meta.gearbox}</span>}
          {meta.drivetrain && <span>Napęd: {meta.drivetrain}</span>}
          {meta.bodyType && <span>Nadwozie: {meta.bodyType}</span>}
          {meta.publishedAt && (
            <span>
              Data publikacji:{" "}
              {new Date(meta.publishedAt).toLocaleDateString("pl-PL", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[65ch]">
        <section
          className="prose prose-article prose-neutral max-w-none prose-headings:font-display prose-headings:tracking-tight prose-a:text-neutral-900 prose-a:underline-offset-4 hover:prose-a:underline"
          aria-label="Treść artykułu"
          dangerouslySetInnerHTML={{ __html: contentWithInlineImages }}
        />
      </div>

      {meta.originalUrl && (
        <p className="border-t border-neutral-200 pt-8 text-xs text-neutral-500">
          Tekst w pierwotnej formie ukazał się na portalu{" "}
          <a href={meta.originalUrl} target="_blank" rel="noreferrer">
            autoGALERIA.pl
          </a>{" "}
          jako materiał autorstwa Marcina Bochenka.
        </p>
      )}

      {images.length > 0 && (
        <section className="border-t border-neutral-200 pt-12">
          <h2 className="font-display text-2xl tracking-tight text-neutral-900">
            Pełna galeria zdjęć
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Wszystkie zdjęcia z testu w jednym miejscu – powiększ klikając w miniaturę.
          </p>
          <div className="mt-6">
            <Gallery images={images} />
          </div>
        </section>
      )}
    </article>
  );
}

