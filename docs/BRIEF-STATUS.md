# Brief F1–F5 + LoRA — status wdrożenia

Checklist: co jest w monorepo vs co wymaga lokalnych credentiali na Macu właściciela.

## F1 — Fundament `site/` (Astro SSG, SEO, E-E-A-T)

| Element | Status | Uwagi |
|---------|--------|-------|
| Astro 5 + React islands + Tailwind | ✅ | `site/` — 137 stron w buildzie |
| Szablony: news, test, model, porównanie | ✅ | `src/pages/{news,testy,modele,porownanie}` |
| Schema.org NewsArticle / Article / Review | ✅ | `site/src/lib/seo.ts` + `reviewSchema` |
| `max-image-preview:large`, sitemap, RSS | ✅ | BaseLayout + `@astrojs/sitemap` + `rss.xml` |
| IndexNow po deployu | 🔶 Mac-local | `scripts/deploy-site.sh` + `agent/publish/indexnow.py` |
| Strona autora E-E-A-T + polityka redakcyjna | ✅ | `/o-mnie`, `/polityka-redakcyjna` |
| Jawne wsparcie AI w news | ✅ | sekcja na `/news/[slug]` |
| Sloty reklamowe o stałych wymiarach (CLS) | ✅ | `AdSlot.astro` |
| Lighthouse ≥ 95 z reklamami | 🔶 do zmierzenia | po podłączeniu prawdziwych reklam + CMP |
| Hero ≥ 1200 px / AVIF-WebP | 🔶 | galerie WEBP w legacy; pipeline Sharp w `scripts/` |

## F2 — Migracja archiwum (fale)

| Element | Status | Uwagi |
|---------|--------|-------|
| 121 testów w content collection | ✅ | `site/src/content/tests/` (kopia z `content/testy/`) |
| Limit 15–25/tydzień (nie hurtem) | ✅ | `agent/enrich/wave_config.yaml` `max_per_week: 20` |
| Canonical / aktualizacja przy republice | ✅ | `published_elsewhere_policy: canonical_or_update` |
| `refresh_tests.py` — „Ten model dziś” | ✅ | cena wtórna + rata + funnel |
| Harmonogram launchd | 🔶 Mac-local | opis w `agent/README.md` |

## F3 — Agent newsowy

| Element | Status | Uwagi |
|---------|--------|-------|
| Ingest RSS + HTML diff + registry 25–30 marek | ✅ | `agent/ingest/` |
| Dedup hash + similarity | ✅ | `pipeline.py` |
| Enrich ≥2 sygnałów PL (twardy warunek) | ✅ | `agent/enrich/enrich.py` |
| Draft + banned phrases lint + voice LoRA hook | ✅ | `LOCAL_LLM_URL`, `VOICE_LORA` |
| Gate Telegram, `AUTO_PUBLISH=false` | ✅ / 🔶 | kod gotowy; tokeny na Macu |
| Publish → commit → build → IndexNow | ✅ | `agent/publish/` |
| Limit 8–10 newsów/dobę | ✅ | `agent/config.py` |
| Log źródła/licencji assetów | ✅ | `news_assets_log` + ingest logging |

## F4 — Lead-gen

| Element | Status | Uwagi |
|---------|--------|-------|
| `finance.ts` + vitest | ✅ | 5/5 testów |
| LeasingCalc → LeadForm dopiero po kalkulacji | ✅ | island `hasCalculated` |
| Tryby `redirect` / `form` per partner | ✅ | props + `leadgen/config.py` |
| Webhook lead + consent_log atomowo | ✅ | `POST /webhook/lead` |
| RODO erase endpoint | ✅ | `DELETE /rodo/erase` |
| Routing ubezpieczeń A/B + `OFWCA_ACTIVE=false` | ✅ | test `leadgen/tests/test_routing.py` |
| Dashboard konwersji | ✅ | `GET /dashboard?token=` |
| Tabela `commissions` | ✅ | `data/schema.sql` |
| Partnerzy afiliacyjni (MyLead itd.) | 🔶 Mac-local | URL-e w `.env` |
| Ścieżka B OFWCA | 🔶 | po rejestracji multiagencji |

## F5 — Monetyzacja display

| Element | Status | Uwagi |
|---------|--------|-------|
| Consent Mode v2 default denied | ✅ | `BaseLayout.astro` |
| CMP TCF 2.2 | 🔶 TODO | placeholder Cookiebot/Complianz + publisher ID |
| `ads.txt` | 🔶 placeholder | `pub-0000000000000000` |
| Sloty ręczne (po 2. akapicie, mid, anchor, sticky) | ✅ | bez Auto Ads |
| Optymalizator >50k PV | ❌ później | Optad360 / Yieldbird |

## §6 — Voice LoRA

| Element | Status | Uwagi |
|---------|--------|-------|
| `prepare_dataset.py` (scrub dat/cen) | ✅ | `lora/` |
| Trening MLX / Unsloth | 🔶 Mac / RTX | skrypty gotowe |
| Ewaluacja (blind + lint + hallucination) | ✅ | `evaluate.py` |
| Wpięcie w draft agenta | 🔶 | `VOICE_LORA=idrive_voice_v1` na Macu |
| Pętla v2 z tekstów zaakceptowanych w gate | ✅ | opisane w `lora/README.md` + `config.yaml` |

## Dystrybucja / media

| Element | Status | Uwagi |
|---------|--------|-------|
| API assetów artykułu (Shorts/Reels) | ✅ | `GET /api/article-assets?slug=` |
| Produkcja Shorts/Reels | ❌ poza repo | pipeline wideo właściciela |

## CI / deploy

| Element | Status |
|---------|--------|
| GitHub Actions: test + build + compileall | ✅ `.github/workflows/ci.yml` |
| Deploy Mac + Cloudflare Tunnel | 🔶 `scripts/deploy-site.sh` |
| Legacy Next.js `src/` | DEPRECATED — nie rozwijać |

---

**Legenda:** ✅ w repo | 🔶 wymaga credentiali / Macu / pomiaru | ❌ poza zakresem tej iteracji
