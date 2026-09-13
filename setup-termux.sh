#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  📱 setup-termux.sh
#  Setup & deploy xbet-telegram-bot from Termux (Android)
#
#  This script:
#  1. Installs Node.js, git, and other dependencies in Termux
#  2. Clones the project (or uses existing checkout)
#  3. Sets up secrets interactively (NEVER stored in files)
#  4. Runs deploy.sh
#
#  Usage:
#    bash setup-termux.sh [project-dir]
#
#  If project-dir is omitted, clones from git or uses current dir.
# ═══════════════════════════════════════════════════════════════
set -Eeuo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Check Termux ────────────────────────────────────────────────
[[ -n "${TERMUX_VERSION:-}" || -d /data/data/com.termux ]] 2>/dev/null \
  || die "This script is designed for Termux. Run it on your phone."

PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"

# ── 1. Install packages ─────────────────────────────────────────
info "Installing required packages..."

# Update package list
pkg update -y 2>/dev/null || true

# Install nodejs (Termux has nodejs in the default repo)
if ! command -v node >/dev/null 2>&1; then
  pkg install -y nodejs git curl
else
  success "Node.js already installed: $(node -v)"
fi

# Verify
command -v node >/dev/null 2>&1 || die "Node.js installation failed."
command -v npm  >/dev/null 2>&1 || die "npm installation failed."
command -v git  >/dev/null 2>&1 || die "git installation failed."
command -v curl >/dev/null 2>&1 || die "curl installation failed."

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
(( NODE_MAJOR >= 18 )) || die "Node.js 18+ required; found $(node -v). Run 'pkg upgrade nodejs'."

success "All packages installed."

# ── 2. Verify project structure ─────────────────────────────────
info "Verifying project structure..."

for file in package.json wrangler.toml src/worker.ts deploy.sh validate-migrations.mjs; do
  [[ -f "$file" ]] || die "Required file missing: $file"
done

[[ -d migrations ]] || die "migrations/ directory missing."
[[ -d .git ]] || warn "Not a git repo — git hygiene checks will be skipped."

success "Project structure verified."

# ── 3. Install npm dependencies ─────────────────────────────────
info "Installing npm dependencies..."
npm ci 2>/dev/null || npm install
success "Dependencies installed."

# ── 4. Set secrets interactively ────────────────────────────────
# Secrets are set via wrangler and stored in Cloudflare — never in files.
info "Setting up secrets interactively..."
echo ""
echo "═══════════════════════════════════════════════════"
echo "  🔐 Secret Setup (values are sent to Cloudflare, NOT stored locally)"
echo "═══════════════════════════════════════════════════"
echo ""

WRANGLER_CMD="npx --no-install wrangler"

# Check if secrets are already set
SECRETS_ALREADY_SET=false
if $WRANGLER_CMD secret list 2>/dev/null | grep -q "BOT_TOKEN"; then
  warn "Some secrets are already set on Cloudflare."
  read -r -p "Re-set all secrets? [y/N] " reset_confirm
  case "$reset_confirm" in y|Y|yes|YES) ;; *) SECRETS_ALREADY_SET=true ;; esac
fi

if [[ "$SECRETS_ALREADY_SET" == "false" ]]; then
  # List of secrets to set
  declare -a SECRET_NAMES=(
    "BOT_TOKEN"
    "ADMIN_IDS"
    "ADMIN_CHANNEL_ID"
    "WEBHOOK_SECRET"
    "WHATSAPP_NUMBER"
    "EZCASH_NUMBER"
    "FRIMI_NUMBER"
    "MCASH_NUMBER"
    "R2_ACCESS_KEY_ID"
    "R2_SECRET_ACCESS_KEY"
  )

  for secret_name in "${SECRET_NAMES[@]}"; do
    echo ""
    read -r -p "Enter value for $secret_name (or 'skip' to skip): " secret_value
    case "$secret_value" in
      skip|SKIP|"") warn "Skipping $secret_name" ;;
      *)
        echo -n "$secret_value" | $WRANGLER_CMD secret put "$secret_name"
        success "$secret_name set."
        ;;
    esac
    # Clear the variable from memory
    secret_value=""
  done
fi

echo ""
success "Secret setup complete."

# ── 5. Deploy ───────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  🚀 Ready to deploy"
echo "═══════════════════════════════════════════════════"
echo ""

# Termux doesn't have curl with all features, so skip health check
# unless explicitly enabled.
export SKIP_HEALTHCHECK="${SKIP_HEALTHCHECK:-1}"

# Allow dirty working tree in Termux (often no git or uncommitted changes)
export ALLOW_DIRTY="${ALLOW_DIRTY:-1}"

info "Running deploy.sh..."
bash deploy.sh

echo ""
success "Deployment from Termux completed!"
