import { AdSlot } from "./AdSlot";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white/80">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <AdSlot slotId="footer" format="footer" className="mb-4" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {year} IDRIVECARS / Marcin Bochenek</p>
        <p>Spokojny serwis o samochodach – bez hałasu, z dobrymi zdjęciami.</p>
      </div>
    </footer>
  );
}

