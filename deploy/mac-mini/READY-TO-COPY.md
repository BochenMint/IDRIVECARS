# READY-TO-COPY — Mac Mini deploy (idrivecars.pl)

> Konkretna lista kroków. Bez teorii. Kolejność ma znaczenie.

## 1. Z Windows (dev) — sync kodu na Mac

W Git Bash / WSL, z katalogu repo:

```bash
export RSYNC_USER=marcin
export RSYNC_HOST=idrivecars-mac.tailXXXX.ts.net   # Twój host Tailscale
./deploy/mac-mini/rsync-to-mac.sh
```

**Media (~1.4 GB)** — osobno, jeśli nie ma na Macu:

```bash
rsync -avz --progress public/galleries/ ${RSYNC_USER}@${RSYNC_HOST}:sites/idrivecars/public/galleries/
rsync -avz --progress public/videos/ ${RSYNC_USER}@${RSYNC_HOST}:sites/idrivecars/public/videos/
```

---

## 2. Na Macu — env i sekrety

```bash
cd ~/sites/idrivecars
cp deploy/mac-mini/.env.production.template .env.production
chmod 600 .env.production
openssl rand -base64 48   # wklej wynik jako ADMIN_SECRET=
nano .env.production      # sprawdź NEXT_PUBLIC_SITE_URL=https://idrivecars.pl
```

---

## 3. Na Macu — pierwszy deploy

```bash
cd ~/sites/idrivecars
chmod +x scripts/*.sh deploy/mac-mini/rsync-to-mac.sh
./scripts/deploy-mac-mini.sh
```

Oczekiwany wynik: build OK, `Health OK (localhost)`.

---

## 4. Na Macu — Caddy (HTTPS)

```bash
brew install caddy
# Edytuj deploy/mac-mini/Caddyfile — zamień PLACEHOLDER_USER na swojego usera
sudo cp deploy/mac-mini/Caddyfile /opt/homebrew/etc/Caddyfile
sudo caddy validate --config /opt/homebrew/etc/Caddyfile
sudo brew services start caddy
```

**DNS u rejestratora** (zanim Caddy wystawi cert):

| Typ | Host | Wartość |
|-----|------|---------|
| A | `@` | publiczne IP routera |
| A | `www` | to samo IP |

**Router:** port forward `80` i `443` → IP Mac Mini.

---

## 5. Na Macu — autostart (launchd)

```bash
cd ~/sites/idrivecars
# Edytuj plisty: zamień PLACEHOLDER_USER na $(whoami)
sed -i '' "s/PLACEHOLDER_USER/$(whoami)/g" deploy/mac-mini/*.plist
mkdir -p logs
cp deploy/mac-mini/com.idrivecars.site.plist ~/Library/LaunchAgents/
cp deploy/mac-mini/com.idrivecars.news-cron.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.idrivecars.site.plist
launchctl kickstart -k gui/$(id -u)/com.idrivecars.site
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.idrivecars.news-cron.plist
```

---

## 6. Smoke test (Mac lub dev po deploy)

```bash
cd ~/sites/idrivecars
source .env.production
BASE_URL=https://idrivecars.pl ADMIN_SECRET="$ADMIN_SECRET" ./scripts/smoke-production.sh
```

Lokalnie na Macu przed DNS:

```bash
BASE_URL=http://127.0.0.1:3000 ADMIN_SECRET="$(grep ADMIN_SECRET .env.production | cut -d= -f2)" ./scripts/smoke-production.sh
```

---

## 7. Health check (curl)

```bash
curl -s http://127.0.0.1:3000/api/health | jq .
curl -s https://idrivecars.pl/api/health | jq .
```

Oczekiwane: `"status":"ok"`, HTTP 200.

---

## Pliki do skopiowania (checklist)

| Plik | Gdzie na Macu |
|------|----------------|
| całe repo (rsync) | `~/sites/idrivecars/` |
| `public/galleries/` | `~/sites/idrivecars/public/galleries/` |
| `public/videos/` | `~/sites/idrivecars/public/videos/` |
| `.env.production` | `~/sites/idrivecars/.env.production` (ręcznie z template) |
| `deploy/mac-mini/Caddyfile` | `/opt/homebrew/etc/Caddyfile` |
| `deploy/mac-mini/*.plist` | `~/Library/LaunchAgents/` |

---

## Zostaje tylko u Ciebie (nie da się zautomatyzować z Windows)

- [ ] DNS A/AAAA u rejestratora
- [ ] Port forwarding 80/443 na routerze
- [ ] `ADMIN_SECRET` — wygeneruj na Macu, nie w repo
- [ ] rsync mediów 1.4 GB
- [ ] Konto Google Analytics / AdSense (opcjonalnie — patrz `docs/GOOGLE-ADS-LAUNCH.md`)
- [ ] UptimeRobot / monitoring zewnętrzny na `/api/health`

---

## Szybki rollback

```bash
launchctl bootout gui/$(id -u)/com.idrivecars.site
pkill -f "next start" || true
# Przywróć poprzedni .next z backupu lub: git checkout && ./scripts/deploy-mac-mini.sh
```
