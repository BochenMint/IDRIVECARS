# Checklist publikacji — idrivecars.pl

Użyj przed pierwszym deployem produkcyjnym i przed każdą większą publikacją treści.

## A. Środowisko & bezpieczeństwo

### Wymagane na produkcji (Vercel / hosting)

| Zmienna | Wymagana | Opis |
|---------|----------|------|
| `ADMIN_SECRET` | **TAK** | Hasło Basic Auth dla `/admin/*` i Bearer dla `/api/admin/*`. Bez niej panel jest **otwarty**. Min. 32 znaki losowe. |
| `NEXT_PUBLIC_SITE_URL` | **TAK** | Kanoniczny URL, np. `https://idrivecars.pl` — SEO, OG, sitemap, feed.xml |

### Opcjonalne (news AI — lokalnie, nie na Vercel serverless)

| Zmienna | Domyślnie | Opis |
|---------|-----------|------|
| `LOCAL_AI_BASE_URL` | `http://localhost:11434` | Ollama lub LM Studio (`http://localhost:1234/v1`) |
| `LOCAL_AI_MODEL` | — | Zalecany: `SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M` |
| `LOCAL_AI_PROVIDER` | auto | `ollama` lub `openai` |
| `NEWS_SOURCE_IDS` | wszystkie włączone | Filtr skanowania RSS, np. `toyota-pressroom-rss` |

- [ ] `ADMIN_SECRET` ustawiony na produkcji (Basic Auth dla `/admin/*`)
- [ ] `NEXT_PUBLIC_SITE_URL` wskazuje domenę produkcyjną
- [ ] Zmienne news/AI skonfigurowane jeśli używane lokalnie (`LOCAL_AI_*`)
- [ ] Brak sekretów w repo (`.env` w `.gitignore`)

## B. Automatyczne checki (wszystkie muszą przejść)

```bash
npm run validate:content   # 0 błędów
npm run style:check        # korpus + guardrails
npm run news:sanity        # pipeline news
npm run news:test-rss      # autocentrum RSS live + fixture (Pass 6)
npm run lint               # ESLint
npm run build              # SSG bez błędów
```

Zapisz wyniki w PR / notatce deploy.

## C. Treść — przed `status: published`

Dla każdego artykułu:

- [ ] `title`, `lead`, `publishedAt`, `author` (Marcin Bochenek gdzie dotyczy)
- [ ] `galleryDir` wskazuje istniejący folder w `public/galleries/` **lub** świadomie tekst-only
- [ ] Brak martwego `heroImage` (fallback z pierwszego zdjęcia galerii działa)
- [ ] `pros` / `cons` to krótkie listy (nie cały artykuł — bug importu)
- [ ] Linki wewnętrzne → `idrivecars.pl`, nie `autogaleria.pl`
- [ ] `seoTitle` / `seoDescription` unikalne
- [ ] Podgląd lokalny: `/testy/{slug}`, `/news/{slug}`, itd.

## D. Media

- [ ] Nowe galerie: `npx tsx scripts/convert-galleries-responsive.ts <slug>`
- [ ] `npm run curate:galleries` (opcjonalnie, dla dużych folderów)
- [ ] `npm run generate:galleries-manifest` (lub `build` — prebuild robi to sam)
- [ ] Wideo: plik w `public/videos/`, `heroVideoUrl` / `videoUrl` w frontmatter
- [ ] Oryginały na `D:\MARCIN` nietknięte

## E. Import autoGALERIA

- [ ] Raport: `content/import/autogaleria/cms-integration-report.json`
- [ ] Konflikty slugów rozstrzygnięte (21 pozycji)
- [ ] Ostrzeżenia medialne (49) — galeria lokalna lub draft
- [ ] Cache `content/import/autogaleria/cache/` **nie** deployowany na produkcję (opcjonalnie)

## F. News (nowe, nie archiwum)

- [ ] `npm run news:scan`
- [ ] Review w `/admin/news/review`
- [ ] `news:ai-prepare` + `news:ai-run-local` + `news:fact-check` + apply **lub** ręczny MDX
- [ ] `news:style-check` na szkicu
- [ ] Status `published` dopiero po akceptacji redakcyjnej
- [ ] `sitemap-news.xml` zawiera nowy slug

## G. Deploy

- [ ] Commit bez `content/import/**/cache` (jeśli polityka repo tak stanowi)
- [ ] `public/galleries` i `public/videos` w deploy artifact
- [ ] Po deploy: smoke test 5 URL-i (home, listing testów, 1 artykuł z galerią, 1 news, `/admin`)
- [ ] Pełny runbook: [`docs/PRODUCTION-SMOKE-RUNBOOK.md`](PRODUCTION-SMOKE-RUNBOOK.md)
- [ ] Google Search Console / Analytics (jeśli skonfigurowane)

## H. Po deploy — monitoring 24h

