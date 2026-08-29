import Link from "next/link";
import { getAllNewsItems } from "@/lib/content/news";
import { NewsQueueRow } from "./NewsQueueRow";

export const metadata = { title: "News – panel | IDRIVECARS" };

export default async function AdminNewsPage() {
  const items = await getAllNewsItems(30);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl tracking-tight">Moduł News</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/news/review"
            className="rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Review kolejki
          </Link>
          <Link
            href="/admin/news/sources"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Katalog źródeł
          </Link>
          <Link
            href="/admin/news/press"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Loginy press roomów
          </Link>
          <span className="rounded-lg bg-neutral-200 px-4 py-2 text-sm text-neutral-600" title="Uruchom w terminalu: npm run news:scan">
            Skan → npm run news:scan
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
          <li>Review kolejki: <Link href="/admin/news/review" className="text-neutral-900 underline">/admin/news/review</Link></li>
          <li>Katalog źródeł: <code>content/news-catalog/sources.json</code></li>
          <li>Skan: <code>npm run news:scan</code> → surowe dane w <code>data/news/</code></li>
          <li>AI: <code>npm run news:ai-prepare</code> → prompty w <code>data/news/ai-jobs/</code></li>
          <li>Publikacja tylko po review — status <code>review</code> / <code>draft</code> nie trafia na /news</li>
          <li>
            Dokumentacja: <code>docs/NEWS-AUTOMATION.md</code>,{" "}
            <code>docs/PRODUCTION-SMOKE-RUNBOOK.md</code>
          </li>
        </ul>
      </div>
    </section>
  );
}
