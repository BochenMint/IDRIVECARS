import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView, buildArticleMetadata } from "@/components/ArticleView";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllArticleMetas, getArticleBySlug } from "@/lib/content/articles";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const metas = await getAllArticleMetas({ category: "felieton" });
  return metas.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug, "felieton");
  if (!article) return { title: "Felieton" };
  const hero =
    article.meta.heroImage ??
    (await getFirstGalleryImageSrc(article.meta.galleryDir)) ??
    undefined;
  return buildArticleMetadata(article, hero);
}

export default async function FelietonArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug, "felieton");
  if (!article || article.meta.category !== "felieton") notFound();
  return <ArticleView article={article} />;
}
