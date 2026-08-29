"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="pl">
      <body className="bg-canvas font-sans text-ink antialiased">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-gutter py-20">
          <p className="label-mono mb-4 text-stone-muted">Krytyczny błąd</p>
          <h1 className="font-display text-display-lg uppercase">IDRIVECARS</h1>
          <p className="mt-6 text-base leading-relaxed text-ink/80">
            Aplikacja napotkała poważny błąd. Odśwież stronę lub spróbuj ponownie.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="label-mono mt-10 w-fit border border-ink bg-ink px-6 py-3 text-canvas transition-opacity duration-editorial hover:opacity-80"
          >
            Spróbuj ponownie
          </button>
        </div>
      </body>
    </html>
  );
}
