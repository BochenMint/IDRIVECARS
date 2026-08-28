#!/usr/bin/env bash
# Smoke test produkcji — uruchom po deploy-mac-mini.sh
# Użycie: BASE_URL=https://idrivecars.pl ./scripts/smoke-production.sh
set -euo pipefail

BASE="${BASE_URL:-${NEXT_PUBLIC_SITE_URL:-https://idrivecars.pl}}"
ADMIN_SECRET="${ADMIN_SECRET:-}"

pass=0
fail=0

check() {
  local name="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
  if [[ "$code" == "$expect" ]]; then
    printf '✓ %s (%s)\n' "$name" "$code"
    pass=$((pass + 1))
  else
    printf '✗ %s — oczekiwano %s, jest %s\n' "$name" "$expect" "$code"
    fail=$((fail + 1))
  fi
}

echo "=== smoke-production: $BASE ==="
echo

check "health" "$BASE/api/health"
check "home" "$BASE/"
check "testy" "$BASE/testy"
check "news" "$BASE/news"
check "kontakt" "$BASE/kontakt"
check "polityka-prywatnosci" "$BASE/polityka-prywatnosci"
check "cookies" "$BASE/cookies"
check "sitemap" "$BASE/sitemap.xml"
check "feed" "$BASE/feed.xml"
check "robots" "$BASE/robots.txt"
check "artykuł galeria" "$BASE/testy/citroen-c3-16-vti-exclusive-2"
check "artykuł video" "$BASE/testy/test-mercedes-amg-gt-s-testujemy-rywala-911"

if [[ -n "$ADMIN_SECRET" ]]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin")
  if [[ "$code" == "401" ]]; then
    printf '✓ admin chroniony (401 bez auth)\n'
    pass=$((pass + 1))
  else
    printf '✗ admin — oczekiwano 401, jest %s\n' "$code"
    fail=$((fail + 1))
  fi
else
  echo "— pominięto test admin (brak ADMIN_SECRET w env)"
fi

echo
echo "$pass OK, $fail FAIL"
[[ "$fail" -eq 0 ]]
