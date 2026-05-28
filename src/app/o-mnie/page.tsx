export const metadata = {
  title: "O mnie",
  description: "Marcin Bochenek — dziennikarz motoryzacyjny, autor IDRIVECARS."
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-gutter pb-20 pt-28">
      <header className="mb-12 border-b border-line pb-10">
        <p className="label-mono mb-4">Autor</p>
        <h1 className="font-display text-display-lg uppercase">Marcin Bochenek</h1>
      </header>

      <div className="space-y-6 text-base leading-relaxed text-ink/80">
        <p>
          Przez lata pisałem testy dla{" "}
          <a href="https://autogaleria.pl/" target="_blank" rel="noreferrer" className="underline">
            autoGaleria.pl
          </a>
          . IDRIVECARS to moje własne archiwum — testy, pierwsze jazdy i zdjęcia bez pośredników.
        </p>
        <p>
          Nie gonię za clickbaitem. Opisuję samochody tak, jak je widzę — z danymi technicznymi,
          wrażeniami z jazdy i uczciwą oceną. Zdjęcia są moje.
        </p>
      </div>
    </div>
  );
}
