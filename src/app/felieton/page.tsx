import type { Metadata } from "next";
import { ArticleListing } from "@/components/ArticleListing";
import { CATEGORY_DESCRIPTIONS } from "@/lib/content/categories";
import { pageCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Felietony",
  description: CATEGORY_DESCRIPTIONS.felieton,
  ...pageCanonical("/felieton")
};

export default function FelietonPage() {
  return <ArticleListing category="felieton" />;
}
