import Link from "next/link";
import { getNewsItems } from "@/lib/content/news";
import { NewsQueueRow } from "./NewsQueueRow";

export const metadata = { title: "News – panel | IDRIVECARS" };

export default async function AdminNewsPage() {
  const items = await getNewsItems(20);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl tracking-tight">Moduł News</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/news/sources"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Źródła RSS
          </Link>
          <Link
            href="/admin/news/press"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Serwisy prasowe producentów
          </Link>
          <span className="rounded-lg bg-neutral-200 px-4 py-2 text-sm text-neutral-600" title="Uruchom w terminalu: npm run fetch:news">
            Pobierz teraz → npm run fetch:news
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold text-neutral-900">Kolejka newsów (ostatnie 20)</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Oznacz „Warto napisać” lub „Pomiń”. Decyzje zapisują się w{" "}
          <code className="rounded bg-neutral-100 px-1">content/news-decisions.json</code> i służą
          do uczenia modelu AI w kierunku pełnej automatyzacji. Styl pisania: inspirowany Twoimi
          artykułami z działu Testy (konkret, pierwsza osoba, krótkie akapity).
        </p>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Brak opublikowanych newsów.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((n) => (
              <NewsQueueRow key={n.slug} item={n} />
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold text-neutral-900">Automatyczne publikowanie</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-neutral-600">
          <li>Źródła RSS: <code>content/news-sources.json</code>. Serwisy prasowe producentów + loginy: <Link href="/admin/news/press" className="text-neutral-900 underline">Serwisy prasowe</Link>.</li>
          <li>Cron (np. codziennie): <code>npm run fetch:news</code> lub API z zewnętrznego crona.</li>
          <li>Decyzje „warto” / „pomiń” w <code>content/news-decisions.json</code> – eksport do treningu AI.</li>
        </ul>
      </div>
    </section>
  );
}
