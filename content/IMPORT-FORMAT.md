# Format importu treści — IDRIVECARS CMS

Ten dokument definiuje **jednolity format** plików artykułów dla workera importującego treści.
Stack: pliki **MDX/Markdown z YAML frontmatter** w katalogach `content/`.

## Katalogi

| Kategoria | Katalog | URL publiczny |
|-----------|---------|---------------|
| `test` | `content/testy/` | `/testy/{slug}` |
| `pierwsza-jazda` | `content/testy/` (pole `category`) | `/testy/{slug}` |
| `blog` | `content/blog/` | `/blog/{slug}` |
| `felieton` | `content/felieton/` | `/felieton/{slug}` |
| `news` | `content/news/` | `/news/{slug}` (osobny loader RSS) |

## Wymagane pola frontmatter

### Wszystkie kategorie

```yaml
title: "Tytuł artykułu"
slug: opcjonalny-nadpisuje-nazwe-pliku
author: "Marcin Bochenek"
publishedAt: "2024-06-15"
category: test  # test | pierwsza-jazda | blog | felieton
status: published  # draft | published | archived
lead: "Lead / zajawka (1–3 zdania)."
```

### Testy i pierwsze jazdy (`test`, `pierwsza-jazda`)

```yaml
brand: Mercedes-Benz
model: AMG GT S
year: 2015
category: test  # lub pierwsza-jazda
```

Kategoria `pierwsza-jazda` może być **wywnioskowana** ze sluga (`pierwsza-jazda-*`) lub tytułu — lepiej ustawić jawnie.

### SEO (opcjonalne, zalecane)

```yaml
seoTitle: "Tytuł w Google (max ~60 znaków)"
seoDescription: "Meta description (max ~160 znaków)."
canonicalUrl: "https://idrivecars.pl/testy/slug"  # tylko gdy różni się od domyślnego
originalUrl: "https://autogaleria.pl/..."  # pierwotna publikacja
```

### Media

```yaml
heroImage: "/galleries/slug/01.webp"
galleryDir: "galleries/slug"
heroVideoUrl: "/videos/clip.mp4"
heroVideoPoster: "/videos/poster.jpg"
videoUrl: "/videos/full-test.mp4"
tags: ["amg", "sport"]
```

### Dane techniczne (opcjonalne)

```yaml
bodyType: Coupe
drivetrain: RWD
engine: "4.0 V8 biturbo"
power: "510 KM"
torque: "600 Nm"
gearbox: "7-biegowa automatyczna"
```

### Provenance importu (dla audytu)

```yaml
import:
  source: import-worker  # autogaleria | local | manual | rss | press_portal | import-worker
  importedAt: "2026-06-30T12:00:00.000Z"
  sourceId: "ag-12345"
  sourceFile: "E:/MARCIN/Artykuły/folder/article.docx"
```

## Treść (body)

Poniżej frontmatter — **Markdown** (nagłówki `##`, akapity, listy, linki, pogrubienia).
Nie wklejaj surowego HTML z CMS-ów zewnętrznych bez oczyszczenia.

## Przykładowy plik

Zobacz `content/testy/przykladowy-test.mdx` (szablon, wykluczony z buildu).

## Walidacja

```bash
npm run validate:content
```

Skrypt sprawdza: slug, daty, wymagane pola, duplikaty, istnienie galerii/hero.

## JSON (alternatywa dla workera)

Worker może generować MDX z szablonu. Minimalny JSON wejściowy:

```json
{
  "title": "Ford Focus RS – najlepszy z chuliganów",
  "slug": "ford-focus-rs-najlepszy-z-chuliganow",
  "category": "test",
  "author": "Marcin Bochenek",
  "publishedAt": "2016-03-15",
  "status": "published",
  "brand": "Ford",
  "model": "Focus RS",
  "lead": "Lead artykułu…",
  "originalUrl": "https://autogaleria.pl/…",
  "galleryDir": "galleries/ford-focus-rs",
  "tags": ["ford", "hot-hatch"],
  "bodyMarkdown": "## Wstęp\n\nTreść…",
  "import": {
    "source": "import-worker",
    "importedAt": "2026-06-30T12:00:00.000Z",
    "sourceId": "docx-001"
  }
}
```

Zapis docelowy: `content/{testy|blog|felieton}/{slug}.mdx`.

## Status publikacji

- `draft` — widoczny tylko po `npm run dev` z włączonym podglądem (domyślnie **404** na produkcji).
- `published` — indeksowany, w listingach i sitemap.
- `archived` — ukryty, zachowuje URL dla starych linków (opcjonalnie 410 w przyszłości).
