#!/usr/bin/env bash
# =============================================================================
# rsync-to-mac.sh — jednorazowy sync repo z Windows/Linux dev → Mac Mini
#
# Użycie (z katalogu repo na maszynie dev):
#   RSYNC_USER=marcin RSYNC_HOST=idrivecars-mac.tailXXXX.ts.net ./deploy/mac-mini/rsync-to-mac.sh
#
# Wymaga: rsync + SSH (na Windows: Git Bash, WSL lub rsync z MSYS2)
# =============================================================================
set -euo pipefail

RSYNC_USER="${RSYNC_USER:-PLACEHOLDER_USER}"
RSYNC_HOST="${RSYNC_HOST:-PLACEHOLDER_TAILSCALE_HOST}"
REMOTE_PATH="${REMOTE_PATH:-sites/idrivecars}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DEST="${RSYNC_USER}@${RSYNC_HOST}:${REMOTE_PATH}/"

echo "=== rsync idrivecars → ${DEST} ==="
echo "Źródło: $REPO_ROOT"
echo

rsync -avz --progress \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude .env.local \
  --exclude .env.production \
  --exclude content/import/autogaleria/cache \
  --exclude content/import/autogaleria/images \
  --exclude data/news/raw \
  --exclude data/news/images \
  --exclude data/news/ai-jobs \
  "$REPO_ROOT/" "$DEST"

echo
echo "=== Sync zakończony ==="
echo "Na Macu:"
echo "  cd ~/${REMOTE_PATH}"
echo "  cp deploy/mac-mini/.env.production.template .env.production"
echo "  # wypełnij ADMIN_SECRET, potem:"
echo "  ./scripts/deploy-mac-mini.sh"
