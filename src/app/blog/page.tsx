export const metadata = {
  title: "Blog",
  description:
    "Luźniejsze wpisy o motoryzacji – wrażenia z jazdy, obserwacje z rynku i komentarze Marcina Bochenka.",
  // Strona-zapowiedź bez wpisów — nie indeksujemy thin contentu do czasu publikacji.
  robots: { index: false, follow: true }
};

export default function BlogPage() {
  return (
    <div className="bg-canvas px-gutter pb-section pt-28 md:pt-32">
      <header className="mb-20 border-b border-soft pb-16 md:mb-24 md:pb-20">
        <p className="label-mono mb-8 text-stone-muted">Blog</p>
        <h1 className="font-display display-track text-display-lg uppercase text-ink">
          Felietony i komentarze
        </h1>
        <p className="mt-8 max-w-md text-lead font-light text-subtle">
          Już wkrótce — bez pośpiechu i bez krzyku.
        </p>
      </header>

      <div className="prose prose-article max-w-2xl">
        <p>
          W tym miejscu będą się pojawiać felietony, krótsze wrażenia z jazdy oraz komentarze do
          zmian w motoryzacji – elektryfikacja, rynek, polityka transportowa, subiektywne rankingi.
        </p>
        <p>
          Na start cały wysiłek idzie w przeniesienie archiwum testów i galerii z autoGALERIA.pl oraz
          z lokalnych folderów. Gdy to się ustabilizuje, blog będzie uzupełniany na bieżąco.
        </p>
        <h2>Planowane tematy</h2>
        <ul>
          <li>Wrażenia z jazdy nowościami, które nie doczekały się pełnego testu</li>
          <li>Elektryki w zimie i w trasie – co naprawdę daje zasięg i ładowanie</li>
          <li>Rynek wtórny: na co zwracać uwagę przy wyborze używanego auta</li>
          <li>Subiektywne zestawienia: najlepsze auta do długiej trasy, do miasta, na pierwszy zakup</li>
          <li>Polityka transportowa i normy – jak zmiany przepisów wpływają na to, czym jeździmy</li>
        </ul>
      </div>
    </div>
  );
}
