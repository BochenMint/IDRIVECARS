import type { Metadata } from "next";
import { ArticleListing } from "@/components/ArticleListing";
import { CATEGORY_DESCRIPTIONS } from "@/lib/content/categories";
import { getAllArticleMetas } from "@/lib/content/articles";

export async function generateMetadata(): Promise<Metadata> {
  const posts = await getAllArticleMetas({ category: "blog" });
  return {
    title: "Blog",
    description: CATEGORY_DESCRIPTIONS.blog,
    robots: posts.length > 0 ? { index: true, follow: true } : { index: false, follow: true }
  };
}

export default function BlogPage() {
  return <ArticleListing category="blog" />;
}
