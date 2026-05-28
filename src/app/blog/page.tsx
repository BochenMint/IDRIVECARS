export const metadata = {
  title: "Blog",
  description:
    "Luźniejsze wpisy o motoryzacji – wrażenia z jazdy, obserwacje z rynku i komentarze Marcina Bochenka."
};

export default function BlogPage() {
  return (
    <div className="px-gutter pb-20 pt-28">
      <header className="mb-12 border-b border-line pb-10">
        <p className="label-mono mb-4 text-subtle">Blog</p>
        <h1 className="font-display text-display-lg uppercase">Felietony i komentarze</h1>
      </header>

      <div className="prose prose-article max-w-2xl space-y-6 text-subtle">
        <p>
          W tym miejscu będą się pojawiać felietony, krótsze wrażenia z jazdy oraz komentarze do
          zmian w motoryzacji – elektryfikacja, rynek, polityka transportowa, subiektywne rankingi.
          Bez pośpiechu i bez krzyku.
        </p>
        <p>
          Na start cały wysiłek idzie w przeniesienie archiwum testów i galerii z autoGALERIA.pl oraz
          z lokalnych folderów. Gdy to się ustabilizuje, blog będzie uzupełniany na bieżąco.
        </p>
        <h2 className="font-display text-2xl uppercase text-ink">Planowane tematy</h2>
        <ul className="list-inside list-disc space-y-2">
          <li>Wrażenia z jazdy nowościami, które nie doczekały się pełnego testu</li>
          <li>Elektryki w zimie i w trasie – co naprawdę daje zasięg i ładowanie</li>
          <li>Rynek wtórny: na co zwracać uwagę przy wyborze używanego auta</li>
          <li>
            Subiektywne zestawienia: najlepsze auta do długiej trasy, do miasta, na pierwszy zakup
          </li>
          <li>Polityka transportowa i normy – jak zmiany przepisów wpływają na to, czym jeździmy</li>
        </ul>
      </div>
    </div>
  );
}
