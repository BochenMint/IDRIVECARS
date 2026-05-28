# Import treści z autoGALERIA.pl do IDRIVECARS

## Automatyczne pobieranie testów (Marcin Bochenek)

Możesz pobrać listę i treść swoich artykułów z autogaleria.pl jednym poleceniem:

```bash
npm run fetch:autogaleria
```

Skrypt pobiera stronę autora (https://autogaleria.pl/author/marcin-bochenek/), wyciąga linki do artykułów (także z kolejnych stron), a następnie dla każdego artykułu ściąga treść i zapisuje plik `content/testy/<slug>.mdx` z frontmatterem i treścią w Markdown. Istniejące pliki są pomijane. Po uruchomieniu warto przejrzeć wygenerowane MDX i ewentualnie uzupełnić dane techniczne (silnik, moc, skrzynia) oraz dopasować `galleryDir` do folderów z galeriami.

## Import z dysku (Artykuły + Galerie z testów)

Teksty z **E:\MARCIN\Artykuły** i zdjęcia z **E:\MARCIN\Galerie z testów** możesz wgrać jednym poleceniem. Nazwy folderów są łączone po znormalizowanej nazwie (slug), np. folder „Mercedes-Maybach S 600” w obu lokalizacjach daje ten sam test i galerię.

```bash
npm run import:local
```

Skrypt czyta podkatalogi w `E:\MARCIN\Artykuły`, w każdym szuka pliku .txt, .md lub .html z treścią, dopasowuje galerię o tej samej nazwie (po slug) z `E:\MARCIN\Galerie z testów` i zapisuje pliki `content/testy/<slug>.mdx`. Potem uruchom konwersję galerii (patrz niżej).

## Galerie zdjęć z dysku

Zdjęcia konwertowane są z **E:\MARCIN\Galerie z testów** (jeśli folder istnieje), w drugiej kolejności z **E:\MARCIN\I DRIVE CARS\Galerie** lub z `raw-galleries` w projekcie:

```bash
npm run convert:galleries
```

Jeśli chcesz podać inną ścieżkę:

```bash
npm run convert:galleries -- "E:\MARCIN\I DRIVE CARS\Galerie"
# lub
set SOURCE_GALLERIES=E:\MARCIN\I DRIVE CARS\Galerie
npm run convert:galleries
```

Struktura w źródle: podkatalogi (np. `Mercedes-Maybach S 600`) z plikami JPG/PNG. Skrypt zamienia nazwy folderów na slugi (np. `mercedes-maybach-s-600`), więc wynik trafia do `public/galleries/mercedes-maybach-s-600/` w formacie WEBP. W MDX ustaw `galleryDir: "galleries/mercedes-maybach-s-600"`, żeby galeria zagrała z testem.

---

## Ręczny import (krok po kroku)

## 1. Wybierz artykuł

- Otwórz swój tekst na `https://autogaleria.pl/`.
- Skopiuj:
  - tytuł,
  - lead / pierwszy akapit,
  - pełną treść artykułu (bez komentarzy, ramek reklamowych itp.),
  - adres URL artykułu.

## 2. Ustal slug

- Z tytułu zbuduj prosty, czytelny `slug`, np.:
  - `Nissan Ariya Nismo – test` → `nissan-ariya-nismo-test`,
  - `Hyundai i20 N – pierwsza jazda` → `hyundai-i20-n-pierwsza-jazda`.
- Slug musi być:
  - zapisany małymi literami,
  - bez polskich znaków,
  - z myślnikami zamiast spacji.

## 3. Utwórz plik MDX

1. W katalogu `content/testy/` utwórz plik:
   - `content/testy/<slug>.mdx`, np. `content/testy/nissan-ariya-nismo-test.mdx`.
2. Skorzystaj z szablonu z `content/testy/README.md`:

   - uzupełnij pola:
     - `slug`,
     - `title`,
     - `brand`, `model`, `year`,
     - `publishedAt` (data pierwotnej publikacji w formacie `YYYY-MM-DD`),
     - `lead` (lead z artykułu),
     - `originalUrl` (adres z autoGALERIA.pl),
     - dane techniczne (`engine`, `power`, `gearbox`, `drivetrain` itd. – opcjonalne),
     - `heroImage` i `galleryDir` zgodnie z nazwą folderu galerii.
   - poniżej frontmattera wklej treść artykułu w Markdown.

## 4. Przygotuj galerię zdjęć

1. W katalogu `raw-galleries/` utwórz podkatalog odpowiadający slugowi, np.:
   - `raw-galleries/nissan-ariya-nismo-test/`.
2. Skopiuj tam zdjęcia z oryginalnej galerii:
   - najlepiej w kolejności, w jakiej mają się pojawiać (nazwy plików typu `01.jpg`, `02.jpg` itd.).
3. Uruchom konwersję:

   ```bash
   npm run convert:galleries
   ```

4. Skrypt utworzy WEBP-y w:
   - `public/galleries/nissan-ariya-nismo-test/`.

## 5. Sprawdź efekt w serwisie

1. Uruchom projekt:

   ```bash
   npm run dev
   ```

2. Otwórz w przeglądarce:
   - listę testów: `http://localhost:3000/testy`,
   - konkretny test: `http://localhost:3000/testy/<slug>`,
   - galerie: `http://localhost:3000/galerie`.

3. Sprawdź:
   - czy dane meta (marka, model, rok, silnik) są poprawne,
   - czy lead i treść są dobrze sformatowane,
   - czy wszystkie zdjęcia w galerii się ładują i mają sensowną kolejność.

## 6. Uwagi prawne

- Treści są Twojego autorstwa, ale pierwotnie ukazały się na `autogaleria.pl`.
- W każdym teście pamiętaj o:
  - polu `originalUrl` z linkiem do pierwotnej publikacji,
  - krótkiej informacji w treści (ta informacja jest automatycznie dodawana na dole artykułu).

