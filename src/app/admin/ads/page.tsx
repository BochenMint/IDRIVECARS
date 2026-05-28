export const metadata = { title: "Reklamy – panel | IDRIVECARS" };

const SLOTS = [
  { id: "header-billboard", label: "Pod nawigacją (leaderboard)", format: "728×90" },
  { id: "sidebar-top", label: "Sidebar – góra", format: "300×250" },
  { id: "sidebar-sticky", label: "Sidebar – sticky", format: "300×250" },
  { id: "in-article", label: "W tekście artykułu", format: "300×250" },
  { id: "footer", label: "Nad stopką", format: "728×90" },
  { id: "between-cards", label: "Między kartami (testy)", format: "300×250" }
];

export default function AdminAdsPage() {
  return (
    <section className="space-y-6">
      <h1 className="font-display text-2xl tracking-tight">Reklamy</h1>
      <p className="text-sm text-neutral-600">
        Włącz/wyłącz sloty i wklej ID jednostek reklamowych (AdSense lub inna sieć). Konfiguracja
        docelowo w pliku env lub bazie (TODO).
      </p>
      <ul className="space-y-2">
        {SLOTS.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3"
          >
            <div>
              <span className="font-medium">{s.label}</span>
              <span className="ml-2 text-xs text-neutral-500">({s.format})</span>
            </div>
            <span className="text-xs text-neutral-400">slot: {s.id}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
