import type { Metadata } from "next";
import { Gallery } from "@/components/Gallery";
import { getGalleryImages } from "@/lib/content/gallery";
import { getAllTestSlugs, getTestBySlug, injectInlineGalleryImages } from "@/lib/content/testy";

export const dynamic = "force-dynamic";

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

  const title = `${meta.brand} ${meta.model} – ${meta.title}`;
  const description = meta.lead ?? meta.title;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article"
    }
  };
}

export default async function TestPage({ params }: TestPageProps) {
  const { slug } = await params;
  const { meta, contentHtml } = await getTestBySlug(slug);
  const images = await getGalleryImages(meta.galleryDir);
  const contentWithInlineImages = injectInlineGalleryImages(contentHtml, images);

  return (
    <article className="space-y-12">
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

