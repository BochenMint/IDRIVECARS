# Launch Playbook — idrivecars.pl (Mac Mini 24/7)

> Master przepis end-to-end: DNS → deploy → HTTPS → smoke → SEO → Ads → cron → backup → monitoring.

## Architektura docelowa

```
Internet
   │
   ▼
[DNS idrivecars.pl → publiczne IP routera]
   │
   ▼
[Router: port forward 80, 443 → Mac Mini]
   │
   ▼
[Caddy :443 — Let's Encrypt auto-TLS]
   │
   ▼
[Next.js :3000 loopback — npm run start]
   │
   ├── /api/health          ← monitoring
   ├── /admin/*             ← Basic Auth (ADMIN_SECRET)
   └── public/galleries/    ← ~1.4 GB WebP (lokalnie, nie w git)

Równolegle (tailnet):
[PC Windows — Agentic OS] ──Tailscale──► [Mac Mini — Ollama :11434]
                                              ▲
                                    news AI pipeline (opcjonalnie)
```

**Integracja Agentic OS:** Mac Mini już hostuje Ollama dla Agentic OS (Faza 1). idrivecars.pl to **osobna usługa** na tym samym hoście — nie koliduje z Ollama (porty 3000 vs 11434). News cron może używać `LOCAL_AI_BASE_URL=http://127.0.0.1:11434`. Zasada Agentic OS: **Tailscale serve, NIGDY funnel** dla wrażliwych usług — publiczna strona idrivecars.pl idzie przez **Caddy + publiczne IP**, nie przez funnel.

---

## Faza 0 — Przygotowanie (dziś, przed DNS)

### Checki lokalne (wszystkie ✅ w audycie 2026-07-12)

```bash
npm run validate:content   # 0 błędów
npm run lint               # OK
npm run build              # 171 stron SSG
npm run smoke:static       # 17/17 OK
```

### Blokery launch (decyzje właściciela)

| Bloker | Priorytet | Akcja |
|--------|-----------|-------|
| `ADMIN_SECRET` nie ustawiony na Mac | **P0** | wygeneruj, wpisz w `.env.production` |
| Merge 16 slugów | P1 | `npm run merge:slug-conflicts -- --apply` po akceptacji |
| 5 manual-review slugów | P1 | decyzja redakcyjna |
| BMW 328i bez galerii | P2 | zostaje draft — nie blokuje launchu |
| Media 1.4 GB | P0 deploy | skopiuj `public/galleries` + `public/videos` na Mac |

### Pliki gotowe do skopiowania

```
scripts/deploy-mac-mini.sh
scripts/smoke-production.sh
scripts/news-cron-mac-mini.sh
deploy/mac-mini/Caddyfile
deploy/mac-mini/com.idrivecars.site.plist
deploy/mac-mini/com.idrivecars.news-cron.plist
.env.production.example
```

---

## Faza 1 — DNS + domena

### U rejestratora (idrivecars.pl)

| Typ | Host | Wartość | TTL |
|-----|------|---------|-----|
| **A** | `@` | `TWOJE_PUBLICZNE_IP` | 300 |
| **A** | `www` | `TWOJE_PUBLICZNE_IP` | 300 |
| **AAAA** | `@` | `TWOJE_IPV6` (jeśli masz) | 300 |

**Nie ustawiaj** CNAME na `@` jeśli rejestrator nie wspiera ALIAS — użyj A record.

### Router / firewall

- Port forward **80/tcp** → Mac Mini (LAN IP, np. 192.168.1.50)
- Port forward **443/tcp** → Mac Mini
- Wyłącz DMZ — tylko konkretne porty

### Weryfikacja DNS (po propagacji ~5–60 min)

```bash
dig +short idrivecars.pl A
dig +short www.idrivecars.pl A
curl -I http://idrivecars.pl
```

---

## Faza 2 — Setup Mac Mini

### 2.1 Prereqs

```bash
# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install node@22 caddy git rsync
brew install --cask tailscale   # jeśli jeszcze nie ma (Agentic OS)

node --version   # ≥20
```

### 2.2 Klon / sync projektu

```bash
mkdir -p ~/sites/idrivecars/logs
cd ~/sites

# Opcja A: git clone (po pushu na remote)
git clone <REPO_URL> idrivecars

# Opcja B: rsync z PC (media osobno — duże!)
# rsync -avz --progress user@pc:"D:/IDRIVECARS 2.0/" ~/sites/idrivecars/
# rsync -avz --progress user@pc:"D:/IDRIVECARS 2.0/public/galleries/" ~/sites/idrivecars/public/galleries/
# rsync -avz --progress user@pc:"D:/IDRIVECARS 2.0/public/videos/" ~/sites/idrivecars/public/videos/
```

### 2.3 Zmienne produkcyjne

