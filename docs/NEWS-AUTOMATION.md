# Moduł automatyzacji NEWS — IDRIVECARS

Skalowalny pipeline: **skan źródeł → raw → AI draft → review → published**.

## Architektura

```
content/news-catalog/sources.json   # katalog źródeł (konfiguracja)
        ↓
scripts/news/scan.ts                # crawler (RSS + public HTML)
        ↓
data/news/raw/*.json                # surowe press release + metadane
data/news/index.json                # indeks + deduplikacja (hash)
        ↓
scripts/news/ai-prepare.ts          # prompty dla lokalnego modelu
data/news/ai-jobs/*.json|.prompt.txt
        ↓
[lokalny model: Ollama / LM Studio]
        ↓
scripts/news/ai-run-local.ts        # lokalny model (Ollama / LM Studio)
        ↓
scripts/news/ai-apply.ts            # szkic MDX (draft / review)
        ↓
content/news/*.mdx                  # po ręcznej zmianie status → published
        ↓
/news, /news/[slug], sitemap, NewsArticle JSON-LD
```

### Statusy pipeline

| Status | Znaczenie |
|--------|-----------|
| `raw` | Pobrane, czeka na kolejkę AI |
| `needs-ai-draft` | Zakolejkowane do modelu |
| `draft` | Szkic AI — niepubliczny |
| `review` | Do akceptacji redaktora |
| `published` | Widoczne na /news |
| `rejected` | Odrzucone |

**Autopublish jest wyłączony.** Nawet przy wysokim `confidence` wynik trafia max do `review`.

## Uruchomienie

```bash
# 1. Sanity check (katalog, pliki, hash)
npm run news:sanity

# 2. Codzienny skan włączonych źródeł
npm run news:scan

# Opcjonalnie:
NEWS_SCAN_DRY_RUN=1 npm run news:scan
NEWS_DOWNLOAD_IMAGES=1 npm run news:scan
NEWS_SOURCE_IDS=bmw-press-rss,porsche-newsroom-rss npm run news:scan

# 3. Przygotuj zadania AI
npm run news:ai-prepare

# 4. Uruchom lokalny model przez wrapper (zalecany: bielik-11b)
LOCAL_AI_BASE_URL=http://localhost:11434 LOCAL_AI_MODEL=SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M npm run news:ai-run-local -- data/news/ai-jobs/job-xxx.json

# LM Studio / OpenAI-compatible:
LOCAL_AI_BASE_URL=http://localhost:1234/v1 LOCAL_AI_MODEL=local-model npm run news:ai-run-local -- data/news/ai-jobs/job-xxx.json

# Bez sieci i zapisu:
npm run news:ai-run-local -- data/news/ai-jobs/job-xxx.json --dry-run

# 5. Zastosuj wynik AI (style + fact-check)
npm run news:ai-apply -- data/news/ai-jobs/job-xxx.output.json

# Fact-check osobno (przed apply lub po inference):
npm run news:fact-check -- data/news/ai-jobs/job-xxx.output.json

# albo od razu po poprawnym wyniku AI:
LOCAL_AI_BASE_URL=http://localhost:11434 LOCAL_AI_MODEL=SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M npm run news:ai-run-local -- data/news/ai-jobs/job-xxx.json --apply

# 6. W MDX zmień status na published po review
```

### Panel review

- `/admin/news/review` — lista pozycji `raw`, `needs-ai-draft`, `draft`, `review`.
- Dla rekordów raw można zmienić status przez API (`Do AI`, `Review`, `Odrzuć`).
- Dla szkiców MDX panel jest read-only: finalny `status: "published"` ustaw ręcznie po review.

### Cron bez SSH

Endpoint chroniony tym samym `ADMIN_SECRET` co `/admin`:

```bash
# dry-run (GET zawsze bez zapisu)
curl -H "Authorization: Bearer $ADMIN_SECRET" https://idrivecars.pl/api/admin/news/scan

# dry-run przez POST (domyślne)
curl -X POST -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"sourceIds":["toyota-pressroom-rss"]}' \
  https://idrivecars.pl/api/admin/news/scan

# realny zapis wymaga jawnego dryRun:false
curl -X POST -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"dryRun":false,"downloadImages":false,"autoQueueAi":true}' \
  https://idrivecars.pl/api/admin/news/scan
```

### Harmonogram (Windows Task Scheduler)

```
Program: npm
Argumenty: run news:scan
Katalog: D:\IDRIVECARS 2.0
Wyzwalacz: codziennie 06:00
```

### GitHub Actions

Workflow: `.github/workflows/news-scan.yml` — codzienny skan na runnerze (wymaga commitu artefaktów lub osobnego storage).

## Katalog źródeł

Plik: `content/news-catalog/sources.json`

### Polityka official-only

**Dozwolone są wyłącznie oficjalne press roomy producentów, importerów i marek.** Portale redakcyjne i agregatory (np. AutoCentrum, Motorsport.com) zostały **usunięte** z katalogu i nie mogą wrócić jako `enabled`.

- `sourceType: external_media` — zarezerwowany dla ewentualnych wpisów archiwalnych; **nigdy** w auto-skanie.
- Włącz (`enabled: true`) tylko źródła oficjalne ze stabilnym RSS lub zweryfikowanym HTML **bez logowania**.
- Większość marek premium wymaga konta press room (`requires_login` / `loginRequired: true`) — są w seedzie, ale skanowane dopiero po adapterze Playwright + credentials.

