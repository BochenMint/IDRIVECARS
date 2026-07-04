import { loadAllNewsSources } from "@/lib/news/catalog";

export const metadata = { title: "Katalog źródeł – News | IDRIVECARS" };

const TYPE_LABELS: Record<string, string> = {
  rss: "RSS",
  newsroom_html: "Newsroom HTML",
  api: "API",
  media_kit: "Media kit",
  requires_login: "Wymaga loginu"
};

export default async function AdminNewsSourcesPage() {
  const sources = await loadAllNewsSources();

  return (
    <section className="space-y-6">
      <h1 className="font-display text-2xl tracking-tight">Katalog źródeł news</h1>
      <p className="text-sm text-neutral-600">
        Konfiguracja w{" "}
        <code className="rounded bg-neutral-100 px-1">content/news-catalog/sources.json</code>.
        Włącz źródło (<code>enabled: true</code>) i uruchom <code>npm run news:scan</code>.
      </p>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-3 font-medium">Marka / źródło</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {sources.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900">{s.name}</div>
                  <div className="text-xs text-neutral-500">{s.id}</div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{s.region}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {TYPE_LABELS[s.sourceType] ?? s.sourceType}
                  {s.loginRequired ? " · login" : ""}
                </td>
                <td className="px-4 py-3">
                  <span className={s.enabled ? "text-green-600" : "text-neutral-400"}>
                    {s.enabled ? "Włączone" : "Wyłączone"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
