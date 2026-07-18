# IDRIVECARS

Portfolio dziennikarskie i blog motoryzacyjny **Marcina Bochenka** — autorskie testy samochodów, pierwsze jazdy i galerie zdjęć.

**Jedyny frontend:** Astro 5 w `site/`. Legacy Next.js jest w `archive/next-legacy/` (tylko referencja — nie deployuj).

## Struktura

```
site/                 # Astro 5 SSG — produkcja idrivecars.pl
content/              # Źródło treści (testy MDX) → sync do site/src/content/tests/
public/galleries/     # WEBP galerie (symlinkowane do site/public/galleries)
agent/                # Pipeline news (ingest → enrich → draft → gate → publish)
leadgen/              # FastAPI — leady, RODO, routing ubezpieczeń, dashboard
lora/                 # Voice LoRA (prepare / train / evaluate)
data/                 # SQLite schema + seed
scripts/              # Galerie, import, deploy
archive/next-legacy/  # ARCHIWUM Next.js 15 — nie rozwijaj
docs/BRIEF-STATUS.md  # Status faz briefu v2
```

## Uruchomienie

```bash
npm install --prefix site
npm run dev          # http://localhost:4321
npm run build
npm run test         # vitest — finance.ts
```

```bash
npm run db:init
npm run leadgen      # FastAPI :8000
python3 agent/pipeline.py --dry-run
```

## Design

Zachowany język wizualny z poprzedniej wersji (Next):

- Kolory: surface `#FAFAF8`, ink `#171717`, muted `#737373`, accent `#B91C1C`
- Typografia: Instrument Serif (display) + DM Sans
- Spokojne CTA (czarne), bez czerwonego billboardu
- Split hero na home, karty testów 16/10, lightbox galerii

## Sync treści

```bash
for f in content/testy/*.mdx; do
  cp -n "$f" "site/src/content/tests/$(basename "$f" .mdx).md"
done
```

## Deploy (Mac + Cloudflare Tunnel)

```bash
export DEPLOY_PATH=/path/to/local/serve
./scripts/deploy-site.sh
```

Szczegóły statusu faz: [`docs/BRIEF-STATUS.md`](docs/BRIEF-STATUS.md).