**Aktywny auto-skan (Pass 10):** `toyota-pressroom-rss`, `toyota-global-rss` — 2 oficjalne kanały RSS (zweryfikowane). Stellantis RSS w seedzie, ale **wyłączony** (403 z botów — włączyć po allowlist IP).

**Usunięte z katalogu:** `autocentrum-rss`, `motorsport-pl-rss`. Legacy `content/news-sources.json` jest pusty (`[]`) — nie używać.

**Pokrycie seedu:** ~81 wpisów, ~100 unikalnych marek (VW Group w tym Škoda/SEAT/CUPRA, BMW Group, Mercedes, Stellantis per marka, Renault Group, Toyota/JP/KR/CN EV, luxury, commercial opcjonalnie).

**Wymaga weryfikacji / adaptera:** BMW PressClub, Mercedes media, VW/Audi/Skoda newsroomy, Renault Group HTML, chińskie EV (Zeekr, Avatr, Deepal…), Ford RSS URL, większość `newsroom_html` bez publicznego RSS.

Pola kluczowe:
- `sourceType`: `rss` | `newsroom_html` | `api` | `media_kit` | `requires_login` | `external_media` (zablokowany w skanie)
- `enabled`: czy skanować
- `fetchUrl`: URL RSS / listingu / API
- `loginRequired`: informacja dla redaktora (adapter logowania — TODO)
- `verificationStatus`: `verified` | `needs_review` | `broken`
- `selectors`: CSS dla `newsroom_html`
- `includeKeywords` / `excludeKeywords`: filtry

Stare pliki `content/news-sources.json` i `content/press-sources.json` są fallbackiem, jeśli katalog nie istnieje.

## Interfejs AI

Wejście (`AiDraftInput`): surowy rekord + instrukcje stylu (jak sekcja Testy).

Wyjście (`AiDraftOutput`): tytuł, lead, body Markdown, SEO, tagi, `licenseWarnings`, `confidence`.

Prompty: `data/news/ai-jobs/*.prompt.txt`  
Kontrakt: `src/lib/news/ai-contract.ts`

Integracja z Ollama przez wrapper:

```bash
LOCAL_AI_BASE_URL=http://localhost:11434 LOCAL_AI_MODEL=SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M npm run news:ai-run-local -- data/news/ai-jobs/job-xxx.json
```

Wrapper waliduje `licenseWarnings`, `jobId`, SEO i `confidence`. Brak ostrzeżeń licencyjnych blokuje zapis outputu.

### Fact-check (Pass 5)

`news:ai-apply` automatycznie porównuje liczby, daty, waluty, procenty i oznaczenia modeli w outputcie AI względem raw RSS. Nowe wartości spoza źródła → **FAIL** (brak zapisu MDX).

```bash
npm run news:fact-check -- data/news/ai-jobs/job-xxx.output.json
```

Dev-only: `npm run news:ai-apply -- --skip-fact-check data/news/ai-jobs/job-xxx.output.json`

### Runbook lokalnego AI

| Parametr | Wartość |
|----------|---------|
| Model | `SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M` |
| Provider | Ollama (`http://localhost:11434`) |
| Timeout | ~60–120 s; przy timeout retry 1× |
| Autopublish | **WYŁĄCZONY** — max `status: review` |
| Nigdy | `qwen2.5:3b` |

**Poranny workflow:**

```bash
npm run news:scan && npm run news:ai-prepare
LOCAL_AI_MODEL=SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M npm run news:ai-run-local -- data/news/ai-jobs/<job>.json
npm run news:fact-check -- data/news/ai-jobs/<job>.output.json
npm run news:ai-apply -- data/news/ai-jobs/<job>.output.json
# Review w /admin/news/review → ręcznie status: published
```

**Checklist redakcyjny:** fact-check PASS, liczby ze źródła, brak pseudo-PL, źródło w treści, prawa do zdjęć.

## SEO

- `NewsArticle` JSON-LD na `/news/[slug]`
- `canonical` z `seoTitle` / `canonicalUrl` w frontmatter
- `/sitemap.xml` — opublikowane newsy
- `/sitemap-news.xml` — wpisy z ostatnich 48h (Google News)

## Testy

```bash
npm run news:sanity      # walidacja katalogu + official-only + pokrycie marek
npm run news:test-rss    # fixture offline + live Toyota + Stellantis RSS
```

## Ograniczenia (świadomie)

1. **Brak adaptera logowania** — źródła `requires_login` są w seedzie, ale nie skanowane automatycznie.
2. **HTML newsroomy są kruche** — selektory CSS wymagają per-źródłowej konfiguracji i monitoringu.
3. **Prawa do zdjęć** — moduł pobiera metadane i ostrzega; decyzja prawna po stronie redaktora.
4. **Brak bazy danych** — pliki JSON/MDX wystarczą na start; przy >1000 wpisów/dzień rozważ SQLite/Postgres.
5. **Stary skrypt** `npm run fetch:news` nadal działa (legacy RSS → MDX published); nowy pipeline jest rekomendowany.

## Kolejny plan

1. Adapter Playwright + credentials dla BMW/Mercedes/Stellantis press roomów.
2. Akcja panelu: bezpieczne zatwierdzanie MDX `review` → `published`.
3. Podgląd pełnego raw body w panelu i diff AI draft vs źródło.
4. Monitoring źródeł, które zwracają błędy RSS/HTML.
5. Eksport `news-decisions.json` + raw → fine-tuning lokalnego modelu.
6. Per-źródłowe testy kontraktowe (snapshot HTML → oczekiwane pola).
