import { getPressSources, getPressCredentials } from "@/lib/content/press";
import { PressCredentialsForm } from "./PressCredentialsForm";

export const metadata = { title: "Serwisy prasowe producentów | IDRIVECARS" };

export default async function AdminPressPage() {
  const [sources, credentials] = await Promise.all([
    getPressSources(),
    getPressCredentials()
  ]);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Serwisy prasowe producentów</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Lista oparta na badaniach rynku (ACEA, oficjalne portale marek). Dostęp do materiałów
          wymaga zwykle rejestracji w serwisie prasowym. Wpisz login i hasło przy wybranych
          producentach – moduł automatycznego publikowania będzie z nich codziennie pobierał
          najnowsze materiały i prezentował je w krótkiej formie do Twojej decyzji (warto napisać /
          pominąć). Na podstawie tych decyzji model AI ma się uczyć w kierunku pełnej automatyzacji;
          styl pisania jest inspirowany Twoimi artykułami z działu „Testy”.
        </p>
      </div>

      <PressCredentialsForm sources={sources} initialCredentials={credentials} />

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-900">
        <strong>Bezpieczeństwo:</strong> Hasła są zapisywane tylko w pliku{" "}
        <code className="rounded bg-amber-100 px-1">content/press-credentials.json</code>, który
        jest w <code className="rounded bg-amber-100 px-1">.gitignore</code>. Nie commituj tego
        pliku. W razie braku pliku skopiuj{" "}
        <code className="rounded bg-amber-100 px-1">content/press-credentials.example.json</code>{" "}
        i zapisz jako <code className="rounded bg-amber-100 px-1">press-credentials.json</code>.
      </div>
    </section>
  );
}
