# Plan podziału commitów / PR — IDRIVECARS 2.0

> Propozycja porządkowania dużego changesetu **bez commitowania w nocnej pętli**.  
> Cel: małe, reviewowalne PR-y zamiast jednego „big bang”.

## Zasady

1. **Kolejność merge** — od infrastruktury i skryptów → CMS/treść → media (osobny deploy lub LFS).
2. **Nie commituj** `.env`, cache importu z pełnymi HTML, ani `node_modules`.
3. **`public/galleries/**`** i **`public/videos/*.mp4`** są w `.gitignore` — media wymagają osobnej strategii (patrz PR 4).
4. **Lockfile** — repo ma `package-lock.json` (npm) i untracked `pnpm-lock.yaml`; przed CI wybierz **jeden** manager i usuń drugi lock.

---

## PR 1 — Tooling, skrypty importu, walidacja

**Tytuł:** `chore: import scripts, content validation, gallery pipeline`

| Obszar | Pliki (przykłady) |
|--------|-------------------|
| Skrypty importu aG | `scripts/import-autogaleria-marcin.ts`, `scripts/integrate-autogaleria-cms.ts`, `scripts/fetch-autogaleria.ts`, `scripts/clean-autogaleria-links.ts` |
| Slug merge | `scripts/report-slug-conflicts.ts`, `scripts/merge-slug-conflicts*.ts` |
| Galerie (build-time) | `scripts/convert-galleries*.ts`, `scripts/generate-gallery-manifest.ts`, `scripts/gallery-links.json`, `scripts/curate-galleries.ts` |
| Walidacja | `scripts/validate-content.ts`, `src/lib/content/validate.ts` |
| Dane pomocnicze | `scripts/data/*.json` (inventory, pairing — bez sekretów) |
| Package | `package.json`, `package-lock.json` (nie oba locki) |

**Test gate:** `npm run validate:content`, `npm run lint`

**Uwaga:** Nie włączać `merge:slug-conflicts --apply` w tym PR — tylko skrypty i raporty.

---

## PR 2 — CMS, routing, komponenty treści

**Tytuł:** `feat: multi-category CMS, ArticleView, SEO, admin panel`

| Obszar | Pliki |
|--------|-------|
| Routing | `src/app/testy/`, `src/app/blog/`, `src/app/felieton/`, `src/app/news/` |
| Content lib | `src/lib/content/articles.ts`, `categories.ts`, `html.ts`, `wallpapers.ts`, `types-article.ts` |
| UI | `src/components/ArticleView.tsx`, `Gallery.tsx`, `WallpapersSection.tsx`, `TestCard.tsx` |
| SEO | `src/lib/seo.ts`, `sitemap.ts`, `feed.xml`, `robots.ts` |
| Admin | `src/app/admin/**`, middleware auth |
| Config | `next.config.mjs` (redirecty, np. Citroën C3) |

**Test gate:** `npm run build`

**Zależność:** po PR 1 (skrypty walidacji).

---

## PR 3 — Treść MDX i staging importu

**Tytuł:** `content: autogaleria MDX, felietony, blog drafts`

| Obszar | Pliki |
|--------|-------|
| Opublikowane / draft MDX | `content/testy/*.mdx` (zmodyfikowane), `content/blog/`, `content/felieton/` |
| Import staging | `content/import/autogaleria/articles/json/*.json` (metadata), opcjonalnie `markdown/` |
| Format | `content/IMPORT-FORMAT.md` |
| Raporty | `content/import/autogaleria/*-report.json`, `data/content/*-assessment.json` |

**Wykluczyć z PR (osobny artifact lub .gitignore):**
- `content/import/autogaleria/cache/` — pełne HTML API
- Duplikaty binarne w cache obrazów

**Test gate:** `npm run validate:content`, `npm run style:check`

**Uwaga:** 21 konfliktów slugów — merge metadata dopiero po decyzji Marcina (5× manual-review).

---

## PR 4 — Media: galerie WebP i wideo

**Tytuł:** `media: gallery manifest + deploy strategy (no binary flood)`

| Problem | Rozmiar |
|---------|---------|
| `public/galleries/**` | ~152 katalogi, ~5024 WebP (+ warianty responsive) — **gitignored** |
| `public/videos/*.mp4` | np. AMG GT S — **gitignored** |
| `src/data/galleries-manifest.json` | JSON ~MB — commitowalny, generowany przez `prebuild` |

**Opcje (wybierz jedną):**

| Strategia | Kiedy |
|-----------|--------|
| **A. Hosting static** — upload `public/galleries` na CDN/S3, `GALLERY_CDN_URL` | Produkcja, repo lekkie |
| **B. Git LFS** | Mały zespół, jeden remote |
| **C. Osobny repo `idrivecars-media`** + submodule / CI artifact | Duże aktualizacje mediów rzadko |
| **D. Deploy script only** | `npm run deploy:autogaleria-galleries` z lokalnego D:\MARCIN |

**W PR commituj tylko:**
- `public/galleries/.gitkeep`
- `src/data/galleries-manifest.json` (lub generuj w CI prebuild)
- `scripts/deploy-autogaleria-galleries.ts`
- Postery wideo (`.jpg`), nie `.mp4`

---

## PR 5 — News automation

**Tytuł:** `feat: news scan, RSS adapters, AI pipeline, review UI`

