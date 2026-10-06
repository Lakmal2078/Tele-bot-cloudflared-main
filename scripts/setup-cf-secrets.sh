#!/usr/bin/env bash
# Interactive setup script for Cloudflare Worker Secrets (1xBet Sri Lanka Affiliate & Local Cashier)
# Run with: bash scripts/setup-cf-secrets.sh
# Requirements: wrangler CLI installed (npm install -g wrangler)
set -euo pipefail

echo "======================================================"
echo " Cloudflare Worker Secrets Configuration (1xBet LK)"
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
    printf '%s\n' "$val" | npx wrangler secret put "$key"
    echo "✅ $key set."
  elif [[ "$is_required" == "true" ]]; then
    echo "⚠️ $key was skipped but is required. Set it later with: npx wrangler secret put $key"
  else
    echo "ℹ️ $key skipped (optional)."
  fi
}

echo "1. Telegram Bot Token (from @BotFather)"
set_secret "BOT_TOKEN" "Telegram Bot Token from BotFather" true

echo ""
echo "2. Telegram Admin Numeric IDs (e.g. 123456789,987654321)"
set_secret "ADMIN_IDS" "Comma-separated numeric Telegram user IDs" true

echo ""
echo "3. Telegram Admin Chat / Group ID (for deposit slips and withdrawal alerts)"
set_secret "ADMIN_CHAT_ID" "Telegram Chat ID (e.g. -1004336999467)" false
set_secret "ADMIN_CHANNEL_ID" "Admin audit channel fallback (optional)" false

echo ""
echo "4. Webhook Secret (minimum 16 random characters)"
DEFAULT_WEBHOOK_SECRET="$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
echo "A random webhook secret has been generated locally (value hidden)."
read -r -p "Use generated webhook secret? [Y/n]: " use_webhook_gen
if [[ "$use_webhook_gen" =~ ^[Nn]$ ]]; then
  set_secret "WEBHOOK_SECRET" "Min 16 chars secret" true
else
  printf '%s\n' "$DEFAULT_WEBHOOK_SECRET" | npx wrangler secret put "WEBHOOK_SECRET"
  echo "✅ WEBHOOK_SECRET set (value hidden)."
fi

echo ""
echo "5. Admin API Secret (minimum 24 characters)"
DEFAULT_ADMIN_SECRET="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
echo "A random admin API secret has been generated locally (value hidden)."
read -r -p "Use generated admin secret? [Y/n]: " use_admin_gen
if [[ "$use_admin_gen" =~ ^[Nn]$ ]]; then
  set_secret "ADMIN_API_SECRET" "Min 24 chars admin API secret" false
else
  printf '%s\n' "$DEFAULT_ADMIN_SECRET" | npx wrangler secret put "ADMIN_API_SECRET"
  echo "✅ ADMIN_API_SECRET set."
fi

echo ""
echo "6. The Odds API Key (optional, for live sports odds)"
set_secret "ODDS_API_KEY" "The-Odds-API key (leave empty if none)" false

echo ""
echo "7. Withdrawal Security Code Pepper (required for withdrawal security codes)"
DEFAULT_PEPPER="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "A random withdrawal-code pepper has been generated locally (value hidden)."
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

echo ""
echo "8. Sri Lankan Bank Details (for cashier deposits)"
set_secret "COMMERCIAL_DETAILS" "Commercial Bank: Account Number, Holder Name, Branch" false
set_secret "SAMPATH_DETAILS" "Sampath Bank: Account Number, Holder Name, Branch" false
set_secret "HNB_DETAILS" "Hatton National Bank (HNB): Account Number, Holder Name, Branch" false
set_secret "BOC_DETAILS" "Bank of Ceylon (BOC): Account Number, Holder Name, Branch" false
set_secret "PEOPLES_DETAILS" "People's Bank: Account Number, Holder Name, Branch" false
set_secret "LOLC_DETAILS" "LOLC Bank / Finance account details" false
set_secret "BANK_DETAILS" "Generic / other bank account details" false

echo ""
echo "9. Mobile Money & Crypto Details"
set_secret "EZCASH_NUMBER" "eZ Cash mobile number (Dialog)" false
set_secret "MCASH_NUMBER" "mCash mobile number (Mobitel)" false
set_secret "BINANCE_PAY_ID" "Binance Pay ID for 0% fee USDT deposits" false
set_secret "USDT_TRC20_ADDRESS" "USDT TRC20 Wallet Address" false
set_secret "USDT_BEP20_ADDRESS" "USDT BEP20 (BSC) Wallet Address" false
set_secret "FRIMI_NUMBER" "FriMi mobile number / ID" false
set_secret "IPAY_NUMBER" "iPay mobile number" false

echo ""
echo "10. Customer Support Contact"
set_secret "WHATSAPP_NUMBER" "WhatsApp customer support number (e.g. 94776763093)" false

echo ""
echo "11. 1xBet Official Affiliate System"
set_secret "XBET_LINK" "Primary 1xPartners affiliate registration URL with SubID support" false
set_secret "XBET_PROMO_CODE" "Official 1xBet Promo Code (e.g. VGSL for 130% welcome bonus)" false

echo ""
echo "12. Channel & Proofs Configuration"
set_secret "PROOF_CHANNEL_URL" "Telegram Channel URL showcasing successful transaction proofs" false
set_secret "TIPS_CHANNEL_ID" "Telegram channel ID for automated free tips broadcasting (e.g. -1004336999467)" false
set_secret "TIPS_CHANNEL_URL" "Telegram channel URL for tips (e.g. https://t.me/fast_xbet_official_tips)" false

echo ""
echo "======================================================"
echo "🎉 Secrets configuration complete!"
echo "======================================================"
echo ""
echo "Next steps:"
echo "1. Register the Telegram webhook:"
echo "   curl -X POST -H 'X-Admin-Secret: <ADMIN_API_SECRET>' '<PUBLIC_BASE_URL>/api/setup-webhook?action=set'"
echo "2. Deploy the Worker:"
echo "   npm run deploy"
echo ""
