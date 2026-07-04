import type { Metadata } from "next";
import { ArticleListing } from "@/components/ArticleListing";
import { CATEGORY_DESCRIPTIONS } from "@/lib/content/categories";

export const metadata: Metadata = {
  title: "Testy",
  description: CATEGORY_DESCRIPTIONS.test
};

export default function TestsPage() {
  return <ArticleListing category="test" />;
}
