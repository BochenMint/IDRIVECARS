import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView, buildArticleMetadata } from "@/components/ArticleView";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllArticleMetas, getArticleBySlug } from "@/lib/content/articles";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const metas = await getAllArticleMetas({ category: "blog" });
  return metas.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug, "blog");
  if (!article) return { title: "Blog" };
  const hero =
    article.meta.heroImage ??
    (await getFirstGalleryImageSrc(article.meta.galleryDir)) ??
    undefined;
  return buildArticleMetadata(article, hero);
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug, "blog");
  if (!article || article.meta.category !== "blog") notFound();
  return <ArticleView article={article} />;
}
