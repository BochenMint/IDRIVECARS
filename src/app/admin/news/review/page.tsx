import Link from "next/link";
import { getNewsReviewItems, getNewsReviewSummary } from "@/lib/news/review";
import { NewsReviewActions } from "./NewsReviewActions";

export const metadata = { title: "Review newsów | IDRIVECARS" };

const STATUS_LABELS: Record<string, string> = {
  raw: "Raw",
  "needs-ai-draft": "Do AI",
  draft: "Draft",
  review: "Review",
  published: "Published",
  rejected: "Rejected"
};

function statusClass(status: string): string {
  if (status === "raw") return "bg-neutral-100 text-neutral-700";
  if (status === "needs-ai-draft") return "bg-blue-50 text-blue-700";
  if (status === "draft") return "bg-purple-50 text-purple-700";
  if (status === "review") return "bg-amber-50 text-amber-800";
  if (status === "published") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-red-50 text-red-700";
  return "bg-neutral-100 text-neutral-500";
}

export default async function AdminNewsReviewPage() {
  const [items, summary] = await Promise.all([
    getNewsReviewItems(100),
    getNewsReviewSummary()
  ]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Review newsów</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Kolejka pokazuje surowe rekordy z <code>data/news/raw</code> oraz szkice MDX z{" "}
            <code>content/news</code>. Publikacja nadal wymaga ręcznego review i statusu{" "}
            <code>published</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/news"
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Wróć do news
          </Link>
          <span className="rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500">
            Runbook: <code>docs/PRODUCTION-SMOKE-RUNBOOK.md</code>
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Raw" value={summary.raw} />
        <SummaryCard label="Do AI" value={summary.needsAiDraft} />
        <SummaryCard label="Draft" value={summary.draft} />
        <SummaryCard label="Review" value={summary.review} />
        <SummaryCard label="Published" value={summary.published} />
        <SummaryCard label="Rejected" value={summary.rejected} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
          Brak pozycji raw/draft/review. Uruchom <code>npm run news:scan</code>, potem{" "}
          <code>npm run news:ai-prepare</code>.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    <span className="text-xs uppercase tracking-[0.16em] text-neutral-400">
                      {item.kind}
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-semibold text-neutral-900">{item.title}</h2>
                  {item.lead && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{item.lead}</p>
                  )}
                </div>
                <NewsReviewActions id={item.id} kind={item.kind} status={item.status} />
              </div>

              <div className="mt-4 grid gap-3 text-xs text-neutral-500 md:grid-cols-2">
                <div>
                  <p>
                    Źródło:{" "}
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-neutral-900 underline underline-offset-2"
                    >
                      {item.sourceName}
                    </a>
                  </p>
                  <p>Data źródła: {new Date(item.publishedAt).toLocaleString("pl-PL")}</p>
                  {item.fetchedAt && <p>Pobrano: {new Date(item.fetchedAt).toLocaleString("pl-PL")}</p>}
                  {item.storagePath && (
                    <p className="break-all">
                      Plik: <code className="rounded bg-neutral-100 px-1">{item.storagePath}</code>
                    </p>
                  )}
                  {item.slug && (
                    <p>
                      Podgląd:{" "}
                      <Link href={`/news/${item.slug}`} className="text-neutral-900 underline underline-offset-2">
                        /news/{item.slug}
                      </Link>
                    </p>
                  )}
                </div>

                <div>
                  <p className="font-medium text-neutral-700">Zdjęcia / assety</p>
                  {item.images.length === 0 ? (
                    <p>Brak zdjęć w rekordzie.</p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {item.images.slice(0, 5).map((image, idx) => (
                        <li key={`${image.url}:${idx}`} className="break-all">
                          <a
                            href={image.localPath ? `/news/${image.localPath.replace(/^images\//, "")}` : image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-900 underline underline-offset-2"
                          >
                            {image.localPath ?? image.url}
                          </a>
                          {image.license && <span> · {image.license}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
