# Poranny brief — IDRIVECARS 2.0

> **Data:** 2026-07-01 · **Pass:** 9 SAFE (nocna pętla) · **Bez commitów w repo.**

---

## Executive summary

Projekt jest **technicznie zielony**: build, lint, walidacja treści, style guardrails, testy RSS i `smoke:static` przechodzą. **201 stron SSG** (+ `/admin/content/drafts`), **152 galerie / 5024 zdjęć** w manifeście. Rdzeń CMS, panel admin (w tym lista szkiców) i pipeline newsów działają lokalnie.

**Nie jest gotowy na publiczny launch „world-class”** bez decyzji Marcina: merge 16 slugów, 5 manual-review, `ADMIN_SECRET` na hostingu, strategia mediów (~1,4 GB `public/`, galerie poza gitem) i redakcyjna akceptacja importów aG.

**Pass 9 dodał:** widok szkiców `/admin/content/drafts`, skrypt `npm run smoke:static`, audyt large assets w `CHANGESET-SPLIT-PLAN.md`, weryfikacja raportów import (spójne z Pass 8).

---

## Werdykt checków (Pass 9)

| Check | Status |
|-------|--------|
| `npm run validate:content` | ✓ |
| `npm run style:check` | ✓ |
| `npm run news:sanity` | ✓ |
| `npm run news:test-rss` | ✓ |
| `npm run lint` | ✓ |
| `npm run build` | ✓ (201 stron) |
| `npm run smoke:static` | ✓ (17/17) |
| `clean:import-links --dry-run` | ✓ (0 zmian) |
| `report:published-imports-media` | ✓ (17 z mediami, 0 bez) |
| `report:slug-conflicts` | ✓ (21 konfliktów, bez zmian) |
| `audit:source-fidelity` | ✓ (0 low-fidelity po korekcji) |

