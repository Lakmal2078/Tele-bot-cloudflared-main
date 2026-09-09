#!/bin/bash
# ==============================================================================
# XBet Telegram Bot – Cloudflare Worker Production Deployment Script
# Steps:
#   1. Check environment and prerequisites (Node.js, npm, wrangler)
#   2. Install project dependencies
#   3. Execute D1 database migrations (schema.sql)
#   4. Execute production deployment via 'wrangler deploy'
# ==============================================================================

set -e

# Terminal Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "========================================================="
echo "   🇱🇰 XBet Cloudflare Worker Production Deployment       "
echo "========================================================="
echo -e "${NC}"

# ------------------------------------------------------------------------------
# 1. Verify Prerequisites
# ------------------------------------------------------------------------------
echo -e "${BLUE}[1/4] Checking environment & tools...${NC}"

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] Node.js is not installed. Please install Node.js 18+ to proceed.${NC}"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] npm is not installed.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) and npm $(npm -v) found.${NC}"

# Check for wrangler (either local in node_modules or global)
WRANGLER_CMD="npx wrangler"
if [ ! -f "wrangler.toml" ]; then
  echo -e "${RED}[ERROR] wrangler.toml configuration file not found in $(pwd)!${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 2. Install Dependencies
# ------------------------------------------------------------------------------
echo -e "${BLUE}[2/4] Installing project dependencies...${NC}"
if [ -f "package-lock.json" ]; then
  npm ci || npm install
else
  npm install
fi

echo -e "${GREEN}✓ Dependencies installed successfully.${NC}"

# ------------------------------------------------------------------------------
# 3. Cloudflare D1 Database Migrations
# ------------------------------------------------------------------------------
echo -e "${BLUE}[3/4] Running Cloudflare D1 database migrations...${NC}"

DB_BINDING="DB"
DB_NAME="xbet-bot-db"

# Extract database name from wrangler.toml if available
if grep -q "database_name" wrangler.toml 2>/dev/null; then
  PARSED_DB_NAME=$(grep "database_name" wrangler.toml | head -n 1 | sed -E 's/.*database_name[[:space:]]*=[[:space:]]*["'\'']([^"'\'']+)["'\''].*/\1/')
  if [ -n "$PARSED_DB_NAME" ]; then
    DB_NAME="$PARSED_DB_NAME"
  fi
fi

if [ -f "schema.sql" ]; then
  echo -e "Executing schema migration from ${BOLD}schema.sql${NC} on D1 database: ${CYAN}${DB_NAME}${NC} (remote)..."
  if $WRANGLER_CMD d1 execute "$DB_NAME" --remote --file=schema.sql --yes; then
    echo -e "${GREEN}✓ D1 database migration completed successfully.${NC}"
  else
    echo -e "${YELLOW}⚠️ Notice: D1 remote execution failed or was skipped.${NC}"
    echo -e "${YELLOW}If you haven't created the remote database yet, run:${NC}"
    echo -e "  ${CYAN}npx wrangler d1 create ${DB_NAME}${NC}"
    echo -e "and verify your database_id in ${BOLD}wrangler.toml${NC}."
    echo -e "Continuing to deployment..."
  fi
else
  echo -e "${YELLOW}[SKIP] schema.sql not found. Skipping D1 migration.${NC}"
fi

# ------------------------------------------------------------------------------
# 4. Production Deployment
# ------------------------------------------------------------------------------
echo -e "${BLUE}[4/4] Executing 'wrangler deploy' for production...${NC}"

if $WRANGLER_CMD deploy; then
  echo ""
  echo -e "${GREEN}${BOLD}=========================================================${NC}"
  echo -e "${GREEN}${BOLD}🎉 Cloudflare Worker Deployed Successfully to Production!${NC}"
  echo -e "${GREEN}${BOLD}=========================================================${NC}"
  echo ""
  echo -e "${BOLD}Next Steps:${NC}"
  echo -e " 1. Ensure required secrets are set in Cloudflare:"
  echo -e "      ${CYAN}npx wrangler secret put BOT_TOKEN${NC}"
  echo -e "      ${CYAN}npx wrangler secret put ADMIN_IDS${NC}"
  echo -e " 2. Set your Telegram Bot Webhook to your worker URL:"
  echo -e "      ${CYAN}curl -F \"url=https://<your-worker>.<subdomain>.workers.dev/\" https://api.telegram.org/bot<TOKEN>/setWebhook${NC}"
  echo ""
else
  echo ""
  echo -e "${RED}${BOLD}=========================================================${NC}"
  echo -e "${RED}${BOLD}❌ Deployment failed during 'wrangler deploy'.${NC}"
  echo -e "${RED}${BOLD}=========================================================${NC}"
  echo -e "${YELLOW}Please check Cloudflare authentication or run:${NC}"
  echo -e "  ${CYAN}npx wrangler login${NC}"
  exit 1
fi
