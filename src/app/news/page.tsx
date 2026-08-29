import type { Metadata } from "next";
import Link from "next/link";
import { getNewsItems } from "@/lib/content/news";
import { AdSlot } from "@/components/AdSlot";
import { pageCanonical, toPlainText } from "@/lib/seo";

export const metadata: Metadata = {
  title: "News motoryzacyjne",
  description: "Najnowsze wiadomości ze świata motoryzacji — premiery, rynek, przepisy.",
  ...pageCanonical("/news")
};

export default async function NewsPage() {
  const items = await getNewsItems(30);

  return (
    <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
      <header className="reveal-section mb-20 border-b border-soft pb-16 md:mb-28 md:pb-20">
        <p className="label-mono mb-8">Wiadomości</p>
        <h1 className="font-display display-track text-display-lg uppercase text-ink">
          News
        </h1>
        <p className="mt-8 max-w-md text-lead font-light text-subtle">
          Krótkie depesze z rynku motoryzacyjnego — premiery, sprzedaż, strategia producentów.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
        <div>
          {items.length === 0 ? (
            <p className="py-8 font-light text-subtle">
              Brak opublikowanych newsów. Wróć wkrótce — sekcja jest aktualizowana na bieżąco.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((n) => (
                <li key={n.slug}>
                  <article className="py-10 md:py-12">
                    <time className="label-mono" dateTime={n.publishedAt}>
                      {new Date(n.publishedAt).toLocaleDateString("pl-PL", {
                        dateStyle: "medium"
                      })}
                    </time>
                    <h2 className="mt-5 font-display display-track text-display-md uppercase leading-[0.95]">
                      <Link
                        href={`/news/${n.slug}`}
                        className="text-ink transition-opacity duration-editorial hover:opacity-55"
                      >
                        {n.title}
                      </Link>
                    </h2>
                    {n.lead && (
                      <p className="mt-4 line-clamp-2 font-light text-subtle">
                        <Link href={`/news/${n.slug}`} className="hover:text-ink">
                          {toPlainText(n.lead)}
                        </Link>
                      </p>
                    )}
                    {n.sourceUrl && (
                      <p className="label-mono mt-5">
                        Źródło:{" "}
                        <a
                          href={n.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 transition-opacity hover:opacity-70"
                        >
                          {n.sourceName || "komunikat producenta"}
                        </a>
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-6 border-t border-soft pt-8 lg:border-t-0 lg:pt-0">
          <AdSlot slotId="sidebar-top" format="medium-rectangle" />
          <AdSlot slotId="sidebar-sticky" format="sidebar-sticky" />
        </aside>
      </div>
    </div>
  );
}
