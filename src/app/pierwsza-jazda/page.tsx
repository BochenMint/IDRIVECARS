import type { Metadata } from "next";
import { ArticleListing } from "@/components/ArticleListing";
import { CATEGORY_DESCRIPTIONS } from "@/lib/content/categories";

export const metadata: Metadata = {
  title: "Pierwsza jazda",
  description: CATEGORY_DESCRIPTIONS["pierwsza-jazda"]
};

export default function PierwszaJazdaPage() {
  return <ArticleListing category="pierwsza-jazda" />;
}
