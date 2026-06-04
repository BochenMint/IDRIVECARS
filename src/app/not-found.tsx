import Link from "next/link";

const SUGGESTIONS = [
  { href: "/testy", label: "Testy", hint: "Indeks wszystkich testów" },
  { href: "/galerie", label: "Galerie", hint: "Zdjęcia z jazd" },
  { href: "/o-mnie", label: "O mnie", hint: "Marcin Bochenek" }
];

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-gutter pb-section pt-36 md:pt-44">
      <header className="border-b border-soft pb-12">
        <p className="label-mono mb-8 text-stone-muted">Błąd 404</p>
        <h1 className="font-display display-track text-display-xl uppercase leading-none text-ink">
          Nie znaleziono
        </h1>
        <p className="mt-10 max-w-md text-lead font-light text-subtle">
          Ta strona nie istnieje lub została przeniesiona. Może zainteresuje Cię coś z poniższych.
        </p>
      </header>

      <ul className="mt-4 divide-y divide-line/80">
        {SUGGESTIONS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-baseline justify-between gap-6 py-7 transition-opacity duration-editorial hover:opacity-60"
            >
              <span className="font-display display-track text-display-md uppercase text-ink">
                {item.label}
              </span>
              <span className="label-mono shrink-0 text-stone-muted">{item.hint}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/" className="label-mono editorial-link mt-12 inline-block">
        ← Wróć na stronę główną
      </Link>
    </div>
  );
}
