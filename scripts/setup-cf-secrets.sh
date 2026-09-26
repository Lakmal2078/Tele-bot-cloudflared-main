#!/usr/bin/env bash
# Interactive or automated Cloudflare Secrets setup for XBet Telegram Bot
set -euo pipefail

echo "======================================================"
echo " Cloudflare Worker Secrets Configuration"
echo "======================================================"
echo ""

echo "This script sets required secrets for the Cloudflare Worker."
echo "Note: values set here override same-named [vars] in wrangler.toml."
echo "Do NOT define the same key in both [vars] and secrets."
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

echo "6. Withdrawal Security Code Pepper (required for withdrawal security codes)"
DEFAULT_PEPPER="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "Generated suggested pepper: $DEFAULT_PEPPER"
read -r -p "Use generated pepper? [Y/n]: " use_pepper_gen
if [[ "$use_pepper_gen" =~ ^[Nn]$ ]]; then
  read -r -s -p "Enter SECURITY_CODE_PEPPER (minimum 16 characters): " custom_pepper
  echo
  if (( ${#custom_pepper} < 16 )); then
    echo "❌ SECURITY_CODE_PEPPER must be at least 16 characters."
    exit 1
  fi
  printf '%s\n' "$custom_pepper" | npx wrangler secret put "SECURITY_CODE_PEPPER"
  unset custom_pepper
  echo "✅ SECURITY_CODE_PEPPER set."
else
  printf '%s\n' "$DEFAULT_PEPPER" | npx wrangler secret put "SECURITY_CODE_PEPPER"
  echo "✅ SECURITY_CODE_PEPPER set."
fi

echo "7. Bank Details (optional, for deposits)"
set_secret "BANK_DETAILS" "Bank name, account number, account holder" false

echo "8. Payment rail numbers (mobile money — previously committed in wrangler.toml)"
set_secret "EZCASH_NUMBER" "eZ Cash mobile number" false
set_secret "MCASH_NUMBER" "mCash mobile number" false
set_secret "FRIMI_NUMBER" "FriMi mobile number" false
set_secret "IPAY_NUMBER" "iPay mobile number" false

echo "9. Customer Support WhatsApp number"
set_secret "WHATSAPP_NUMBER" "WhatsApp number with country code, e.g. 9477XXXXXXX" false

echo "10. 1xBet Affiliate (partner-sensitive — previously committed in wrangler.toml)"
set_secret "XBET_LINK" "1xBet affiliate/registration link" false
set_secret "XBET_PROMO_CODE" "1xBet promo code" false

echo ""
echo "======================================================"
echo "🎉 Secrets configuration complete!"
echo "Now register the Telegram webhook by visiting:"
echo "https://<your-worker>.workers.dev/api/setup-webhook?action=set"
echo "======================================================"
