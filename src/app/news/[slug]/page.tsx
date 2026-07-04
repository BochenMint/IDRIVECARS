import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsBySlug, getNewsItems } from "@/lib/content/news";
import { buildNewsArticleJsonLd, buildNewsCanonicalUrl } from "@/lib/news/seo";
import { AdSlot } from "@/components/AdSlot";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { jsonLdScript } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const items = await getNewsItems(500);
  return items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item || item.status !== "published") return { title: "News | IDRIVECARS" };
  const canonical = item.canonicalUrl ?? buildNewsCanonicalUrl(slug);
  return {
    title: item.seoTitle ?? `${item.title} | News`,
    description: item.seoDescription ?? item.lead,
    alternates: { canonical }
  };
}

export default async function NewsSlugPage({ params }: Props) {
  const { slug } = await params;
  const item = await getNewsBySlug(slug);
  if (!item || item.status !== "published") notFound();

  const jsonLd = buildNewsArticleJsonLd(item);

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
              { name: item.title }
            ]}
          />
          <p className="label-mono mt-8 text-stone-muted">News</p>
          <time dateTime={item.publishedAt} className="label-mono mt-4 block text-stone-muted">
            {new Date(item.publishedAt).toLocaleDateString("pl-PL", { dateStyle: "long" })}
          </time>
          <h1 className="font-display display-track mt-6 text-display-lg uppercase text-ink">
            {item.title}
          </h1>
          {item.lead && (
            <p className="mt-6 text-lead font-light text-subtle">{item.lead}</p>
          )}
          <div className="py-10">
            <AdSlot slotId="in-article" format="in-article" />
          </div>
          <p className="text-sm text-subtle">
            Pełna treść:{" "}
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="editorial-link underline underline-offset-2"
            >
              {item.sourceName}
            </a>
          </p>
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
