#!/usr/bin/env bash
# =============================================================================
# deploy-mac-mini.sh — deploy idrivecars.pl na Mac Mini (self-hosted)
#
# Użycie:
#   ./scripts/deploy-mac-mini.sh              # pełny deploy
#   ./scripts/deploy-mac-mini.sh --skip-build # restart bez rebuildu
#   DEPLOY_PATH=~/sites/idrivecars ./scripts/deploy-mac-mini.sh
#
# Wymaga: Node.js ≥20, npm, git, .env.production w DEPLOY_PATH
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_PATH="${DEPLOY_PATH:-$HOME/sites/idrivecars}"
SKIP_BUILD=false
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://idrivecars.pl}"
HEALTH_URL="${SITE_URL}/api/health"

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    -h|--help)
      echo "Usage: $0 [--skip-build]"
      echo "  DEPLOY_PATH  katalog instalacji (default: ~/sites/idrivecars)"
      exit 0
      ;;
    *) echo "Nieznany argument: $arg" >&2; exit 1 ;;
  esac
done

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

command -v node >/dev/null || die "Brak node"
command -v npm >/dev/null || die "Brak npm"

mkdir -p "$DEPLOY_PATH"

# Sync repo (jeśli deploy z git clone — pomiń jeśli już w DEPLOY_PATH)
if [[ "$REPO_ROOT" != "$DEPLOY_PATH" ]]; then
  log "Sync $REPO_ROOT → $DEPLOY_PATH"
  rsync -a --delete \
    --exclude node_modules \
    --exclude .next \
    --exclude .git \
    --exclude content/import/autogaleria/cache \
    "$REPO_ROOT/" "$DEPLOY_PATH/"
fi

cd "$DEPLOY_PATH"

[[ -f .env.production ]] || die "Brak .env.production — skopiuj z .env.production.example"

# shellcheck disable=SC1091
set -a && source .env.production && set +a

[[ -n "${ADMIN_SECRET:-}" ]] || die "ADMIN_SECRET pusty w .env.production"
[[ -n "${NEXT_PUBLIC_SITE_URL:-}" ]] || die "NEXT_PUBLIC_SITE_URL pusty w .env.production"

log "Instalacja zależności (npm ci)"
npm ci --omit=dev=false

if [[ "$SKIP_BUILD" == false ]]; then
  log "Checki przed buildem"
  npm run validate:content
  npm run lint

  log "Build produkcyjny"
  NODE_ENV=production npm run build
  npm run smoke:static
else
  log "Pominięto build (--skip-build)"
fi

log "Restart usługi (launchd)"
PLIST="$HOME/Library/LaunchAgents/com.idrivecars.site.plist"
if [[ -f "$PLIST" ]]; then
  launchctl bootout "gui/$(id -u)/com.idrivecars.site" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  launchctl kickstart -k "gui/$(id -u)/com.idrivecars.site"
else
  log "Brak launchd plist — uruchamiam npm start w tle (ręczny tryb)"
  pkill -f "next start" 2>/dev/null || true
  nohup npm run start > "$DEPLOY_PATH/logs/app.out.log" 2> "$DEPLOY_PATH/logs/app.err.log" &
fi

log "Czekam na health check..."
sleep 3
for i in 1 2 3 4 5; do
  if curl -sf "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null; then
    log "Health OK (localhost)"
    break
  fi
  sleep 2
done

if command -v curl >/dev/null; then
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    log "Health OK ($HEALTH_URL)"
  else
    log "UWAGA: health przez domenę publiczną niedostępny — sprawdź Caddy/DNS"
  fi
fi

log "Deploy zakończony. Smoke: ./scripts/smoke-production.sh"
