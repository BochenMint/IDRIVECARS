export const metadata = {
  title: "Blog",
  description:
    "Luźniejsze wpisy o motoryzacji – wrażenia z jazdy, obserwacje z rynku i komentarze Marcina Bochenka."
};

export default function BlogPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Blog</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          Blog IDRIVECARS
        </h1>
      </header>
      <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-neutral-600">
        <p>
          W tym miejscu będą się pojawiać felietony, krótsze wrażenia z jazdy oraz komentarze do
          zmian w motoryzacji – elektryfikacja, rynek, polityka transportowa, subiektywne rankingi.
          Bez pośpiechu i bez krzyku.
        </p>
        <p>
          Na start cały wysiłek idzie w przeniesienie archiwum testów i galerii z autoGALERIA.pl oraz
          z lokalnych folderów. Gdy to się ustabilizuje, blog będzie uzupełniany na bieżąco.
        </p>
        <h2 className="font-display text-lg tracking-tight text-neutral-900">
          Planowane tematy
        </h2>
        <ul className="list-inside list-disc space-y-1 text-neutral-600">
          <li>Wrażenia z jazdy nowościami, które nie doczekały się pełnego testu</li>
          <li>Elektryki w zimie i w trasie – co naprawdę daje zasięg i ładowanie</li>
          <li>Rynek wtórny: na co zwracać uwagę przy wyborze używanego auta</li>
          <li>Subiektywne zestawienia: najlepsze auta do długiej trasy, do miasta, na pierwszy zakup</li>
          <li>Polityka transportowa i normy – jak zmiany przepisów wpływają na to, czym jeździmy</li>
        </ul>
      </div>
    </section>
  );
}

