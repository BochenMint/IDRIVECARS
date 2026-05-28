export const metadata = { title: "Źródła RSS – News | IDRIVECARS" };

const EXAMPLE_SOURCES = [
  { name: "AutoCentrum – Newsy", url: "https://www.autocentrum.pl/rss/", enabled: true },
  { name: "Motorsport.com PL", url: "https://pl.motorsport.com/rss/", enabled: false }
];

export default function AdminNewsSourcesPage() {
  return (
    <section className="space-y-6">
      <h1 className="font-display text-2xl tracking-tight">Źródła RSS</h1>
      <p className="text-sm text-neutral-600">
        Lista źródeł do automatycznego pobierania newsów. Docelowo zapis w{" "}
        <code className="rounded bg-neutral-100 px-1">content/news-sources.json</code> lub w bazie.
        Edycja przez formularz (TODO).
      </p>
      <ul className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4">
        {EXAMPLE_SOURCES.map((s) => (
          <li key={s.url} className="flex items-center justify-between text-sm">
            <span>{s.name}</span>
            <span className={s.enabled ? "text-green-600" : "text-neutral-400"}>
              {s.enabled ? "Włączone" : "Wyłączone"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