- [ ] 404 na obrazkach (`/galleries/...`)
- [ ] Broken links (autogaleria.pl w treści)
- [ ] Core Web Vitals na artykule z dużą galerią
- [ ] RSS `/feed.xml` i `/sitemap-news.xml` dostępne

---

Szczegóły i blokery: [`docs/OVERNIGHT-BRIEF.md`](OVERNIGHT-BRIEF.md)

## I. Nowe komendy (Pass 2)

```bash
npm run clean:import-links          # usuń martwe linki aG z body MDX
npm run draft:imports-without-media # published import bez galerii → draft
npm run report:slug-conflicts       # raport 21 konfliktów
npm run merge:slug-conflicts:dry-run
npm run import:autogaleria:check    # sanity parsera pros/cons (offline + cache)
```

## J. Pass 2 — stan po nocnej pętli 2

- [x] Parser `pros`/`cons` naprawiony + walidacja absurdalnie długich list
- [x] `clean:import-links` — 43 pliki oczyszczone (164 zmiany linków/obrazów)
- [x] 18 newsów importu bez mediów → `draft`
- [x] Raport konfliktów slugów: 16× merge-metadata-only, 5× manual-review
- [x] News E2E: scan→prepare OK; inference wymaga `LOCAL_AI_MODEL` (raport: `data/news/news-e2e-pass2-report.json`)
- [ ] `curate:galleries` — nie uruchamiano (unikanie locków); manifest: **111 galerii / 3014 zdjęć**
- [ ] Batch galerii z cache aG → `public/galleries`
- [ ] Merge metadanych 21 konfliktów (dry-run gotowy, bez zapisu)

## K. Pass 3 — stan po nocnej pętli 3

- [x] `deploy:autogaleria-galleries` — 7 opublikowanych importów dostało galerie z cache (0 published bez mediów)
- [x] Manifest: **118 galerii / 4047 zdjęć**
- [x] `merge:slug-conflicts` — skrypt z `--apply`; dry-run 16 merge + raport `slug-merge-apply-report.json`
- [x] `report:published-imports-media` — 17 published z mediami, 37 draft, 34 deployable z cache
- [x] News E2E pełny: inference `qwen2.5:3b` + apply → `status: review` (raport: `data/news/news-e2e-pass3-report.json`)
- [ ] Merge 16 konfliktów — czeka na `--apply` po akceptacji
- [ ] Batch deploy 34 draftów z cache aG
- [ ] News AI produkcyjny model (bielik-11b / llama3.3) — qwen2.5:3b jakość niedopuszczalna
- [ ] Usunąć / przepisać szkic testowy `too-afraid-to-ask-dylemat-zrozumienia-typow-wybosczych-dieselowych`

### Nowe komendy Pass 3

```bash
npm run deploy:autogaleria-galleries -- --published-only   # cache → public/galleries
npm run deploy:autogaleria-galleries -- --dry-run          # podgląd
npm run report:published-imports-media                     # raport mediów
npm run merge:slug-conflicts                               # dry-run merge 16 slugów
npm run merge:slug-conflicts -- --apply                    # zapis (po akceptacji)
```

### Ollama runbook (news AI)

```bash
# Zalecany model PL (zainstalowany lokalnie, Pass 4):
# LOCAL_AI_MODEL=SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M

# NIE używać do redakcji:
# qwen2.5:3b — halucynacje PL (Pass 3/4)

LOCAL_AI_BASE_URL=http://localhost:11434 \
LOCAL_AI_MODEL=SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M \
npm run news:ai-run-local -- data/news/ai-jobs/<job>.json
npm run news:ai-apply -- data/news/ai-jobs/<job>.output.json
# Autopublish WYŁĄCZONY — tylko status review/draft
```

## L. Pass 4 — stan po nocnej pętli 4

- [x] News AI jakość: bielik-11b E2E inference (~60s); apply zablokowany guardrailem PL; raport `data/news/news-e2e-pass4-quality-report.json`
- [x] qwen2.5:3b szkic → `status: rejected` + tag `review-bad-ai`
- [x] Batch deploy 34 draftów z cache aG (`--draft-only`) — manifest **152 galerii / 5024 zdjęć**
- [x] Raport slugów ulepszony: `fieldDiffs`, `metadataOnlyReady`, `commandPerSlug` w `slug-merge-apply-report.json`
- [x] `.env.example` rozszerzony o env produkcyjne
- [x] Fix guardrail polish-language dla newsów z EN proper nouns (Pass 5)
- [ ] Merge 16 konfliktów — czeka na `--apply` po akceptacji
- [ ] Manual review 5 konfliktów slugów

### Nowe komendy Pass 4

```bash
npm run deploy:autogaleria-galleries -- --draft-only   # cache → public dla draftów
npm run merge:slug-conflicts                           # raport z fieldDiffs (dry-run)
```

## M. Pass 5 — stan po nocnej pętli 5

