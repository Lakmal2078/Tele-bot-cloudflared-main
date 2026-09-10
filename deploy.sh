#!/usr/bin/env bash
# ==============================================================================
# XBet Telegram Bot — Cloudflare Worker Production Deployment
# ==============================================================================
# Production deployment pipeline:
#   1. Resolve project root and validate prerequisites
#   2. Validate repository/configuration
#   3. Install locked dependencies
#   4. Run TypeScript + unit-test quality gates
#   5. Verify Cloudflare authentication and D1 configuration
#   6. Apply idempotent D1 schema
#   7. Deploy the Worker
#   8. Run a post-deployment /health check
#
# Notes:
#   - This script deploys the Cloudflare Worker defined by wrangler.toml.
#   - The separate deploy-proot.sh remains responsible for Termux/proot + PM2.
#   - Cloudflare secrets are NEVER read or printed by this script.
#
# Usage:
#   bash deploy.sh
#   npm run deploy:cf
#
# Optional environment variables:
#   ALLOW_DIRTY=1       Allow deployment with uncommitted local changes.
#   SKIP_TESTS=1        Skip the test suite (not recommended for production).
#   SKIP_LINT=1         Skip TypeScript type-checking (not recommended).
#   SKIP_MIGRATION=1    Skip D1 schema execution (not recommended).
#   SKIP_HEALTHCHECK=1  Skip the post-deployment health check.
#   WORKER_URL=...      Explicit URL for the post-deployment health check.
#   CI=true              Non-interactive mode; skips the confirmation prompt.
# ==============================================================================

set -Eeuo pipefail

# ------------------------------------------------------------------------------
# Terminal helpers
# ------------------------------------------------------------------------------
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }
step()    { echo -e "\n${CYAN}${BOLD}==> $*${NC}"; }

START_TIME=$(date +%s)
TMP_DIR=""
DEPLOY_OUTPUT=""

cleanup() {
  if [[ -n "${TMP_DIR}" && -d "${TMP_DIR}" ]]; then
    rm -rf "${TMP_DIR}"
  fi
}
trap cleanup EXIT

on_error() {
  local exit_code=$?
  local line_no=${1:-unknown}
  error "Deployment stopped at line ${line_no} (exit code ${exit_code})."
  if [[ -n "${DEPLOY_OUTPUT}" && -f "${DEPLOY_OUTPUT}" ]]; then
    warn "Last Wrangler output:"
    tail -n 30 "${DEPLOY_OUTPUT}" >&2 || true
  fi
  exit "${exit_code}"
}
trap 'on_error $LINENO' ERR

# ------------------------------------------------------------------------------
# 1. Resolve project root
# ------------------------------------------------------------------------------
step "1/8 — Resolving project root and prerequisites"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

success "Project root: ${SCRIPT_DIR}"

command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install Node.js 18+ before deploying."
command -v npm  >/dev/null 2>&1 || die "npm is not installed. Install npm before deploying."
command -v git  >/dev/null 2>&1 || warn "git is not installed; repository-state checks will be skipped."

NODE_VERSION="$(node -v)"
NPM_VERSION="$(npm -v)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"

if (( NODE_MAJOR < 18 )); then
  die "Node.js ${NODE_VERSION} is too old. Node.js 18+ is required."
fi

success "Node.js ${NODE_VERSION}"
success "npm ${NPM_VERSION}"

# ------------------------------------------------------------------------------
# 2. Validate repository and configuration
# ------------------------------------------------------------------------------
step "2/8 — Validating repository and Cloudflare configuration"

