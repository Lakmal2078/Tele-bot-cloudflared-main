#!/usr/bin/env bash
# ==============================================================================
# 🚇 Cloudflare Tunnel (cloudflared) Setup Script for Telegram Webhook
# ==============================================================================
set -Eeuo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo "════════════════════════════════════════════════════════════════"
echo "  Cloudflare Tunnel Setup for Telegram Bot Webhook"
echo "════════════════════════════════════════════════════════════════"

# Check if cloudflared is installed
if ! command -v cloudflared >/dev/null 2>&1; then
  warn "cloudflared CLI not found in PATH."
  echo "To install cloudflared:"
  echo "  - Ubuntu/Debian: curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb"
  echo "  - macOS: brew install cloudflared"
  echo "  - Docker: docker run --rm cloudflare/cloudflared:latest --version"
  exit 1
fi

success "cloudflared CLI detected: $(cloudflared --version)"

PORT="${PORT:-3000}"
TUNNEL_NAME="${1:-xbet-bot-tunnel}"

echo ""
echo "Select tunnel mode:"
echo "  1) Quick Tunnel (Free ephemeral *.trycloudflare.com URL - testing/development)"
echo "  2) Permanent Named Tunnel (Custom domain on Cloudflare - production)"
read -r -p "Enter choice [1 or 2]: " choice

if [[ "$choice" == "1" ]]; then
  info "Starting Quick Tunnel pointing to http://localhost:${PORT}..."
  echo "Note down the generated https://*.trycloudflare.com URL and configure your webhook."
  cloudflared tunnel --url "http://localhost:${PORT}"
elif [[ "$choice" == "2" ]]; then
  read -r -p "Enter your Cloudflare hostname (e.g., bot.example.com): " HOSTNAME
  if [[ -z "$HOSTNAME" ]]; then
    die "Hostname cannot be empty."
  fi

  info "1. Creating named tunnel: ${TUNNEL_NAME}"
  cloudflared tunnel create "${TUNNEL_NAME}" || warn "Tunnel might already exist, continuing..."

  info "2. Routing DNS for ${HOSTNAME}..."
  cloudflared tunnel route dns "${TUNNEL_NAME}" "${HOSTNAME}"

  info "3. Generating configuration ~/.cloudflared/config.yml..."
  mkdir -p ~/.cloudflared
  cat > ~/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_NAME}
credentials-file: ~/.cloudflared/${TUNNEL_NAME}.json

ingress:
  - hostname: ${HOSTNAME}
    service: http://localhost:${PORT}
  - service: http_status:404
EOF

  success "Tunnel configured successfully!"
  echo ""
  echo "To run your tunnel in the background as a system service:"
  echo "  sudo cloudflared service install"
  echo "  sudo systemctl start cloudflared"
  echo ""
  echo "To register your Telegram webhook with this URL:"
  echo "  curl -F \"url=https://${HOSTNAME}/api/webhook\" \\"
  echo "       -F \"secret_token=<YOUR_WEBHOOK_SECRET>\" \\"
  echo "       https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook"
else
  die "Invalid choice."
fi
