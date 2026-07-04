import Link from "next/link";
import { getAllArticleMetas, listArticleFiles } from "@/lib/content/articles";
import { getContentDraftItems, getNewsDraftItems } from "@/lib/content/admin-drafts";
import { CATEGORY_LABELS, categoryListingPath, ARTICLE_CATEGORIES } from "@/lib/content/categories";

export const metadata = { title: "Treści – panel | IDRIVECARS" };

export default async function AdminContentPage() {
  const files = await listArticleFiles();
  const [contentDraftCount, newsDraftCount] = await Promise.all([
    getContentDraftItems().then((d) => d.length),
    getNewsDraftItems().then((d) => d.length)
  ]);
  const byCategory = await Promise.all(
    ARTICLE_CATEGORIES.filter((c) => c !== "news").map(async (cat) => ({
      cat,
      count: (await getAllArticleMetas({ category: cat, includeDrafts: true })).length
    }))
  );

  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Zarządzanie treścią</h1>
        <p className="mt-2 text-sm text-neutral-600">
          File-based CMS — pliki MDX w <code className="rounded bg-neutral-100 px-1">content/</code>.
          Pełna dokumentacja:{" "}
          <code className="rounded bg-neutral-100 px-1">docs/CMS-ADMIN.md</code> i{" "}
          <code className="rounded bg-neutral-100 px-1">content/IMPORT-FORMAT.md</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {byCategory.map(({ cat, count }) => (
          <Link
            key={cat}
            href={categoryListingPath(cat)}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <h2 className="font-semibold text-neutral-900">{CATEGORY_LABELS[cat]}</h2>
            <p className="mt-1 text-2xl tabular-nums text-neutral-800">{count}</p>
            <p className="mt-2 text-xs text-neutral-500">Podgląd na stronie →</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-neutral-900">Szkice (draft)</h2>
            <p className="mt-1 text-sm text-neutral-600">
              {contentDraftCount} artykułów CMS + {newsDraftCount} newsów MDX — nie widoczne publicznie.
            </p>
          </div>
          <Link
            href="/admin/content/drafts"
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium hover:bg-amber-50"
          >
            Lista szkiców →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold text-neutral-900">Walidacja przed publikacją</h2>
        <p className="mt-2 text-sm text-neutral-600">
          W terminalu projektu uruchom:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-900 p-4 text-sm text-neutral-100">
          npm run validate:content
        </pre>
        <p className="mt-3 text-sm text-neutral-500">
          Łącznie plików w repozytorium: <strong>{files.length}</strong> (testy + blog + felieton).
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold text-neutral-900">Import treści</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-neutral-600">
          <li>
            <code>npm run import:local</code> — Word/txt z dysku MARCIN
          </li>
          <li>
            <code>npm run import:ag</code> — folder TESTY / autoGaleria
          </li>
          <li>
            <code>npm run fetch:autogaleria</code> — pobieranie z autogaleria.pl
          </li>
          <li>Worker importu: format JSON → MDX według IMPORT-FORMAT.md</li>
        </ul>
      </div>
    </section>
  );
}
