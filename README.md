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
cms/                  # FastAPI — panel właściciela (testy, newsy, publikacja)
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
npm run cms          # FastAPI :8001 — panel właściciela
python3 agent/pipeline.py --dry-run
```

## CMS (panel właściciela)

```bash
pip install -r cms/requirements.txt
cp cms/.env.example cms/.env   # ustaw CMS_PASSWORD, CMS_SECRET
npm run cms                    # http://127.0.0.1:8001/cms/
```

Workflow: wklej tekst → dodaj zdjęcia → **Publikuj**. SEO i frontmatter uzupełniają się automatycznie.
Szczegóły: [`cms/README.md`](cms/README.md).

```bash
python3 -m pytest cms/tests -q
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
