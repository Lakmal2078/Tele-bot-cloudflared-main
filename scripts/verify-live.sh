#!/usr/bin/env bash
# Read-only post-deployment verification for Fast xBet Cash Cloudflare Worker.
set -euo pipefail

BASE_URL="${PUBLIC_BASE_URL:-https://xbet-telegram-bot.lakmal-gamage.workers.dev}"
BASE_URL="${BASE_URL%/}"
D1_NAME="${D1_DATABASE_NAME:-fastxbetcash_bot-db}"

PASS=0
FAIL=0

check_status() {
  local method="$1"
  local path="$2"
  local expected="$3"
  shift 3
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$@" "${BASE_URL}${path}")"
  if [[ "$code" == "$expected" ]]; then
    echo "  [PASS] ${method} ${path} -> HTTP ${code}"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] ${method} ${path} -> HTTP ${code} (expected ${expected})"
    FAIL=$((FAIL + 1))
  fi
}

echo "======================================================"
echo " Live Deployment Verification: ${BASE_URL}"
echo "======================================================"
echo ""
echo "1. Checking public endpoints & security guards..."
check_status GET "/health" "200"
check_status GET "/api/status" "200"
check_status GET "/api/tips/preview?limit=3" "200"
check_status GET "/" "200"
check_status GET "/en/" "200"
check_status GET "/ta/" "200"
check_status GET "/admin" "200"
check_status GET "/robots.txt" "200"
check_status GET "/sitemap.xml" "200"
check_status GET "/bot-description-640x360.jpg" "200"
check_status POST "/webhook" "401" -H "Content-Type: application/json" -d "{}"
check_status GET "/api/admin/status" "401"

echo ""
echo "2. Checking /health payload & /admin security headers..."
HEALTH_JSON="$(curl -sS "${BASE_URL}/health")"
if grep -q '"healthy":true' <<< "$HEALTH_JSON"; then
  echo "  [PASS] /health reports configuration.healthy=true"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] /health response unexpected: ${HEALTH_JSON}"
  FAIL=$((FAIL + 1))
fi

ADMIN_HEADERS="$(curl -sI "${BASE_URL}/admin" | tr -d '\r')"
if grep -qi '^x-frame-options: DENY' <<< "$ADMIN_HEADERS" && grep -qi "frame-ancestors 'none'" <<< "$ADMIN_HEADERS"; then
  echo "  [PASS] /admin includes anti-clickjacking headers (DENY + frame-ancestors 'none')"
  PASS=$((PASS + 1))
else
  echo "  [FAIL] /admin missing expected X-Frame-Options or CSP frame-ancestors"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "3. Checking remote Cloudflare D1 migrations..."
if D1_OUTPUT="$(npx --no-install wrangler d1 migrations list "$D1_NAME" --remote 2>&1)"; then
  echo "$D1_OUTPUT"
  if grep -qi "No migrations to apply" <<< "$D1_OUTPUT"; then
    echo "  [PASS] All remote D1 migrations are applied"
    PASS=$((PASS + 1))
  else
    echo "  [WARN] Pending migrations detected above. Apply with:"
    echo "         npx wrangler d1 migrations apply ${D1_NAME} --remote"
  fi
else
  echo "  [INFO] Wrangler remote auth unavailable in this shell. Run in your authenticated terminal:"
  echo "         npx wrangler d1 migrations list ${D1_NAME} --remote"
fi

echo ""
echo "4. Checking Telegram webhook status..."
if [[ -n "${ADMIN_API_SECRET:-}" ]]; then
  WEBHOOK_INFO="$(curl -sS -H "X-Admin-Secret: ${ADMIN_API_SECRET}" "${BASE_URL}/api/setup-webhook?action=info")"
  echo "  ${WEBHOOK_INFO}"
  if grep -q '"webhookUrlSet":true' <<< "$WEBHOOK_INFO" && grep -q '"hasLastError":false' <<< "$WEBHOOK_INFO"; then
    echo "  [PASS] Telegram webhook is registered with zero errors"
    PASS=$((PASS + 1))
  else
    echo "  [WARN] Check webhook response above. To sync, run:"
    echo "         curl -X POST -H \"X-Admin-Secret: \$ADMIN_API_SECRET\" \"${BASE_URL}/api/setup-webhook?action=set\""
  fi
else
  echo "  [INFO] Set ADMIN_API_SECRET to verify webhook automatically, or run:"
  echo "         curl -sS -H \"X-Admin-Secret: <ADMIN_API_SECRET>\" \"${BASE_URL}/api/setup-webhook?action=info\""
fi

echo ""
echo "Summary: ${PASS} passed, ${FAIL} failed"
if (( FAIL > 0 )); then
  exit 1
fi
