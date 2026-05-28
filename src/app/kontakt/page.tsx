export const metadata = {
  title: "Kontakt",
  description:
    "Skontaktuj się w sprawie testów, współpracy redakcyjnej lub wykorzystania zdjęć z projektu IDRIVECARS."
};

export default function ContactPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">Kontakt</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Kontakt z IDRIVECARS</h1>
      </header>

      <div className="space-y-4 text-sm leading-relaxed text-neutral-700">
        <p>
          Jeśli chcesz porozmawiać o testach, współpracy redakcyjnej lub wykorzystaniu zdjęć z
          projektu IDRIVECARS, napisz wiadomość e-mail. Odpowiadam zwykle w ciągu kilku dni; przy
          zapytaniach o współpracę lub licencję na zdjęcia opisz krótko, o co chodzi – ułatwi to
          ustalenie szczegółów.
        </p>
        <p>
          <strong>Adres e-mail</strong>:{" "}
          <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-xs">
            kontakt@idrivecars.pl
          </span>
        </p>
        <p>
          Zapraszam też do lektury testów i galerii – jeśli masz pytanie o konkretny model, który
          opisywałem, napisz z podaniem tytułu artykułu; chętnie doprecyzuję lub uzupełnię informacje.
        </p>
      </div>
    </section>
  );
}

