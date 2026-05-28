export const metadata = {
  title: "O mnie",
  description:
    "Kilka słów o projekcie IDRIVECARS i autorze – Marcinie Bochenku, dziennikarzu motoryzacyjnym."
};

export default function AboutPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">O mnie</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">IDRIVECARS i ja</h1>
      </header>

      <div className="space-y-4 text-sm leading-relaxed text-neutral-700">
        <p>
          Nazywam się <strong>Marcin Bochenek</strong>. Przez lata pisałem testy samochodów i
          materiały motoryzacyjne, między innymi dla serwisu{" "}
          <a href="https://autogaleria.pl/" target="_blank" rel="noreferrer">
            autoGALERIA.pl
          </a>
          . IDRIVECARS to moje własne miejsce w sieci – spokojniejsze, bardziej skupione na treści i
          zdjęciach.
        </p>
        <p>
          Zamiast gonić za sensacją i tytułami na siłę, wolę uczciwie opisywać samochody takimi, jakie
          są. Interesują mnie detale, codzienne użytkowanie i to, czy dany model ma sens dla
          konkretnej osoby, a nie tylko katalogowe 0–100 km/h.
        </p>
        <p>
          Treści, które tutaj znajdziesz, w dużej części powstały wcześniej i były publikowane
          gdzie indziej. Przenoszę je, bo nadal się pod nimi podpisuję – i chcę, żeby miały lepszy
          dom, dopasowany do mojego stylu pracy.
        </p>
        <p>
          Na stronie znajdziesz testy m.in. Mercedes-Maybacha S 600, Forda Focusa RS, Mazdy MX-5 ND,
          BMW X6 M50d czy Volkswagena Passata Alltrack – oraz kolejne, w miarę przenoszenia archiwum
          z autoGALERIA.pl i z lokalnych folderów (Artykuły, Galerie z testów).
        </p>
        <p>
          W testach staram się pisać tak, żeby po lekturze było wiadomo: dla kogo ten samochód jest,
          co robi dobrze, a z czego rezygnuje. Nie unikam krytyki – producenci nie płacą mi za
          laurki – ale nie szukam też sensacji tam, gdzie jej nie ma. Jeśli coś jest dobre, mówię
          że dobre; jeśli coś przeszkadza, opisuję to wprost.
        </p>
        <p>
          Zdjęcia w galeriach są moje – z testów, premier i eventów. Strona jest budowana tak, żeby
          treść i obrazy miały dużo przestrzeni; bez rozpraszaczy i nadmiaru reklam. Dziękuję, że
          tu jesteś.
        </p>
      </div>
    </section>
  );
}

