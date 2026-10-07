#!/usr/bin/env bash
# Secure Cloudflare Secrets Configuration
# This script sets secrets without printing them to terminal.
set -euo pipefail

echo "======================================================"
echo " Cloudflare Worker Secrets Configuration (Secure)"
echo "======================================================"
echo ""
echo "Note: Secrets will NOT be printed to terminal."
echo "Store generated secrets in a secure location."
echo ""

set_secret() {
  local key="$1"
  local desc="$2"
  local is_required="${3:-true}"
  local use_generated="${4:-false}"

  if [[ "$use_generated" == "true" ]]; then
    # Generate secret but DO NOT print it
    local secret_value
    if [[ "$key" == "WEBHOOK_SECRET" ]] || [[ "$key" == "SECURITY_CODE_PEPPER" ]]; then
      secret_value="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    else
      secret_value="$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
    fi
    
    echo "$secret_value" | npx wrangler secret put "$key" 2>/dev/null
    echo "✅ $key set (value not displayed for security)"
    
    # Write to secure temp file for operator to store safely
    local temp_file
    temp_file="/tmp/${key}_$(date +%s).txt"
    chmod 600 "$temp_file"
    echo "$secret_value" > "$temp_file"
    echo "   ⚠️  Save this value: $temp_file (readable only by you)"
  else
    # Read from stdin without echo
    echo -n "Enter $key ($desc): "
    read -rs val
    echo ""
    
    if [[ -n "$val" ]]; then
      echo "$val" | npx wrangler secret put "$key" 2>/dev/null
      echo "✅ $key set"
    elif [[ "$is_required" == "true" ]]; then
      echo "⚠️ $key was skipped but is required"
    else
      echo "ℹ️ $key skipped (optional)"
    fi
  fi
}

echo "1. Telegram Bot Token (from @BotFather)"
set_secret "BOT_TOKEN" "Telegram Bot Token from BotFather" true false

echo ""
echo "2. Telegram Admin Numeric IDs (e.g. 123456789,987654321)"
set_secret "ADMIN_IDS" "Comma-separated numeric Telegram user IDs" true false

echo ""
echo "3. Webhook Secret (minimum 16 random characters)"
set_secret "WEBHOOK_SECRET" "Min 16 chars secret" true true

echo ""
echo "4. Admin API Secret (minimum 24 characters)"
set_secret "ADMIN_API_SECRET" "Min 24 chars admin API secret" false true

echo ""
echo "5. The Odds API Key (optional, for live sports odds)"
set_secret "ODDS_API_KEY" "The-Odds-API key (leave empty if none)" false false

echo ""
echo "6. Withdrawal Security Code Pepper (required for withdrawal security codes)"
set_secret "SECURITY_CODE_PEPPER" "Minimum 16 characters" true true

echo ""
echo "7. Bank payment details (optional, for deposits)"
set_secret "BANK_DETAILS" "Generic bank transfer details" false false
set_secret "BOC_DETAILS" "BOC bank name, account number, account holder, branch" false false
set_secret "PEOPLES_DETAILS" "People's Bank account details" false false
set_secret "SAMPATH_DETAILS" "Sampath Bank account details" false false
set_secret "LOLC_DETAILS" "LOLC Bank / Finance account details" false false

echo ""
echo "8. Payment rail numbers (mobile money)"
set_secret "EZCASH_NUMBER" "eZ Cash mobile number" false false
set_secret "MCASH_NUMBER" "mCash mobile number" false false
set_secret "FRIMI_NUMBER" "FriMi mobile number" false false
set_secret "IPAY_NUMBER" "iPay mobile number" false false

echo ""
echo "9. Customer Support WhatsApp number"
set_secret "WHATSAPP_NUMBER" "WhatsApp number with country code, e.g. 9477XXXXXXX" false false

echo ""
echo "10. 1xBet Affiliate (partner-sensitive)"
set_secret "XBET_LINK" "1xBet affiliate/registration link" false false
set_secret "XBET_PROMO_CODE" "1xBet promo code" false false

echo ""
echo "======================================================"
echo "🎉 Secrets configuration complete!"
echo "======================================================"
echo ""
echo "Next steps:"
echo "1. Register the Telegram webhook:"
echo "   curl 'https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<PUBLIC_BASE_URL>/webhook&secret_token=<WEBHOOK_SECRET>'"
echo ""
echo "2. Verify webhook:"
echo "   curl 'https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo'"
echo ""
echo "3. Deploy:"
echo "   npm run deploy"
echo ""
echo "IMPORTANT: Keep generated secrets in a secure location."
echo "Rotate secrets every 90 days or after any suspected breach."
echo ""