```bash
cd ~/sites/idrivecars
cp .env.production.example .env.production
chmod 600 .env.production

# Wygeneruj ADMIN_SECRET:
openssl rand -base64 48

# Edytuj .env.production:
#   ADMIN_SECRET=<wynik>
#   NEXT_PUBLIC_SITE_URL=https://idrivecars.pl
```

### 2.4 Deploy

```bash
chmod +x scripts/*.sh
./scripts/deploy-mac-mini.sh
```

### 2.5 LaunchAgent (autostart po reboot)

```bash
sed "s/PLACEHOLDER_USER/$USER/g" deploy/mac-mini/com.idrivecars.site.plist \
  > ~/Library/LaunchAgents/com.idrivecars.site.plist

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.idrivecars.site.plist
launchctl kickstart -k gui/$(id -u)/com.idrivecars.site
```

---

## Faza 3 — HTTPS (Caddy)

### 3.1 Konfiguracja

```bash
sed "s/PLACEHOLDER_USER/$USER/g" deploy/mac-mini/Caddyfile \
  | sudo tee /opt/homebrew/etc/Caddyfile

# Edytuj e-mail Let's Encrypt w Caddyfile
sudo caddy validate --config /opt/homebrew/etc/Caddyfile
```

### 3.2 Uruchomienie

```bash
# Test:
sudo caddy run --config /opt/homebrew/etc/Caddyfile

# Produkcja (brew services):
sudo brew services start caddy
```

Caddy automatycznie:
- wystawia certyfikat Let's Encrypt
- odnawia co 60 dni
- proxy HTTPS → `127.0.0.1:3000`

### Alternatywy (gdy brak publicznego IP)

| Opcja | Kiedy | Uwagi |
|-------|-------|-------|
| **Tailscale Funnel** | brak stałego IP | custom domain możliwy; sprawdź limity |
| **Cloudflare Tunnel** | chcesz CDN + DDoS | wymaga konta Cloudflare |
| **Dynamic DNS** | zmienne IP | A record + skrypt aktualizacji |

Dla profesjonalnego launchu bloga: **publiczne IP + Caddy** jest najprostsze.

---

## Faza 4 — Smoke test produkcji

```bash
export ADMIN_SECRET='twoje-haslo'
./scripts/smoke-production.sh

# Lub ręcznie:
curl -s https://idrivecars.pl/api/health | jq .
```

Pełny runbook: [`PRODUCTION-SMOKE-RUNBOOK.md`](PRODUCTION-SMOKE-RUNBOOK.md)

### Health endpoint

`GET /api/health` → JSON:

```json
{
  "status": "ok",
  "service": "idrivecars",
  "buildId": "...",
  "checks": { "galleriesManifest": true }
}
```

Użyj w UptimeRobot / Better Stack — interwał 5 min, alert e-mail.

---

## Faza 5 — Google Search Console

