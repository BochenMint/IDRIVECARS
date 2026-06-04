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
npm run convert:linked   # konwersja + kuracja (25 najlepszych) + manifest
npm run curate:galleries                  # ręczna kuracja istniejących galerii
npm run curate:galleries -- --dry-run     # podgląd bez usuwania
```

Kuracja ocenia ostrość, ekspozycję, rozdzielczość i odrzuca prawie identyczne ujęcia (dHash). Usuwa **tylko kopie WEBP** z `public/galleries` — oryginały na `D:\MARCIN` nietknięte.

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

- **Typografia:** Bebas Neue (nagłówki/display) + Inter (treść/UI) + IBM Plex Mono (etykiety) — kierunek editorial
- **Layout:** czysta siatka, duże fotografie, asymetryczny hero, hairline'owe linie
- **Performance:** WEBP/AVIF, lazy loading, długie cache'owanie galerii, manifest generowany przy buildzie
- **SEO:** JSON-LD (`BlogPosting` + encja `Car`, `Organization`, `Person`, `WebSite`, `BreadcrumbList`), dynamiczny Open Graph, sitemap z priorytetami, RSS (`/feed.xml`), kanoniczne URL-e

## Wdrożenie (Vercel / hosting)

Skopiuj `.env.example` → `.env.local` (dev) lub zmienne w panelu hostingu (prod):

| Zmienna | Opis |
|---------|------|
| `NEXT_PUBLIC_SITE_URL` | Kanoniczny URL (`https://idrivecars.pl`) — SEO, sitemap, Open Graph |
| `ADMIN_SECRET` | Hasło do `/admin` i `/api/admin/*` (Basic lub Bearer). **Na produkcji obowiązkowe** — bez niego panel jest otwarty |

```bash
npm run build && npm start
```

Audyt galerii: `npx tsx scripts/audit-galleries.ts` (oczekiwane: 111 OK + 9 bez folderu po usunięciu błędnych proxy Honda/Citroën/Opel).

Log zmian nocnych: [`docs/IMPROVEMENT-LOG.md`](docs/IMPROVEMENT-LOG.md).

## Dokumentacja

- [`docs/CONTENT-MAP.md`](docs/CONTENT-MAP.md) — inwentaryzacja `D:\MARCIN` i mapowanie artykułów
- [`docs/PLAN-REKLAMY-I-NEWS.md`](docs/PLAN-REKLAMY-I-NEWS.md) — reklamy i moduł news
- [`scripts/gallery-links.json`](scripts/gallery-links.json) — powiązania artykuł ↔ galeria

## Licencja

Treści i zdjęcia © Marcin Bochenek. Kod projektu — prywatny.
