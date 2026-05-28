import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line">
      <div className="flex flex-col gap-6 px-gutter py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-4xl tracking-wide text-ink">IDRIVECARS</p>
          <p className="mt-2 max-w-xs text-sm text-subtle">
            Marcin Bochenek — testy, pierwsze jazdy, własne zdjęcia.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Link href="/testy" className="label-mono editorial-link">
            Testy
          </Link>
          <Link href="/galerie" className="label-mono editorial-link">
            Galerie
          </Link>
          <Link href="/kontakt" className="label-mono editorial-link">
            Kontakt
          </Link>
        </div>
      </div>
      <div className="border-t border-line px-gutter py-4">
        <p className="label-mono text-subtle">© {year} Marcin Bochenek</p>
      </div>
    </footer>
  );
}
