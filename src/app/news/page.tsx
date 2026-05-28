import Link from "next/link";
import { getNewsItems } from "@/lib/content/news";
import { AdSlot } from "@/components/AdSlot";

export const metadata = {
  title: "News motoryzacyjne",
  description: "Najnowsze wiadomości ze świata motoryzacji – premiery, rynek, przepisy."
};

export default async function NewsPage() {
  const items = await getNewsItems(30);

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Kategoria</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">News</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-600">
          Krótkie informacje z rynku motoryzacyjnego – agregowane automatycznie z wybranych źródeł.
          Pełne treści znajdziesz u oryginalnych wydawców.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {items.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Brak opublikowanych newsów. W panelu administracyjnym możesz skonfigurować źródła RSS
              i uruchomić pobieranie.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((n) => (
                <li key={n.slug}>
                  <article className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <time
                      className="block text-xs text-neutral-500"
                      dateTime={n.publishedAt}
                    >
                      {new Date(n.publishedAt).toLocaleDateString("pl-PL", {
                        dateStyle: "medium"
                      })}
                    </time>
                    <h2 className="mt-1 font-semibold leading-snug">
                      <Link
                        href={n.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {n.title}
                      </Link>
                    </h2>
                    {n.lead && (
                      <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{n.lead}</p>
                    )}
                    <p className="mt-2 text-xs text-neutral-400">
                      Źródło: {n.sourceName}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="space-y-6">
          <AdSlot slotId="sidebar-top" format="medium-rectangle" />
          <AdSlot slotId="sidebar-sticky" format="sidebar-sticky" />
        </aside>
      </div>
    </section>
  );
}
