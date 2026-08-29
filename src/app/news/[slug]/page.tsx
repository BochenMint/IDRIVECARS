import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsArticleBySlug, getNewsItems } from "@/lib/content/news";
import { buildNewsArticleJsonLd, buildNewsMetadata } from "@/lib/news/seo";
import { AdSlot } from "@/components/AdSlot";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { jsonLdScript, toPlainText } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const items = await getNewsItems(500);
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);
  if (!article || article.status !== "published") return { title: "News | IDRIVECARS" };
  return buildNewsMetadata(article);
}

export default async function NewsSlugPage({ params }: Props) {
  const { slug } = await params;
  const article = await getNewsArticleBySlug(slug);
  if (!article || article.status !== "published") notFound();

  const jsonLd = buildNewsArticleJsonLd(article);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <article className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs
            items={[
              { name: "Strona główna", href: "/" },
              { name: "News", href: "/news" },
              { name: article.title }
            ]}
          />
          <p className="label-mono mt-8 text-stone-muted">News</p>
          <time dateTime={article.publishedAt} className="label-mono mt-4 block text-stone-muted">
            {new Date(article.publishedAt).toLocaleDateString("pl-PL", { dateStyle: "long" })}
          </time>
          <h1 className="font-display display-track mt-6 text-display-lg uppercase text-ink">
            {article.title}
          </h1>
          {article.lead && (
            <p className="mt-6 text-lead font-light text-subtle">{toPlainText(article.lead)}</p>
          )}
          {article.sourceUrl && (
            <p className="mt-6 text-sm text-subtle">
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="editorial-link underline underline-offset-2"
              >
                Komunikat producenta
              </a>
              {article.sourceName ? ` · ${article.sourceName}` : ""}
            </p>
          )}
          <div className="py-10">
            <AdSlot
              slotId="in-article"
              format="in-article"
              slotIndex={0}
              pageKey={`/news/${slug}`}
            />
          </div>
          {article.contentHtml && (
            <section
              className="prose prose-article max-w-none font-light"
              aria-label="Treść depeszy"
              dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            />
          )}
          {article.tags && article.tags.length > 0 && (
            <ul className="mt-12 flex flex-wrap gap-2 border-t border-soft pt-10" aria-label="Tagi">
              {article.tags.map((tag) => (
                <li key={tag} className="label-mono border border-soft px-2 py-1">
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/news"
            className="label-mono mt-10 inline-block text-stone-muted transition-opacity hover:opacity-70"
          >
            ← Wszystkie newsy
          </Link>
        </div>
      </article>
    </>
  );
}
