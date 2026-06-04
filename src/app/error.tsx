"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-gutter pb-section pt-28 md:pt-32">
      <header className="mb-12 border-b border-soft pb-10">
        <p className="label-mono mb-4">Błąd</p>
        <h1 className="font-display text-display-lg uppercase text-ink">Coś poszło nie tak</h1>
      </header>

      <p className="mb-10 text-base leading-relaxed text-ink/80">
        Nie udało się załadować tej strony. Spróbuj ponownie lub wróć na stronę główną.
      </p>

      <div className="flex flex-wrap items-center gap-6">
        <button
          type="button"
          onClick={() => reset()}
          className="label-mono border border-ink bg-ink px-6 py-3 text-canvas transition-opacity duration-editorial hover:opacity-80"
        >
          Spróbuj ponownie
        </button>
        <Link href="/" className="label-mono editorial-link">
          Strona główna
        </Link>
      </div>
    </div>
  );
}
