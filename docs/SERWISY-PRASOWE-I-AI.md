# Serwisy prasowe producentów i uczenie AI

## 1. Lista serwisów prasowych

Plik **`content/press-sources.json`** zawiera listę producentów samochodów osobowych i adresy ich oficjalnych serwisów prasowych (na podstawie badań: ACEA, oficjalne portale marek, media group).

Dla każdego wpisu:
- **id** – identyfikator (np. `bmw`, `volkswagen`)
- **name** – nazwa marki / grupy
- **pressUrl** – adres serwisu prasowego
- **loginRequired** – czy dostęp wymaga logowania (zwykle tak)
- **region** – EU / US / global

### Loginy i hasła

Dostęp do materiałów wymaga zwykle rejestracji w serwisie prasowym producenta. W panelu **Admin → Serwisy prasowe** możesz wpisać login i hasło przy każdym producencie. Dane są zapisywane w **`content/press-credentials.json`** (plik w `.gitignore` – nie trafia do repozytorium).

- Skopiuj `content/press-credentials.example.json` jako `content/press-credentials.json`.
- Uzupełnij loginy i hasła w panelu i kliknij „Zapisz”.

Moduł automatycznego publikowania (docelowo cron / skrypt z autentykacją) będzie codziennie pobierał z tych serwisów najnowsze materiały i prezentował je w krótkiej formie do Twojej decyzji.

---

## 2. Krótka forma i decyzja: warto napisać / pominąć

Po pobraniu newsów (z RSS lub serwisów prasowych) w panelu **Admin → News** w kolejce każdy wpis ma przyciski:

- **Warto** – uznajesz, że warto o tym napisać (np. rozwinąć w artykuł).
- **Pomiń** – pomijasz.

Decyzje zapisywane są w **`content/news-decisions.json`** (slug → `userDecision`, `decidedAt`). Ten plik można commitować i wykorzystać do uczenia modelu AI: na podstawie Twoich wyborów model ma się uczyć, które materiały warto rozwijać, a które pominąć, w kierunku **pełnej automatyzacji** (np. automatyczne proponowanie „warto” dla podobnych tematów).

---

## 3. Styl pisania: inspiracja „Testy”

Artykuły generowane lub proponowane przez AI mają być inspirowane Twoimi tekstami z działu **Testy**:

- **Konkret** – dane techniczne, liczby, nazwy modeli, wrażenia z jazdy.
- **Pierwsza osoba** – „sprawdziłem”, „słyszę”, „nie muszę pisać”.
- **Krótkie akapity** – czytelne bloki, bez długich ścian tekstu.
- **Nagłówki** – logiczny podział (np. „Prawie spokojny początek”, „Strzały w Walencji”).
- **Ton** – spokojny, rzeczowy, bez krzyczących nagłówków; dopuszczalny lekki humor.

W treściach newsów i w eksporcie do AI ustawiane jest pole **`styleReference: "testy"`**, aby model (lub szablon) mógł trzymać się tego stylu. Przykładowe artykuły referencyjne: `content/testy/*.mdx` (np. Ford Focus RS, Bentley, Audi A7).

---

## 4. Eksport do uczenia AI

Pliki do wykorzystania przy trenowaniu / promptowaniu modelu:

- **`content/news-decisions.json`** – pary (slug, worth/skip) + data decyzji.
- **`content/news/*.mdx`** – tytuł, lead, sourceUrl; można łączyć z decyzjami po slug.
- **`content/testy/*.mdx`** – pełne artykuły w docelowym stylu.

Pipeline (szkic): dla każdego wpisu „worth” można dołączyć treść źródłową (press release / RSS) i ewentualnie napisany przez Ciebie artykuł (jeśli taki powstał); dla „skip” – tylko treść źródłowa. Na tej podstawie model uczy się różnicy i z czasem może sam proponować „warto” / „pomiń” oraz generować krótkie podsumowania w stylu testów.
