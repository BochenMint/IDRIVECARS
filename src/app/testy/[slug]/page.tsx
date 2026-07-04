import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView, buildArticleMetadata } from "@/components/ArticleView";
import { getFirstGalleryImageSrc } from "@/lib/content/gallery";
import { getAllArticleMetas, getArticleBySlug } from "@/lib/content/articles";

type TestPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const metas = await getAllArticleMetas();
  return metas
    .filter((m) => m.contentDir === "testy")
    .map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: TestPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug, "testy");
  if (!article) return { title: "Artykuł nie znaleziony" };

  const heroImage =
    article.meta.heroImage ??
    (await getFirstGalleryImageSrc(article.meta.galleryDir)) ??
    undefined;

  return buildArticleMetadata(article, heroImage ?? undefined);
}

export default async function TestPage({ params }: TestPageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug, "testy");
  if (!article) notFound();

  return <ArticleView article={article} />;
}
