#!/usr/bin/env bash
# Interactive or automated Cloudflare Secrets setup for XBet Telegram Bot
set -euo pipefail

echo "======================================================"
echo " Cloudflare Worker Secrets Configuration"
echo "======================================================"
echo ""
echo "This script sets required secrets for the Cloudflare Worker."
echo ""

set_secret() {
  local key="$1"
  local desc="$2"
  local is_required="${3:-true}"

  echo -n "Enter $key ($desc): "
  read -r val
  if [[ -n "$val" ]]; then
    echo "$val" | npx wrangler secret put "$key"
    echo "✅ $key set successfully."
  elif [[ "$is_required" == "true" ]]; then
    echo "⚠️ $key was skipped but is required."
  else
    echo "ℹ️ $key skipped (optional)."
  fi
}

echo "1. Telegram Bot Token (from @BotFather)"
set_secret "BOT_TOKEN" "Telegram Bot Token from BotFather" true

echo "2. Telegram Admin Numeric IDs (e.g. 123456789,987654321)"
set_secret "ADMIN_IDS" "Comma-separated numeric Telegram user IDs" true

echo "3. Webhook Secret (minimum 16 random characters)"
DEFAULT_WEBHOOK_SECRET="$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
echo "Generated suggested secret: $DEFAULT_WEBHOOK_SECRET"
read -r -p "Use generated secret? [Y/n]: " use_gen
if [[ "$use_gen" =~ ^[Nn]$ ]]; then
  set_secret "WEBHOOK_SECRET" "Min 16 chars secret" true
else
  echo "$DEFAULT_WEBHOOK_SECRET" | npx wrangler secret put "WEBHOOK_SECRET"
  echo "✅ WEBHOOK_SECRET set to: $DEFAULT_WEBHOOK_SECRET"
fi

echo "4. Admin API Secret (minimum 24 characters)"
DEFAULT_ADMIN_SECRET="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
echo "Generated suggested admin secret: $DEFAULT_ADMIN_SECRET"
read -r -p "Use generated admin secret? [Y/n]: " use_admin_gen
if [[ "$use_admin_gen" =~ ^[Nn]$ ]]; then
  set_secret "ADMIN_API_SECRET" "Min 24 chars admin API secret" false
else
  echo "$DEFAULT_ADMIN_SECRET" | npx wrangler secret put "ADMIN_API_SECRET"
  echo "✅ ADMIN_API_SECRET set."
fi

echo "5. The Odds API Key (optional, for live sports odds)"
set_secret "ODDS_API_KEY" "The-Odds-API key (leave empty if none)" false

echo "6. Bank Details (optional, for deposits)"
set_secret "BANK_DETAILS" "e.g. Commercial Bank 1234567890 VGS Lakmal" false

echo ""
echo "======================================================"
echo "🎉 Secrets configuration complete!"
echo "Now register the Telegram webhook by visiting:"
echo "https://<your-worker>.workers.dev/api/setup-webhook?action=set"
echo "======================================================"
