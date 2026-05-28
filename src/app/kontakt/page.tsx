export const metadata = {
  title: "Kontakt",
  description: "Kontakt z IDRIVECARS — współpraca, zdjęcia, testy."
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-gutter pb-20 pt-28">
      <header className="mb-12 border-b border-line pb-10">
        <p className="label-mono mb-4">Napisz</p>
        <h1 className="font-display text-display-lg uppercase">Kontakt</h1>
      </header>

      <div className="space-y-8">
        <p className="text-base leading-relaxed text-ink/80">
          Współpraca redakcyjna, licencja na zdjęcia, pytania o konkretny test.
        </p>
        <a
          href="mailto:kontakt@idrivecars.pl"
          className="inline-block font-display text-4xl uppercase tracking-wide transition hover:opacity-60"
        >
          kontakt@idrivecars.pl
        </a>
      </div>
    </div>
  );
}