| Obszar | Pliki |
|--------|-------|
| Katalog źródeł | `content/news-catalog/sources.json` |
| Pipeline | `scripts/news/*.ts`, `scripts/fetch-news-rss.ts` |
| Dane runtime | `data/news/` (index, raw — bez sekretów press) |
| Treść news | `content/news/*.mdx` (import aG + nowe) |
| Style AI | `content/style/`, `data/style/`, `scripts/style/` |
| CI | `.github/workflows/news-scan.yml` |

**Test gate:** `npm run news:sanity`, `npm run news:test-rss`

**Sekrety (nie w repo):** `ADMIN_SECRET`, klucze press roomów w env hostingu.

---

## PR 6 — Style guardrails i dokumentacja

**Tytuł:** `docs: runbooks, publishing checklist, overnight brief`

| Pliki |
|-------|
| `docs/OVERNIGHT-BRIEF.md` |
| `docs/PUBLISHING-CHECKLIST.md` |
| `docs/PRODUCTION-SMOKE-RUNBOOK.md` |
| `docs/NEWS-AUTOMATION.md` |
| `docs/CMS-ADMIN.md` |
| `docs/CHANGESET-SPLIT-PLAN.md` (ten plik) |
| `.env.example` |

---

## PR 7 — CI guardrails (Pass 8)

**Tytuł:** `ci: PR quality gate (validate, style, news, lint, build)`

| Pliki |
|-------|
| `.github/workflows/ci.yml` |
| Ewentualna korekta `package-lock.json` |

**Test gate:** sam workflow na PR.

**Relacja z `news-scan.yml`:**  
- `ci.yml` — na każdy PR/push do main (jakość kodu + build).  
- `news-scan.yml` — cron 05:00 UTC + ręcznie (scan + artefakty AI).

---

## Kolejność merge (rekomendowana)

```
PR1 scripts → PR7 CI → PR2 CMS → PR5 news → PR3 content → PR6 docs → PR4 media (osobno)
```

PR 4 (media) często **po** deploy staging, bo binaria nie idą przez GitHub PR w obecnym `.gitignore`.

---

## Checklist przed pierwszym push

- [ ] Usunąć lub dodać `pnpm-lock.yaml` — jeden package manager
- [ ] `npm run validate:content` — 0 errors
- [ ] `npm run build` — 200 stron
- [ ] Nie commitować `merge:slug-conflicts --apply` bez review
- [ ] `ADMIN_SECRET` tylko w env produkcji
- [ ] Potwierdzić strategię mediów (A/B/C/D powyżej)

---

## Large assets policy (Pass 9 — audyt dysku)

> Pomiar lokalny 2026-07-01. **Nie przenosić** bez decyzji Marcina — tylko klasyfikacja ryzyka Git/CDN.

### Katalogi wysokiego ryzyka (nie commitować do głównego repo)

| Ścieżka | ~Rozmiar | Pliki / uwagi | Rekomendacja |
|---------|----------|---------------|--------------|
| `public/galleries/**` | **~1,38 GB** | 152 katalogi, ~5024 WebP (+ warianty responsive) | **Strategia A (CDN)** lub C (osobne repo media). Już w `.gitignore`. |
| `public/media/heroes/` | **~32 MB** | `mercedes-amg-gt-s-hero-poc.mp4` (32 MB) | CDN / osobny bucket; w repo tylko poster `.jpg` |
| `public/videos/*.mp4` | **~27 MB** | `amg-gt-s-full.mp4` | j.w. — gitignored |
| `content/import/autogaleria/images/` | **~70 MB** | cache obrazów z fetch aG | `.gitignore` lub artifact CI; nie w PR treści |
| `content/import/autogaleria/cache/` | zmienny | pełne HTML API | **nigdy** w Git |

### Największe galerie (top 5 — kandydaci na CDN partial sync)

| Galeria | ~MB |
|---------|-----|
| `dlugi-dystans-skoda-octavia-rs` | 59 |
| `infiniti-q70-mercedes-vito` | 55 |
| `volkswagen-xl1` | 52 |
| `passat-dlugi-dystans` / `passat-d-ugi-dystans` | 51 (duplikat nazwy — do porządku) |
| `lexus-nx-300h-f-sport` | 50 |

### Commitowalne (małe, generowane)

| Plik | Uwagi |
|------|-------|
| `src/data/galleries-manifest.json` | ~MB JSON, `prebuild` |
| `public/galleries/.gitkeep` | placeholder |

### Decyzja wymagana przed push

1. **Gdzie hostować ~1,4 GB `public/`** — Vercel Blob, S3+CloudFront, R2, lub osobne repo `idrivecars-media`.
2. **Czy LFS** — odradzane przy 5k+ plików WebP (koszt, clone time); lepszy CDN + manifest.
3. **`pnpm-lock.yaml`** (untracked) vs `package-lock.json` — jeden manager, drugi lock usunąć po decyzji.
4. **Duplikat folderu galerii** `passat-dlugi-dystans` / `passat-d-ugi-dystans` — merge lub alias w manifeście.

### CI / deploy

- Build lokalny i Vercel wymagają `public/galleries` na dysku buildera **albo** `GALLERY_CDN_URL` (do zaimplementowania gdy wybrana strategia A).
- `npm run smoke:static` weryfikuje manifest po buildzie — nie zastępuje uploadu mediów.
