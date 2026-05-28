import Link from "next/link";

export const metadata = { title: "Panel administracyjny | IDRIVECARS" };

export default function AdminHomePage() {
  return (
    <section className="space-y-8">
      <h1 className="font-display text-2xl tracking-tight">Panel administracyjny</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/news"
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="font-semibold text-neutral-900">Moduł News</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Źródła RSS, kolejka newsów, automatyczne publikowanie w kategorii NEWS.
          </p>
        </Link>
        <Link
          href="/admin/ads"
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="font-semibold text-neutral-900">Reklamy</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Włącz/wyłącz sloty reklamowe, konfiguracja AdSense lub programów partnerskich.
          </p>
        </Link>
      </div>
    </section>
  );
}
