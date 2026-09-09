#!/bin/bash
# ==============================================================================
# XBet Telegram Bot – Proot-Distro Ubuntu Automated Deployment Script
# Supports: Ubuntu 20.04, 22.04, 24.04 inside Termux proot-distro (ARM64 / x86_64)
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "========================================================="
echo "   🇱🇰 XBet Telegram Cashier Bot – Proot-Distro Deployer   "
echo "========================================================="
echo -e "${NC}"

# Check if running in proot-distro / Linux environment
if [ ! -f /etc/os-release ]; then
  echo -e "${RED}[ERROR] /etc/os-release not found. Please run this script inside proot-distro Ubuntu!${NC}"
  echo -e "${YELLOW}From Termux, first run:${NC}"
  echo "  proot-distro login ubuntu"
  exit 1
fi

echo -e "${BLUE}[1/7] Updating system packages...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget git ca-certificates gnupg sqlite3

echo -e "${BLUE}[2/7] Checking & Installing Node.js 22 LTS (with native SQLite)...${NC}"
NODE_VERSION=""
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
fi

if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 22 ]; then
  echo -e "${YELLOW}Installing Node.js 22 LTS via NodeSource...${NC}"
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
else
  echo -e "${GREEN}✓ Node.js $(node -v) is already installed.${NC}"
fi

echo -e "${GREEN}✓ Node.js $(node -v) and NPM $(npm -v) are ready.${NC}"

echo -e "${BLUE}[3/7] Installing PM2 Process Manager globally...${NC}"
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
else
  echo -e "${GREEN}✓ PM2 is already installed.${NC}"
fi

# Locate project directory (directory of this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}[4/7] Installing bot dependencies...${NC}"
npm install

echo -e "${BLUE}[5/7] Checking environment configuration (.env)...${NC}"
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
  cp .env.example .env
  
  echo ""
  echo -e "${CYAN}---------------------------------------------------------${NC}"
  echo -e "${BOLD}🔑 Quick Configuration Setup (Optional at this step):${NC}"
  echo -e "Press Enter to skip and edit manually later via: ${BOLD}nano .env${NC}"
  echo -e "${CYAN}---------------------------------------------------------${NC}"
  
  read -r -p "Enter Telegram BOT_TOKEN [leave blank to set later]: " INPUT_BOT_TOKEN
  if [ -n "$INPUT_BOT_TOKEN" ]; then
    sed -i "s|^BOT_TOKEN=.*|BOT_TOKEN=$INPUT_BOT_TOKEN|" .env
  fi

  read -r -p "Enter Admin Telegram IDs (e.g. 123456789,987654321) [leave blank to set later]: " INPUT_ADMIN_IDS
  if [ -n "$INPUT_ADMIN_IDS" ]; then
    sed -i "s|^ADMIN_IDS=.*|ADMIN_IDS=$INPUT_ADMIN_IDS|" .env
  fi

  # Ensure USE_POLLING=true and DB_PATH are set for Termux/proot
  if ! grep -q "USE_POLLING" .env; then
    echo "USE_POLLING=true" >> .env
  else
    sed -i "s|^USE_POLLING=.*|USE_POLLING=true|" .env
  fi

  if ! grep -q "DB_PATH" .env; then
    echo "DB_PATH=data/bot.db" >> .env
  fi

  echo -e "${GREEN}✓ .env file created with USE_POLLING=true and DB_PATH=data/bot.db.${NC}"
else
  echo -e "${GREEN}✓ Existing .env file found.${NC}"
fi

# Ensure data directory for SQLite database exists
mkdir -p data

echo -e "${BLUE}[6/7] Building production bundle...${NC}"
npm run build

echo -e "${BLUE}[7/7] Starting XBet Bot under PM2 24/7 supervisor...${NC}"
pm2 delete xbet-bot 2>/dev/null || true
pm2 start dist/server.cjs --name xbet-bot --time
pm2 save

echo ""
echo -e "${GREEN}${BOLD}=========================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 XBet Telegram Bot Deployed Successfully!${NC}"
echo -e "${GREEN}${BOLD}=========================================================${NC}"
echo ""
echo -e "${BOLD}Useful Management Commands:${NC}"
echo -e "  📊 View Bot Status:   ${CYAN}pm2 status${NC}"
echo -e "  📜 View Live Logs:    ${CYAN}pm2 logs xbet-bot${NC}"
echo -e "  🔄 Restart Bot:       ${CYAN}pm2 restart xbet-bot${NC}"
echo -e "  ⏹️  Stop Bot:          ${CYAN}pm2 stop xbet-bot${NC}"
echo -e "  ⚙️  Edit Configuration: ${CYAN}nano .env${NC} (run ${CYAN}pm2 restart xbet-bot${NC} after editing)"
echo ""
echo -e "${YELLOW}${BOLD}⚠️ IMPORTANT FOR ANDROID / TERMUX USERS:${NC}"
echo -e "To prevent Android from killing Termux in the background:"
echo -e " 1. In Termux, run: ${BOLD}termux-wake-lock${NC}"
echo -e " 2. Disable Battery Optimization / 'Battery Saver' for the Termux app in Android Settings."
echo -e " 3. Lock Termux in your Recent Apps screen."
echo ""
