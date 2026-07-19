import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nie znaleziono strony",
  robots: { index: false, follow: true }
};

export default function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted">Błąd 404</p>
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
        Tej strony nie ma w garażu
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-neutral-600">
        Adres jest nieaktualny albo wpisany z błędem. Wróć na stronę główną albo zajrzyj do archiwum
        testów — może znajdziesz coś dla siebie.
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-1">
        <Link
          href="/"
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Strona główna
        </Link>
        <Link
          href="/testy"
          className="rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-sm font-medium text-ink transition hover:border-neutral-400"
        >
          Przeglądaj testy
        </Link>
      </div>
    </section>
  );
}
