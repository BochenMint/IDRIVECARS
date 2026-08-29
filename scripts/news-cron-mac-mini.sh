#!/usr/bin/env bash
# Cron news pipeline — uruchamiaj co 2h na Mac Mini (launchd lub crontab)
# Użycie: ./scripts/news-cron-mac-mini.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_PATH="${DEPLOY_PATH:-$HOME/sites/idrivecars}"
LOG_DIR="$DEPLOY_PATH/logs"
mkdir -p "$LOG_DIR"

cd "$DEPLOY_PATH"
[[ -f .env.production ]] && set -a && source .env.production && set +a

LOG="$LOG_DIR/news-cron-$(date +%Y%m%d).log"
exec >>"$LOG" 2>&1

echo "=== news-cron $(date -Iseconds) ==="

npm run news:sanity
npm run news:scan

# Opcjonalnie: przygotuj zadania AI (inference osobno — wolne, ~60s/szkic)
# npm run news:ai-prepare

echo "=== done ==="