- [x] Guardrail `polish-language` — proper nouns + skróty branżowe wykluczone; EN stopwords jako filtr bełkotu
- [x] Fact-check: `npm run news:fact-check` + auto w `news:ai-apply` (halucynacje liczb → FAIL)
- [x] Sanity PL/fact-check w `npm run style:check`
- [x] Runbook bielik-11b rozszerzony (timeout, retry, checklist redakcyjny)
- [x] Brief poranny: merge 16 slugów + rollback note + 5 manual-review
- [x] 3 drafty bez galerii — przeanalizowane, pozostają draft (brak bezpiecznych mediów)
- [ ] Merge 16 konfliktów — `npm run merge:slug-conflicts -- --apply` po akceptacji
- [ ] Manual review 5 konfliktów slugów
- [ ] `ADMIN_SECRET` na produkcji

### Poranny workflow news AI (Pass 5)

```bash
npm run news:scan
npm run news:ai-prepare
LOCAL_AI_BASE_URL=http://localhost:11434 \
LOCAL_AI_MODEL=SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M \
npm run news:ai-run-local -- data/news/ai-jobs/<job>.json
npm run news:fact-check -- data/news/ai-jobs/<job>.output.json
npm run news:ai-apply -- data/news/ai-jobs/<job>.output.json
# Review /admin/news/review → status: published ręcznie
```

### Manual review checklist (szkic AI)

- [ ] `news:fact-check` PASS (brak nowych liczb spoza RSS)
- [ ] Guardrail PL PASS (`news:style-check`)
- [ ] Liczby i daty zgodne ze źródłem po weryfikacji człowieka
- [ ] Źródło wspomniane, `licenseWarnings` obecne
- [ ] Brak pseudo-PL / korpo-PR
- [ ] Obrazy — prawa pressroomu przed publikacją

### Merge 16 slugów (poranek)

```bash
# Po akceptacji — metadata-only, bez nadpisywania body:
npm run merge:slug-conflicts -- --apply

# Rollback przed commitem:
git checkout -- content/
```

Raport: `content/import/autogaleria/slug-merge-apply-report.json`

### Nowe komendy Pass 5

```bash
npm run news:fact-check -- data/news/ai-jobs/<job>.output.json
npm run news:ai-apply -- --skip-fact-check data/news/ai-jobs/<job>.output.json  # dev-only
```

## N. Pass 6 — stan po nocnej pętli 6

- [x] **autocentrum-rss** — naprawiony URL (`/rss/newsy/`), walidacja nie-XML w adapterze; raport: [`data/news/autocentrum-rss-pass6-report.json`](../data/news/autocentrum-rss-pass6-report.json)
- [x] `npm run news:test-rss` — fixture offline + live autocentrum
- [x] **citroen-c3** legacy duplicate → `status: draft`; raport: [`content/import/autogaleria/citroen-c3-duplicate-report.json`](../content/import/autogaleria/citroen-c3-duplicate-report.json)
- [x] Ocena draftów bez mediów: [`data/content/pass6-media-assessment.json`](../data/content/pass6-media-assessment.json)
- [x] Smoke runbook produkcyjny: [`docs/PRODUCTION-SMOKE-RUNBOOK.md`](PRODUCTION-SMOKE-RUNBOOK.md)
- [ ] BMW 328i — brak galerii (blocker P1)
- [ ] Bentley tapety / AMG video — draft do decyzji redakcyjnej
- [ ] Merge 16 konfliktów — czeka na `--apply`
- [ ] `ADMIN_SECRET` na produkcji

### Nowe komendy Pass 6

```bash
npm run news:test-rss              # fixture + live autocentrum
npm run news:test-rss -- fixture   # tylko fixture offline
npm run news:test-rss -- live      # tylko live autocentrum
```

## N. Pass 7 — stan po nocnej pętli 7 SAFE

- [x] **BMW 328i audyt** — brak galerii; raport: [`data/content/bmw-328i-xdrive-pass7-audit.json`](../data/content/bmw-328i-xdrive-pass7-audit.json)
- [x] **Bentley tapety** — `canonicalUrl` + `galleryDir` (draft); galeria testowa 475 WebP istnieje
- [x] **AMG GT S video** — `canonicalUrl` → test; pozostaje draft
- [x] **citroen-c3 redirect** — 301 w `next.config.mjs` + `canonicalUrl` w legacy draft
- [x] **CI** — `news:test-rss` w [`news-scan.yml`](../.github/workflows/news-scan.yml)
- [x] Ocena Pass 7: [`data/content/pass7-media-assessment.json`](../data/content/pass7-media-assessment.json)
- [ ] BMW 328i — brak galerii (blocker P1 — wymaga ręcznych zdjęć F30)
- [ ] Bentley tapety — renderer `[wallpapers]` przed publikacją
- [ ] AMG video — decyzja redakcyjna archiwum vs merge
- [ ] Merge 16 konfliktów — czeka na `--apply`
- [ ] `ADMIN_SECRET` na produkcji
