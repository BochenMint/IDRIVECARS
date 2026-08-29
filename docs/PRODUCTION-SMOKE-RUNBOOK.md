# Smoke test produkcyjny — idrivecars.pl

> Pass 7 — runbook bez wykonywania deployu. Uruchom **po** ustawieniu env na hostingu i zakończeniu buildu CI.

## 1. Zmienne środowiskowe (Vercel / hosting)

| Zmienna | Wymagana | Przykład | Skutek braku |
|---------|----------|----------|--------------|
| `ADMIN_SECRET` | **TAK** | losowy string ≥32 znaków | `/admin/*` i `/api/admin/*` **otwarte** |
| `NEXT_PUBLIC_SITE_URL` | **TAK** | `https://idrivecars.pl` | Złe canonical, OG, sitemap, feed.xml |

Opcjonalnie lokalnie (news AI — nie na serverless):

```bash
LOCAL_AI_BASE_URL=http://localhost:11434
LOCAL_AI_MODEL=SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M
```

## 2. Checki przed deployem (lokalnie / CI)

```bash
npm run validate:content   # 0 błędów
npm run style:check        # korpus + guardrails PL
npm run news:sanity        # katalog źródeł + moduły news
npm run news:test-rss      # autocentrum + fixture RSS (Pass 6–7, w CI news-scan.yml)
npm run lint
npm run build              # oczekiwane: ~201 stron SSG
```

Zapisz output w notatce deploy / PR.

## 3. Pięć URL-i do smoke (produkcja)

Zamień `BASE` na `NEXT_PUBLIC_SITE_URL` (np. `https://idrivecars.pl`).

| # | URL | Co sprawdzić |
|---|-----|--------------|
| 1 | `{BASE}/` | Strona główna, brak 500, listing artykułów |
| 2 | `{BASE}/testy` | Lista testów, paginacja / filtry |
| 3 | `{BASE}/testy/citroen-c3-16-vti-exclusive-2` | Artykuł z galerią WebP, lightbox, LCP |
| 4 | `{BASE}/news` | Archiwum newsów (import aG) |
| 5 | `{BASE}/testy/test-mercedes-amg-gt-s-testujemy-rywala-911` | Artykuł z **hero video** (`heroVideoUrl`) |

Dodatkowo (nie wliczane w „5 URL”):

- `{BASE}/api/health` — 200, JSON `"status":"ok"`
- `{BASE}/polityka-prywatnosci` — 200 (wymagane przed Google Ads)
- `{BASE}/cookies` — 200
- `{BASE}/sitemap.xml` — 200, zawiera `/testy/...`
- `{BASE}/sitemap-news.xml` — 200
- `{BASE}/feed.xml` — RSS 2.0, poprawny XML

## 4. Panel admin (wymaga `ADMIN_SECRET`)

Basic Auth: użytkownik dowolny, hasło = wartość `ADMIN_SECRET`.

| Ścieżka | Test |
|---------|------|
| `{BASE}/admin/content` | Lista treści MDX, statusy draft/published |
| `{BASE}/admin/news/review` | Kolejka review (raw / draft / review) |

API (Bearer token = `ADMIN_SECRET`):

```bash
curl -s -H "Authorization: Bearer $ADMIN_SECRET" \
  "{BASE}/api/admin/news/scan?dryRun=1"
```

Oczekiwane: JSON bez 401, brak crash na autocentrum-rss (feed: `/rss/newsy/`).

## 5. Rollback / blokery

**Nie deployuj** dopóki:

- [ ] `merge:slug-conflicts --apply` niezaakceptowany (16 slugów)
- [ ] 5 manual-review slugów bez decyzji
- [ ] `ADMIN_SECRET` nie ustawiony na produkcji

Rollback treści przed commitem:

```bash
git checkout -- content/
```

## 6. Raporty Pass 6–7

- RSS: [`data/news/autocentrum-rss-pass6-report.json`](../data/news/autocentrum-rss-pass6-report.json)
- Citroën C3: [`content/import/autogaleria/citroen-c3-duplicate-report.json`](../content/import/autogaleria/citroen-c3-duplicate-report.json)
- Drafty media Pass 6: [`data/content/pass6-media-assessment.json`](../data/content/pass6-media-assessment.json)
- BMW 328i audyt Pass 7: [`data/content/bmw-328i-xdrive-pass7-audit.json`](../data/content/bmw-328i-xdrive-pass7-audit.json)
- Drafty media Pass 7: [`data/content/pass7-media-assessment.json`](../data/content/pass7-media-assessment.json)

## 7. Staging smoke lokalny (bez serwera — Pass 7)

Po `npm run build` zweryfikuj statycznie (PowerShell / bash):

```bash
# Redirect Citroën C3 w konfiguracji Next
grep -A3 "citroen-c3" next.config.mjs

# Galeria Bentley (tapety → test)
test -d public/galleries/bentley-continental-gt-v8-s-convertible && ls public/galleries/bentley-continental-gt-v8-s-convertible | wc -l

# Brak galerii BMW 328i (oczekiwane)
test ! -d public/galleries/bmw-328i-xdrive && echo "OK: brak proxy galerii"
```

Oczekiwane trasy w buildzie (`.next/server/app`): `/testy/citroen-c3-16-vti-exclusive-2`, `/testy/bentley-continental-gt-v8-s-convertible`, `/testy/test-mercedes-amg-gt-s-testujemy-rywala-911`. Drafty (`bmw-328i-xdrive`, tapety, amg-video) **nie** generują publicznych stron.

Szerszy kontekst: [`docs/OVERNIGHT-BRIEF.md`](OVERNIGHT-BRIEF.md), [`docs/PUBLISHING-CHECKLIST.md`](PUBLISHING-CHECKLIST.md).
