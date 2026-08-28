import type { Metadata } from "next";
import { ArticleListing } from "@/components/ArticleListing";
import { CATEGORY_DESCRIPTIONS } from "@/lib/content/categories";
import { pageCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Testy",
  description: CATEGORY_DESCRIPTIONS.test,
  ...pageCanonical("/testy")
};

export default function TestsPage() {
  return <ArticleListing category="test" />;
}
