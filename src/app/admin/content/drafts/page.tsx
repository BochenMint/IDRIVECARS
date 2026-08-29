import Link from "next/link";
import {
  CATEGORY_LABELS,
  getContentDraftItems,
  getNewsDraftItems
} from "@/lib/content/admin-drafts";

export const metadata = { title: "Szkice treści – panel | IDRIVECARS" };

function statusBadge(status: string): string {
  if (status === "archived") return "bg-neutral-200 text-neutral-700";
  if (status === "review") return "bg-amber-50 text-amber-800";
  return "bg-purple-50 text-purple-800";
}

export default async function AdminContentDraftsPage() {
  const [contentDrafts, newsDrafts] = await Promise.all([
    getContentDraftItems(),
    getNewsDraftItems()
  ]);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Szkice treści</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Podgląd read-only artykułów ze statusem <code>draft</code> lub{" "}
            <code>archived</code>. Strony publiczne zwracają 404 — publikacja tylko przez
            edycję frontmatter w repozytorium (bez przycisku „publish” w panelu).
          </p>
        </div>
        <Link
          href="/admin/content"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Wróć do treści
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Szkice CMS" value={contentDrafts.length} />
        <SummaryCard label="Szkice news MDX" value={newsDrafts.length} />
        <SummaryCard
          label="Pipeline RSS"
          value="→"
          href="/admin/news/review"
          hint="admin/news/review"
        />
      </div>

      <DraftSection
        title="Testy, blog, felieton"
        empty="Brak szkiców w content/testy, blog, felieton."
      >
        {contentDrafts.map((item) => (
          <DraftCard
            key={`${item.contentDir}:${item.slug}`}
            title={item.title}
            status={item.status}
            badges={[
              CATEGORY_LABELS[item.category],
              item.contentDir
            ]}
            filePath={item.filePath}
            publicPath={item.publicPath}
            reasons={item.reasons}
            previewNote="Strona publiczna niedostępna (404) — podgląd w edytorze MDX lub po zmianie status na published."
          />
        ))}
      </DraftSection>

      <DraftSection
        title="News (import MDX)"
        empty="Brak szkiców newsów w content/news."
        footer={
          <p className="text-sm text-neutral-600">
            Surowe rekordy RSS i kolejka AI:{" "}
            <Link href="/admin/news/review" className="font-medium underline underline-offset-2">
              /admin/news/review
            </Link>
          </p>
        }
      >
        {newsDrafts.map((item) => (
          <DraftCard
            key={item.slug}
            title={item.title}
            status={item.status}
            badges={["news"]}
            filePath={item.filePath}
            publicPath={item.publicPath}
            reasons={item.reasons}
            previewNote="Link publiczny działa tylko po status: published — obecnie ukryty z /news."
          />
        ))}
      </DraftSection>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  href
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">{label}</p>
      {hint && href ? (
        <Link href={href} className="mt-2 block text-sm font-medium text-neutral-900 underline">
          {hint}
        </Link>
      ) : (
        <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
      )}
    </div>
  );
}

function DraftSection({
  title,
  empty,
  footer,
  children
}: {
  title: string;
  empty: string;
  footer?: React.ReactNode;
  children: React.ReactNode[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {children.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
          {empty}
        </div>
      ) : (
        <ul className="space-y-3">{children}</ul>
      )}
      {footer}
    </div>
  );
}

function DraftCard({
  title,
  status,
  badges,
  filePath,
  publicPath,
  reasons,
  previewNote
}: {
  title: string;
  status: string;
  badges: string[];
  filePath: string;
  publicPath: string;
  reasons: string[];
  previewNote: string;
}) {
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(status)}`}>
              {status}
            </span>
            {badges.map((b) => (
              <span key={b} className="text-xs uppercase tracking-[0.14em] text-neutral-400">
                {b}
              </span>
            ))}
          </div>
          <h3 className="mt-2 font-semibold text-neutral-900">{title}</h3>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-neutral-500">Plik</dt>
          <dd className="break-all">
            <code className="rounded bg-neutral-100 px-1">{filePath}</code>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-neutral-500">Docelowy URL (po publikacji)</dt>
          <dd>
            <code className="rounded bg-neutral-100 px-1">{publicPath}</code>
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <p className="text-xs font-medium text-neutral-700">Powody szkicu</p>
        <ul className="mt-1 list-inside list-disc text-sm text-neutral-600">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-xs text-neutral-500">{previewNote}</p>
    </li>
  );
}
