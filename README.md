# IDRIVECARS — monorepo

Portfolio dziennikarskie i blog motoryzacyjny **Marcina Bochenka** — autorskie testy samochodów, pierwsze jazdy i galerie zdjęć.

## Struktura monorepo

```
site/           # Astro 5 SSG — produkcyjna witryna idrivecars.pl (GŁÓWNY FRONTEND)
content/        # Źródło prawdy treści (testy MDX) — synchronizowane do site/src/content/tests/
agent/          # Pipeline agenta redakcyjnego
leadgen/        # FastAPI — webhooki leadów, dashboard, routing ubezpieczeń
lora/           # Modele LoRA / fine-tuning (opcjonalnie)
data/           # SQLite schema + init_db.py
src/            # DEPRECATED — legacy Next.js 15 (App Router), nie rozwijaj
```

> **Migracja:** Nowy frontend to `site/` (Astro 5 + React islands + Tailwind v4). Katalog `src/` przy root to stary Next.js — pozostawiony tylko do referencji. Treści testów kopiuj z `content/testy/*.mdx` do `site/src/content/tests/*.md` (lub uruchom sync przy buildzie).

## Uruchomienie witryny (Astro)

```bash
npm install --prefix site
npm run dev          # z root — proxy do site/
```

Strona: [http://localhost:4321](http://localhost:4321)

## Build i testy

```bash
npm run test         # vitest — kalkulator finansowy
npm run build        # astro build w site/
```

## Leadgen i baza

```bash
npm run db:init      # inicjalizacja SQLite
npm run leadgen      # FastAPI na :8000
```

## Pipeline treści

### Testy (MDX → content collection)

Pliki źródłowe: `content/testy/*.mdx`  
Kopia w witrynie: `site/src/content/tests/*.md`

```bash
for f in content/testy/*.mdx; do
  cp -n "$f" "site/src/content/tests/$(basename "$f" .mdx).md"
done
```

### News i modele

- `site/src/content/news/` — artykuły news z oznaczeniem AI
- `site/src/content/models/` — katalog modeli z orientacyjnymi cenami

## Design (site/)

- **Kolory:** surface `#FAFAF8`, ink `#171717`, muted `#737373`, accent `#B91C1C`
- **Typografia:** Instrument Serif (display) + DM Sans (UI) — Google Fonts
- **Hero:** full-bleed, brand-first, bez kart w sekcji hero
- **Reklamy:** zarezerwowane sloty o stałych wymiarach (CLS)

## SEO

Konfiguracja w `site/src/lib/site.ts` i `site/src/lib/seo.ts`:

- JSON-LD: Organization, WebSite, Person, Article, Review, NewsArticle, BreadcrumbList, ItemList
- `robots` meta: `max-image-preview:large`
- Sitemap: `@astrojs/sitemap`
- RSS: `/rss.xml`
- IndexNow: `/indexnow-key.txt`

## Legacy Next.js (`src/`)

Stary stack Next.js 15 pozostaje w repozytorium jako referencja. **Nie używaj** `npm run dev` z root dla Next — użyj skryptów monorepo powyżej.

## Licencja

Treści i zdjęcia © Marcin Bochenek. Kod projektu — prywatny.
