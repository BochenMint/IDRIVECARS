# CMS — instrukcja administratora (IDRIVECARS)

File-based CMS: treść w repozytorium jako **MDX + frontmatter**, bez zewnętrznej bazy danych.

## Szybki start

1. Edytuj lub dodaj plik w `content/testy/`, `content/blog/` lub `content/felieton/`.
2. Uruchom walidację: `npm run validate:content`
3. Podgląd lokalny: `npm run dev` → odpowiedni URL (np. `/testy/slug`)
4. Deploy: commit + push (Vercel buduje automatycznie z `npm run build`)

## Panel `/admin`

- **Hasło:** zmienna `ADMIN_SECRET` (Basic Auth). Na produkcji **obowiązkowe**.
- **News:** źródła RSS, kolejka, decyzje redakcyjne (`content/news-decisions.json`).
- **Treści:** `/admin/content` — podsumowanie artykułów i linki do walidacji.

## Kategorie

| Sekcja | Listing | Pliki |
|--------|---------|-------|
| Testy | `/testy` | `content/testy/` + `category: test` |
| Pierwsza jazda | `/pierwsza-jazda` | `content/testy/` + `category: pierwsza-jazda` lub slug `pierwsza-jazda-*` |
| Blog | `/blog` | `content/blog/` |
| Felietony | `/felieton` | `content/felieton/` |
| News | `/news` | `content/news/` (RSS / skrypt `fetch:news`) |

## Pola artykułu

Pełna specyfikacja: [`content/IMPORT-FORMAT.md`](../content/IMPORT-FORMAT.md).

Minimum dla testu:

```yaml
---
title: "Tytuł"
brand: Marka
model: Model
publishedAt: "2025-01-15"
lead: "Zajawka."
category: test
status: published
galleryDir: "galleries/slug-folderu"
originalUrl: "https://autogaleria.pl/..."
---
```

## Galerie

1. Zdjęcia źródłowe → `raw-galleries/{slug}/` lub folder na dysku MARCIN
2. `npm run convert:linked` lub `npm run convert:galleries`
3. Wynik: `public/galleries/{slug}/*.webp`
4. W MDX: `galleryDir: "galleries/{slug}"`

## Import masowy

| Polecenie | Opis |
|-----------|------|
| `npm run import:local` | Word/txt z dysku → MDX |
| `npm run import:ag` | autoGaleria / folder TESTY |
| `npm run fetch:autogaleria` | Pobieranie z autogaleria.pl |
| `npm run validate:content` | Sanity-check przed publikacją |

## SEO (automatyczne)

- Meta title/description z `seoTitle` / `seoDescription` lub z tytułu i leadu
- Open Graph + Twitter Card na każdej stronie artykułu
- JSON-LD: `BlogPosting` / `Article` / `NewsArticle` + `BreadcrumbList` + `Car` (testy)
- Sitemap: `/sitemap.xml`
- RSS testów: `/feed.xml`
- `robots.txt` blokuje `/admin` i `/api`

## Checklist przed publikacją

- [ ] `npm run validate:content` — zero błędów
- [ ] Lead i tytuł bez literówek
- [ ] `publishedAt` = data pierwotnej publikacji
- [ ] `originalUrl` dla treści z autoGaleria
- [ ] Galeria się ładuje (min. 3 zdjęcia dla testów premium)
- [ ] `status: published` (nie `draft`)
- [ ] `npm run build` przechodzi lokalnie

## Ryzyka / ograniczenia

- Brak WYSIWYG w przeglądarce — edycja w IDE lub przez workera importu.
- Newsy RSS to na razie skróty z linkiem do źródła (pełna redakcja = przyszły etap).
- Blog i felieton bez wpisów — listingi puste, `noindex` na `/blog` dopóki brak treści.
