# IDRIVECARS

Portfolio dziennikarskie i blog motoryzacyjny **Marcina Bochenka** — autorskie testy samochodów, pierwsze jazdy i galerie zdjęć.

Stack: **Next.js 15** (App Router) · **TypeScript** · **Tailwind CSS** · treść w **MDX** · galerie **WEBP** (Sharp).

## Uruchomienie

```bash
npm install
npm run dev
```

Strona: [http://localhost:3000](http://localhost:3000)

## Pipeline treści

### 1. Artykuły (MDX)

Pliki w `content/testy/*.mdx` z frontmatter:

```yaml
slug: ford-focus-rs-najlepszy-z-chuliganow
title: "Ford Focus RS – najlepszy z chuliganów"
brand: Ford
model: Focus RS
galleryDir: "galleries/ford-focus-rs-pierwsza-jazda"
publishedAt: "2016-03-15"
```

Import z dysku lokalnego (Word → MDX):

```bash
npm run import:local
```

Źródła tekstów: `D:\MARCIN\Artykuły`, `D:\MARCIN\Z PULPITU\DYSK GOOGLE\MARCIN\aG\Testy`

### 2. Galerie zdjęć

Mapowanie artykuł → folder źródłowy: `scripts/gallery-links.json`

Konwersja powiązanych galerii (JPG/PNG → WEBP, bez usuwania oryginałów):

```bash
npm run convert:linked
npm run generate:galleries-manifest
```

Pełna konwersja wszystkich folderów z `D:\MARCIN\Galerie z testów`:

```bash
npm run convert:galleries
```

Źródła zdjęć (priorytet):

1. `D:\MARCIN\Galerie z testów`
2. `D:\MARCIN\I DRIVE CARS\Galerie`
3. `raw-galleries/` (lokalne kopie)

### 3. Build

```bash
npm run build   # prebuild generuje manifest galerii
```

## Struktura projektu

```
content/testy/          # artykuły MDX
content/news/           # newsy RSS (planowane)
public/galleries/       # zdjęcia WEBP
scripts/                # import, konwersja, manifest
src/app/                # strony Next.js
src/data/galleries-manifest.json
docs/                   # plany redakcyjne i techniczne
```

## Design

- **Typografia:** Instrument Serif (nagłówki) + DM Sans (UI/treść) — trend editorial 2026
- **Layout:** czysta siatka, duże fotografie, asymetryczny hero
- **Performance:** WEBP, lazy loading, variable fonts, manifest galerii generowany przy buildzie

## Dokumentacja

- [`docs/CONTENT-MAP.md`](docs/CONTENT-MAP.md) — inwentaryzacja `D:\MARCIN` i mapowanie artykułów
- [`docs/PLAN-REKLAMY-I-NEWS.md`](docs/PLAN-REKLAMY-I-NEWS.md) — reklamy i moduł news
- [`scripts/gallery-links.json`](scripts/gallery-links.json) — powiązania artykuł ↔ galeria

## Licencja

Treści i zdjęcia © Marcin Bochenek. Kod projektu — prywatny.