Szczegóły w sekcji [Komendy weryfikacyjne](#komendy-weryfikacyjne).

---

## Co jest publish-ready

| Obszar | Stan |
|--------|------|
| **Rdzeń techniczny** | Build, routing, SEO (sitemap, feed, robots), ArticleView, galerie WebP responsive |
| **~100+ legacy testów** | Lokalne galerie, opublikowane |
| **6 felietonów** | Tekst OK |
| **Wybrane importy aG** | Z `galleryDir` — Porsche Targa, Volvo XC90, Lexus, AMG GT S test itd. |
| **CI** | `.github/workflows/ci.yml` (PR) + `news-scan.yml` (cron) |
| **Redirect Citroën C3** | 301 → `citroen-c3-16-vti-exclusive-2` |

---

## Co NIE publikować bez decyzji

| Pozycja | Powód |
|---------|--------|
| **16 slug merge** | `merge:slug-conflicts --apply` — czeka na akceptację |
| **5 manual-review slugów** | bmw-435i, mazda-mx-5-nd, nowa-skoda-superb, test-mercedes-amg-gt-s, volkswagen-t6 |
| **BMW 328i xDrive** | Draft — brak galerii F30 (audyt Pass 7) |
| **Bentley tapety** | Draft — renderer gotowy, wymaga `status: published` po review |
| **AMG GT S video** | Draft — archiwum filmowe, nie news |
| **18+ newsów import aG** | Martwe linki `autogaleria.pl`, brak lokalnych hero |
| **Produkcja bez `ADMIN_SECRET`** | Panel admin otwarty |

---

## P0 — wymaga Marcina dziś

1. **`ADMIN_SECRET`** na hostingu (Basic Auth panelu).
2. **`npm run merge:slug-conflicts --apply`** — po przeczytaniu raportu (`content/import/autogaleria/slug-conflict-report.json`). **Nie uruchamiać** bez akceptacji.
3. **5 manual-review** — decyzja per slug (zachować istniejący vs merge body z aG).
4. **Strategia mediów** — `public/galleries` jest gitignored (~5k WebP). Wybierz: CDN upload / LFS / osobne repo (patrz [`CHANGESET-SPLIT-PLAN.md`](CHANGESET-SPLIT-PLAN.md)).
5. **Deploy staging** — smoke według [`PRODUCTION-SMOKE-RUNBOOK.md`](PRODUCTION-SMOKE-RUNBOOK.md).

---

## P1 — po P0

| # | Temat | Akcja |
|---|-------|-------|
| 1 | BMW 328i | Ręczne mapowanie zdjęć F30 (D:\MARCIN / fetch CDN aG) |
| 2 | Bentley tapety | Po review: `status: published` — renderer `[wallpapers]` + `galleryDir` już spięte |
| 3 | AMG video | Decyzja: archiwum draft vs merge do testu AMG GT S |
| 4 | Linki aG w treści | Masowy rewrite → idrivecars.pl lub `clean:import-links` |
| 5 | News AI | Review-only (bielik); bez autopublish; **tylko oficjalne press roomy** (agregatory usunięte) |
| 6 | Git / lockfile | Usunąć `pnpm-lock.yaml` LUB przejść na pnpm — nie oba |

---

## P2 — jakość / później

- E2E testy przeglądarkowe
- Więcej włączonych oficjalnych RSS (obecnie 2/81: Toyota US + Toyota global) — Stellantis per marka po rozwiązaniu 403 / allowlist IP
- Adapter Playwright dla press roomów z loginem (BMW, Mercedes, VW/Skoda, Renault)
- HLS / batch wideo
- Duplikat treści Citroën — redirect już jest; opcjonalny merge

---

## Decyzje wymagane od Marcina

| # | Pytanie | Opcje |
|---|---------|-------|
| 1 | Co na D1 deploy? | Tylko legacy testy / + felietony / + archiwum news |
| 2 | Merge 16 slugów | `--apply` / odłożyć / partial |
| 3 | 5 manual-review | Lista w `slug-conflict-report.json` |
| 4 | Media w repo | CDN vs LFS vs osobne repo ([plan](CHANGESET-SPLIT-PLAN.md)) |
| 5 | Bentley tapety | Publikować jako osobny wpis vs sekcja testu Bentley |

---

## Komendy weryfikacyjne

```bash
# Pełny gate (jak CI)
npm ci
npm run validate:content
npm run style:check
npm run news:sanity
npm run news:test-rss
npm run lint
npm run build

# Raporty przed merge slugów
npm run report:slug-conflicts
npm run audit:source-fidelity
npm run merge:slug-conflicts:dry-run

# Smoke lokalny (bez serwera)
npm run build
npm run smoke:static
# → patrz docs/PRODUCTION-SMOKE-RUNBOOK.md

# NIE uruchamiać bez zgody:
# npm run merge:slug-conflicts --apply
# npm run curate:galleries
```

---

## Morning correction: source fidelity

**Wykryto i naprawiono zmyśloną treść.** Artykuł `/testy/bmw-x6-m50d-fl` (i kilka innych) publikował **GPT-rewrite / placeholder** zamiast tekstu Marcina z autoGALERIA.pl. Lead zaczynał się od „X6 M50d to crossover w wydaniu M Performance…”, podczas gdy oryginał zaczyna się od **„Kupujesz SUV-a, rezygnujesz ze sportu…”** z sekcjami „Podczas normalnej jazdy…”, „Wewnątrz…”, „Włączmy tryb Sport+…”, „M Performance”, „Podsumowanie”, „Dane techniczne”.

### Root cause

1. **Legacy MDX** (import lokalny / AI placeholder) istniały **przed** stagingiem `content/import/autogaleria/`.
2. **`integrate-autogaleria-cms`** celowo **nie nadpisywał** istniejących slugów.
3. **`merge-slug-conflicts`** i **`report-slug-conflicts`** rekomendowały „merge-metadata-only, NIE nadpisywać body” — co **zatrzymało fałszywą treść** przy prawdziwym imporcie JSON.

### Naprawione pliki (body z importu JSON)

| Plik | Było (znaków) | Import (znaków) | Problem |
|------|---------------|-----------------|---------|
| `content/testy/bmw-x6-m50d-fl.mdx` | 1544 | 7123 | GPT-rewrite, brak sekcji Marcina |
| `content/testy/mazda-mx-5-nd-do-korzeni.mdx` | 1535 | 7089 | Placeholder + footer „Tekst pierwotnie opublikowany…” |
| `content/testy/mercedes-maybach-s-600.mdx` | 2781 | 11246 | Skrót/synteza zamiast pełnego testu |
| `content/testy/volkswagen-passat-alltrack-all-inclusive.mdx` | 1494 | 8529 | Generic SUV copy |
| `content/blog/motoryzacyjny-luksus-ksiestwa-monako-czesc-1-galeria.mdx` | 36 | 223 | Stub vs lead importu (draft galerii) |

Galerie (`galleryDir`, `heroImage`) zachowane. Martwe linki/obrazy aG w body oczyszczone (`clean:import-links`).

### Nowy gate: `npm run audit:source-fidelity`

Porównuje MDX z `content/import/autogaleria/articles/json/*.json`: similarity, długość, lead, nagłówki, hallmark AI. Flaga `--fix` podmienia body **tylko** gdy slug pliku = slug importu (nie cross-link `originalUrl`). Raport: `content/import/autogaleria/source-fidelity-report.json`.

**Nie auto-naprawiano** (świadomie): `lexus-nx-300h-f-sport` (lokalny test 10k znaków vs stub importu 989), `ford-focus-rs` (treść OK, tylko footer), `pierwsza-jazda-formula-adac` (unikalny test, `originalUrl` → felieton `single-seater-fun`), 5 manual-review slugów z raportu konfliktów.

### Checki po korekcie

| Check | Status |
|-------|--------|
| `npm run audit:source-fidelity` | ✓ 0 low-fidelity |
| `npm run validate:content` | ✓ 0 błędów |
| `npm run lint` | ✓ |
| `npm run build` | ✓ 201 stron |

**Nie uruchamiać** `merge:slug-conflicts --apply` bez `audit:source-fidelity` — merge metadanych sam nie naprawi złego body.

---

## Katalog newsów — official-only (Pass 10)

| Metryka | Wartość |
|---------|---------|
| Źródeł w seedzie | 81 |
| Włączone (auto-skan) | 2 (`toyota-pressroom-rss`, `toyota-global-rss`) |
| Unikalnych marek | ~100 |
| Usunięte agregatory | `autocentrum-rss`, `motorsport-pl-rss` |

Źródła newsów: **wyłącznie oficjalne press roomy** marek/importerów. `npm run news:sanity` failuje przy agregatorach w katalogu. Szczegóły: [`NEWS-AUTOMATION.md`](NEWS-AUTOMATION.md).

---

## Pass 9 — co zrobiono (SAFE)

| Zadanie | Wynik |
|---------|--------|
| **Admin draft preview** | `/admin/content/drafts` — read-only lista szkiców CMS + news MDX z powodami; link w nav i `/admin/content`. Bez przycisku publish. |
| **Smoke bez deployu** | `scripts/post-build-smoke.ts` → `npm run smoke:static` (manifest, sitemap/feed, drafty CMS, galerie). |
| **Import cleanup** | `clean:import-links --dry-run` 0 zmian; raporty media/slug bez regresji. |
| **Large assets policy** | Sekcja w [`CHANGESET-SPLIT-PLAN.md`](CHANGESET-SPLIT-PLAN.md) — ~1,38 GB galerie, MP4, cache aG. |
| **Build** | 201 stron (+1 admin drafts). |

**Uwaga techniczna:** `news/[slug]/generateStaticParams` nadal generuje trasy dla draftów newsów (runtime 404). Optymalizacja P2 — filtrowanie po `status: published`.

---

## Pass 8 — co zrobiono

| Zadanie | Wynik |
|---------|--------|
| **CI na PR** | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — validate, style, news sanity + test-rss, lint, build. Osobno [`news-scan.yml`](../.github/workflows/news-scan.yml) (cron). Package manager: **npm** (`package-lock.json`). |
| **Renderer tapet** | `src/lib/content/wallpapers.ts` + `WallpapersSection.tsx` — shortcode `[wallpapers]`, `galleryDir`, linki 1920/1366/1280 z WebP responsive. **Bentley nadal draft** — podgląd po `status: published`. |
| **Admin UX** | Link Review w nav, badge published/rejected, runbook w review, liczniki summary |
| **Git hygiene** | [`docs/CHANGESET-SPLIT-PLAN.md`](CHANGESET-SPLIT-PLAN.md) — 7 proponowanych PR |
| **Brief** | Ten plik — uporządkowany (bez logu passów 1–7) |

---

## Renderer tapet — status

- **Kod:** gotowy w pipeline `getArticleBySlug` → `ArticleView`.
- **Test case:** `content/blog/tapety-z-naszego-testu-bentley-continental-gt-v8-s-convertible.mdx` (draft).
- **Galeria:** `galleries/bentley-continental-gt-v8-s-convertible` (475 WebP w manifeście).
- **Weryfikacja wizualna:** ustaw tymczasowo `status: published` lokalnie LUB poczekaj na decyzję redakcyjną.

---

## Rekomendacja: STOP do decyzji użytkownika

Nocna pętla osiągnęła **stan „merge-ready po decyzjach”**. Kolejny automatyczny pass nie przyniesie dużej wartości bez Marcina.

**Dziś rano:**

1. Przeczytaj ten brief + [`CHANGESET-SPLIT-PLAN.md`](CHANGESET-SPLIT-PLAN.md) (sekcja large assets).
2. Wykonaj P0: `ADMIN_SECRET`, decyzje slugów (16+5), strategia mediów CDN.
3. Pierwszy commit według planu PR 1 + PR 7.
4. Opcjonalnie: `npm run smoke:static` po każdym buildzie lokalnym.

**Nie kontynuować pętli** bez: merge slugów, strategii CDN, deploy staging smoke z `PRODUCTION-SMOKE-RUNBOOK.md`.

---

## Odnośniki

| Dokument | Cel |
|----------|-----|
| [`PUBLISHING-CHECKLIST.md`](PUBLISHING-CHECKLIST.md) | Checklista przed launch |
| [`PRODUCTION-SMOKE-RUNBOOK.md`](PRODUCTION-SMOKE-RUNBOOK.md) | Smoke po deploy |
| [`NEWS-AUTOMATION.md`](NEWS-AUTOMATION.md) | Pipeline newsów |
| [`CHANGESET-SPLIT-PLAN.md`](CHANGESET-SPLIT-PLAN.md) | Podział commitów |
| [`data/content/pass7-media-assessment.json`](../data/content/pass7-media-assessment.json) | Ocena mediów |

---

*Historia passów 1–7 zarchiwizowana w git diff / poprzednie wersje pliku. Ten brief jest jedynym źródłem prawdy na poranek 2026-07-01.*