1. [search.google.com/search-console](https://search.google.com/search-console)
2. Dodaj właściwość: **Prefiks URL** `https://idrivecars.pl`
3. Weryfikacja: **Tag HTML** (meta) lub plik DNS TXT
4. Po weryfikacji:
   - Wyślij sitemap: `https://idrivecars.pl/sitemap.xml`
   - Wyślij: `https://idrivecars.pl/sitemap-news.xml`
5. Sprawdź **Indeksowanie → Strony** po 48h

---

## Faza 6 — Google Ads (następny dzień)

Pełny przepis: [`GOOGLE-ADS-LAUNCH.md`](GOOGLE-ADS-LAUNCH.md)

Skrót:
1. Konto Google Ads (Expert Mode)
2. GA4 → `NEXT_PUBLIC_GA_MEASUREMENT_ID`
3. Tag konwersji → `NEXT_PUBLIC_GOOGLE_ADS_ID`
4. Kampania Brand (20–30 PLN/dzień)
5. Kampania Testy long-tail (40–60 PLN/dzień)
6. AdSense — osobna aplikacja (tydzień 2+)

---

## Faza 7 — News cron na Mac Mini

```bash
sed "s/PLACEHOLDER_USER/$USER/g" deploy/mac-mini/com.idrivecars.news-cron.plist \
  > ~/Library/LaunchAgents/com.idrivecars.news-cron.plist

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.idrivecars.news-cron.plist
```

Pipeline:
```
co 2h: news:scan → raw JSON
ręcznie: news:ai-prepare → news:ai-run-local → news:fact-check → news:ai-apply
review: /admin/news/review → status: published
```

Ollama na Macu (Agentic OS): `LOCAL_AI_BASE_URL=http://127.0.0.1:11434`

Szczegóły: [`NEWS-AUTOMATION.md`](NEWS-AUTOMATION.md)

---

## Faza 8 — Backup & content workflow

### Co backupować

| Zasób | Częstotliwość | Metoda |
|-------|---------------|--------|
| `content/` (MDX) | po każdej publikacji | git push |
| `public/galleries/` | tygodniowo | rsync → dysk zewnętrzny / NAS |
| `public/videos/` | po dodaniu | rsync |
| `.env.production` | po zmianie | menedżer haseł (1Password) — **nie git** |
| `data/news/` | codziennie | rsync |

### Workflow publikacji treści

1. Edycja MDX lokalnie na PC
2. `npm run validate:content && npm run build`
3. git push → na Mac: `git pull && ./scripts/deploy-mac-mini.sh`
4. Smoke produkcji

### CDN mediów (przyszłość)

Przy 1.4 GB i rosnącym ruchu rozważ:
- **Cloudflare R2** + custom domain `media.idrivecars.pl`
- **Bunny CDN** — tani, prosty dla statycznych WebP

Na launch: serwowanie lokalne z Caddy cache headers (już w `next.config.mjs`).

---

## Faza 9 — Monitoring

### Uptime

- URL: `https://idrivecars.pl/api/health`
- Oczekiwany: HTTP 200, `"status":"ok"`
- Alert: e-mail + Telegram (opcjonalnie przez Agentic OS ntfy)

### Logi

| Plik | Zawartość |
|------|-----------|
| `~/sites/idrivecars/logs/app.out.log` | Next.js stdout |
| `~/sites/idrivecars/logs/app.err.log` | Next.js stderr |
| `~/sites/idrivecars/logs/caddy-access.log` | HTTP access |
| `~/sites/idrivecars/logs/news-cron-*.log` | pipeline news |

Rotacja (opcjonalnie):

```bash
# /etc/newsyslog.d/idrivecars.conf lub newsyslog na macOS
```

### Metryki do obserwacji (tydzień 1)

- 404 na `/galleries/*` (UptimeRobot + GSC)
- Czas odpowiedzi `/api/health` < 500ms
- Rozmiar logów Caddy
- Temperatura / CPU Mac Mini przy peak traffic

---

## Checklist D-day (poranek launchu)

```
□ DNS A/AAAA ustawione, propagacja OK
□ Port forward 80/443 na routerze
□ Mac Mini: .env.production z ADMIN_SECRET + SITE_URL
□ public/galleries + public/videos skopiowane (~1.4 GB)
□ ./scripts/deploy-mac-mini.sh — build OK
□ Caddy działa, HTTPS zielona kłódka
□ ./scripts/smoke-production.sh — 0 FAIL
□ /admin zwraca 401 bez hasła
□ GSC: sitemap wysłana
□ UptimeRobot: health check aktywny
```

## Checklist D+1

```
□ GSC: pierwsze strony w indeksie
□ GA4 Realtime: ruch widać
□ Google Ads: konto założone, tag aktywny (GOOGLE-ADS-LAUNCH.md)
□ Kampania Brand uruchomiona, budżet limitowany
□ News cron: pierwszy scan OK w logach
□ Brak 404 w logach Caddy
```

---

## Ryzyka

| Ryzyko | Wpływ | Mitygacja |
|--------|-------|-----------|
| Mac Mini SPOF | cała strona offline | UPS; backup hostu; przyszłość: CDN cache |
| Brak ADMIN_SECRET | panel otwarty | **P0** — ustaw przed deployem |
| 1.4 GB galleries nie skopiowane | 404 na zdjęciach | rsync z progress; smoke artykułów |
| Zmienne IP | DNS przestaje działać | stałe IP u ISP lub DDNS |
| Przegrzanie Mac | throttling | monitoring temperatury; Caddy gzip |
| Merge slugów niezaakceptowany | duplikaty SEO | apply przed dużym ruchem Ads |
| Weryfikacja Google Ads | kampanie wstrzymane | załóż konto wcześniej (D+1) |

---

## Szybkie komendy (ściągawka)

```bash
# Deploy
./scripts/deploy-mac-mini.sh

# Restart bez rebuildu
./scripts/deploy-mac-mini.sh --skip-build

# Smoke
ADMIN_SECRET='...' ./scripts/smoke-production.sh

# Health lokalnie
curl -s http://127.0.0.1:3000/api/health | jq .

# Logi
tail -f ~/sites/idrivecars/logs/app.err.log

# Status launchd
launchctl print gui/$(id -u)/com.idrivecars.site
```

Powiązane dokumenty:
- [`PUBLISHING-CHECKLIST.md`](PUBLISHING-CHECKLIST.md) — sekcja Launch
- [`PRODUCTION-SMOKE-RUNBOOK.md`](PRODUCTION-SMOKE-RUNBOOK.md)
- [`GOOGLE-ADS-LAUNCH.md`](GOOGLE-ADS-LAUNCH.md)
- [`OVERNIGHT-BRIEF.md`](OVERNIGHT-BRIEF.md)
