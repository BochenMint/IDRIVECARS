import type { Metadata } from "next";
import { ArticleListing } from "@/components/ArticleListing";
import { CATEGORY_DESCRIPTIONS } from "@/lib/content/categories";
import { pageCanonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pierwsza jazda",
  description: CATEGORY_DESCRIPTIONS["pierwsza-jazda"],
  ...pageCanonical("/pierwsza-jazda")
};

export default function PierwszaJazdaPage() {
  return <ArticleListing category="pierwsza-jazda" />;
}