REQUIRED_FILES=(
  "package.json"
  "package-lock.json"
  "wrangler.toml"
  "schema.sql"
  "src/worker.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  [[ -f "${file}" ]] || die "Required file not found: ${file}"
done

success "Required project files are present."

# Ensure the expected Cloudflare Worker entrypoint is configured.
if ! grep -Eq '^main[[:space:]]*=[[:space:]]*"src/worker\.ts"[[:space:]]*$' wrangler.toml; then
  die 'wrangler.toml must use main = "src/worker.ts" for this deployment script.'
fi

if ! grep -Eq '^name[[:space:]]*=' wrangler.toml; then
  die "wrangler.toml does not define a Worker name."
fi

if ! grep -Eq '^\[\[d1_databases\]\]' wrangler.toml; then
  die "wrangler.toml does not define a D1 database binding."
fi

DB_NAME="$(sed -n 's/^[[:space:]]*database_name[[:space:]]*=[[:space:]]*"\([^"]*\)"[[:space:]]*$/\1/p' wrangler.toml | head -n 1)"
DB_ID="$(sed -n 's/^[[:space:]]*database_id[[:space:]]*=[[:space:]]*"\([^"]*\)"[[:space:]]*$/\1/p' wrangler.toml | head -n 1)"
DB_BINDING="$(sed -n 's/^[[:space:]]*binding[[:space:]]*=[[:space:]]*"\([^"]*\)"[[:space:]]*$/\1/p' wrangler.toml | head -n 1)"

[[ -n "${DB_NAME}" ]] || die "Could not read database_name from wrangler.toml."
[[ -n "${DB_ID}" ]] || die "Could not read database_id from wrangler.toml."
[[ -n "${DB_BINDING}" ]] || die "Could not read D1 binding from wrangler.toml."

success "D1 database: ${DB_NAME}"
success "D1 binding: ${DB_BINDING}"

if [[ -f ".env" ]]; then
  warn ".env exists locally. Its values will not be read or uploaded by this script."
fi

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    die ".env is tracked by git. Remove it from version control before production deployment."
  fi

  if [[ "${ALLOW_DIRTY:-0}" != "1" ]]; then
    if [[ -n "$(git status --porcelain)" ]]; then
      die "Working tree has uncommitted changes. Commit/stash them first, or use ALLOW_DIRTY=1."
    fi
  else
    warn "ALLOW_DIRTY=1 — deploying despite local uncommitted changes."
  fi
fi

# ------------------------------------------------------------------------------
# 3. Install exact dependencies
# ------------------------------------------------------------------------------
step "3/8 — Installing locked dependencies"

if [[ -f "package-lock.json" ]]; then
  npm ci
else
  die "package-lock.json is required for a reproducible production deployment."
fi

success "Dependencies installed with npm ci."

WRANGLER_CMD=(npx --no-install wrangler)

# ------------------------------------------------------------------------------
# 4. Quality gates
# ------------------------------------------------------------------------------
step "4/8 — Running production quality gates"

if [[ "${SKIP_LINT:-0}" == "1" ]]; then
  warn "SKIP_LINT=1 — skipping TypeScript type-check."
else
  info "Running npm run lint..."
  npm run lint
  success "TypeScript type-check passed."
fi

if [[ "${SKIP_TESTS:-0}" == "1" ]]; then
  warn "SKIP_TESTS=1 — skipping tests."
else
  info "Running npm test..."
  npm test
  success "Test suite passed."
fi

# Cloudflare Wrangler bundles src/worker.ts directly. The separate npm build
# targets src/index.ts for the Node/PM2 deployment and is intentionally omitted.

# ------------------------------------------------------------------------------
# 5. Cloudflare authentication
# ------------------------------------------------------------------------------
step "5/8 — Verifying Cloudflare authentication"

info "Checking Wrangler authentication..."
"${WRANGLER_CMD[@]}" whoami >/dev/null
success "Wrangler authentication is valid."

if [[ "${CI:-false}" != "true" && "${CI:-0}" != "1" ]]; then
  echo ""
  echo -e "${YELLOW}${BOLD}Production deployment target:${NC} ${CYAN}${DB_NAME}${NC}"
  echo -e "${YELLOW}This will update the remote D1 database and deploy the Worker.${NC}"
  read -r -p "Continue with production deployment? [y/N] " CONFIRM
  case "${CONFIRM}" in
    y|Y|yes|YES) success "Production deployment confirmed." ;;
    *) warn "Deployment cancelled by user."; exit 0 ;;
  esac
else
  info "CI/non-interactive mode detected; skipping confirmation prompt."
fi

# ------------------------------------------------------------------------------
# 6. D1 migration
# ------------------------------------------------------------------------------
step "6/8 — Applying D1 database schema"

if [[ "${SKIP_MIGRATION:-0}" == "1" ]]; then
  warn "SKIP_MIGRATION=1 — skipping remote D1 schema execution."
else
  info "Executing idempotent schema.sql against remote D1 database: ${DB_NAME}"
  "${WRANGLER_CMD[@]}" d1 execute "${DB_NAME}" --remote --file=schema.sql --yes
  success "D1 schema applied successfully."
fi

# ------------------------------------------------------------------------------
# 7. Cloudflare Worker deployment
# ------------------------------------------------------------------------------
step "7/8 — Deploying Cloudflare Worker"

TMP_DIR="$(mktemp -d)"
DEPLOY_OUTPUT="${TMP_DIR}/wrangler-deploy.log"

info "Running: npx wrangler deploy"
"${WRANGLER_CMD[@]}" deploy 2>&1 | tee "${DEPLOY_OUTPUT}"

success "Cloudflare Worker deployment completed."

if [[ -z "${WORKER_URL:-}" ]]; then
  WORKER_URL="$(grep -Eo 'https://[A-Za-z0-9._-]+\.workers\.dev' "${DEPLOY_OUTPUT}" | tail -n 1 || true)"
fi

# ------------------------------------------------------------------------------
# 8. Post-deployment health check
# ------------------------------------------------------------------------------
step "8/8 — Running post-deployment health check"

if [[ "${SKIP_HEALTHCHECK:-0}" == "1" ]]; then
  warn "SKIP_HEALTHCHECK=1 — skipping /health verification."
elif [[ -z "${WORKER_URL:-}" ]]; then
  warn "Could not determine the deployed Worker URL automatically."
  warn "Set WORKER_URL manually to enable the health check, for example:"
  echo "  WORKER_URL=https://your-worker.workers.dev bash deploy.sh"
elif ! command -v curl >/dev/null 2>&1; then
  warn "curl is not installed; skipping health check."
else
  HEALTH_URL="${WORKER_URL%/}/health"
  info "Checking ${HEALTH_URL}"
  HEALTH_RESPONSE="$(curl --fail --silent --show-error --max-time 20 "${HEALTH_URL}")" || die "Post-deployment health check failed: ${HEALTH_URL}"

  if grep -q '"status":"ok"' <<<"${HEALTH_RESPONSE}" || grep -q '"status": "ok"' <<<"${HEALTH_RESPONSE}"; then
    success "Worker health check passed."
  else
    die "Health endpoint responded, but status was not OK: ${HEALTH_RESPONSE}"
  fi
fi

# ------------------------------------------------------------------------------
# Final report
# ------------------------------------------------------------------------------
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}${BOLD}===============================================================${NC}"
echo -e "${GREEN}${BOLD}Production deployment completed successfully${NC}"
echo -e "${GREEN}${BOLD}===============================================================${NC}"
echo ""
echo -e "${BOLD}Deployment summary:${NC}"
echo -e "  Worker      : ${CYAN}xbet-telegram-bot${NC}"
echo -e "  D1 database : ${CYAN}${DB_NAME}${NC}"
echo -e "  Duration    : ${CYAN}${DURATION}s${NC}"

if [[ -n "${WORKER_URL:-}" ]]; then
  echo -e "  Worker URL  : ${CYAN}${WORKER_URL}${NC}"
fi

echo ""
echo -e "${BOLD}Required production secrets (managed separately):${NC}"
echo "  npx wrangler secret put BOT_TOKEN"
echo "  npx wrangler secret put WEBHOOK_SECRET"
echo "  npx wrangler secret put ADMIN_CHANNEL_ID"
echo "  npx wrangler secret put ADMIN_IDS"
echo "  npx wrangler secret put BANK_DETAILS"
echo "  npx wrangler secret put WHATSAPP_NUMBER"
echo "  npx wrangler secret put EZCASH_NUMBER"
echo "  npx wrangler secret put FRIMI_NUMBER"
echo "  npx wrangler secret put MCASH_NUMBER"
echo "  npx wrangler secret put R2_ACCOUNT_ID"
echo "  npx wrangler secret put R2_PUBLIC_DOMAIN"
echo ""
echo -e "${BOLD}Telegram webhook:${NC} configure it after confirming BOT_TOKEN and WEBHOOK_SECRET."
echo -e "${YELLOW}Do not put any secret values into wrangler.toml, deploy.sh, or Git.${NC}"
echo ""
