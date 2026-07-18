#!/usr/bin/env bash
# Deploy idrivecars.pl Astro site to local serve path (Mac + Cloudflare Tunnel).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DEPLOY_PATH="${DEPLOY_PATH:-}"
SITE_URL="${SITE_URL:-https://idrivecars.pl}"

if [[ -z "$DEPLOY_PATH" ]]; then
  echo "ERROR: Set DEPLOY_PATH to the local directory served by cloudflared/nginx." >&2
  echo "Example: DEPLOY_PATH=/Users/you/Sites/idrivecars.pl ./scripts/deploy-site.sh" >&2
  exit 1
fi

echo "==> Building site"
npm run build --prefix site

echo "==> Copying dist/ to ${DEPLOY_PATH}"
mkdir -p "$DEPLOY_PATH"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete site/dist/ "$DEPLOY_PATH/"
else
  rm -rf "${DEPLOY_PATH:?}"/*
  cp -a site/dist/. "$DEPLOY_PATH/"
fi

INDEXNOW_SCRIPT="$REPO_ROOT/agent/publish/indexnow.py"
if [[ -f "$INDEXNOW_SCRIPT" ]]; then
  echo "==> IndexNow ping (if configured)"
  if python3 "$INDEXNOW_SCRIPT" --sitemap "$SITE_URL/sitemap-index.xml" 2>/dev/null; then
    :
  else
    echo "IndexNow skipped or failed (check INDEXNOW_KEY in agent/.env)"
  fi
else
  echo "IndexNow script not found — skipping"
fi

cat <<'NOTE'

==> Cloudflare cache
Purge cache in Cloudflare dashboard (Caching → Purge Everything) or via API
after deploy if HTML/assets look stale. Tunnel itself does not cache responses.

NOTE

echo "Deploy complete."
