#!/usr/bin/env bash
# XBet Telegram Bot — production Cloudflare deployment
#
# Safety contract:
# - CI is the single production deployment path (see .github/workflows/ci-cd.yml).
# - Wrangler is pinned by package.json/package-lock.json; never use `latest`.
# - D1 migrations are validated before application and must be backward-compatible.
# - In CI, quality gates and migrations cannot be skipped.
# - Migrations are applied before Worker deployment so the deployed code never
#   depends on a schema that has not been applied. Breaking migrations are blocked.

set -Eeuo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info() { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
die() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

CI_MODE="${CI:-false}"
IS_CI=false
if [[ "$CI_MODE" == "true" || "$CI_MODE" == "1" ]]; then IS_CI=true; fi

command -v node >/dev/null 2>&1 || die "Node.js is required."
command -v npm >/dev/null 2>&1 || die "npm is required."
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
(( NODE_MAJOR >= 22 )) || die "Node.js 22+ is required; found $(node -v)."

for file in package.json package-lock.json wrangler.toml src/worker.ts scripts/validate-migrations.mjs; do
  [[ -f "$file" ]] || die "Required file missing: $file"
done

# Production CI must never bypass safety gates.
if $IS_CI; then
  [[ "${SKIP_LINT:-0}" != "1" ]] || die "SKIP_LINT is forbidden in CI."
  [[ "${SKIP_TESTS:-0}" != "1" ]] || die "SKIP_TESTS is forbidden in CI."
  [[ "${SKIP_MIGRATION:-0}" != "1" ]] || die "SKIP_MIGRATION is forbidden in CI."
  [[ "${SKIP_HEALTHCHECK:-0}" != "1" ]] || die "SKIP_HEALTHCHECK is forbidden in CI."
  [[ "${ALLOW_BREAKING_MIGRATIONS:-0}" != "1" ]] || die "ALLOW_BREAKING_MIGRATIONS is forbidden in CI."
  [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] || die "CLOUDFLARE_API_TOKEN is required in CI."
fi

# Verify that the checked-in lockfile and package manifest resolve the exact
# Wrangler version used by this deployment.
EXPECTED_WRANGLER="$(node -p 'require("./package.json").devDependencies.wrangler')"
[[ "$EXPECTED_WRANGLER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Wrangler must be pinned to an exact semver version; found: $EXPECTED_WRANGLER"
LOCK_WRANGLER="$(node -p 'require("./package-lock.json").packages["node_modules/wrangler"].version')"
[[ "$LOCK_WRANGLER" == "$EXPECTED_WRANGLER" ]] || die "package-lock.json Wrangler version ($LOCK_WRANGLER) does not match package.json ($EXPECTED_WRANGLER)."

[[ -d migrations ]] || die "migrations/ directory is required."
MIGRATION_COUNT="$(find migrations -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')"
(( MIGRATION_COUNT > 0 )) || die "No D1 migrations found."

info "Installing locked dependencies..."
npm ci

info "Validating D1 migrations..."
npm run validate:migrations

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git ls-files --error-unmatch .env >/dev/null 2>&1 && die ".env is tracked by Git."
  if ! $IS_CI && [[ "${ALLOW_DIRTY:-0}" != "1" && -n "$(git status --porcelain)" ]]; then
    die "Working tree is dirty. Commit/stash changes or use ALLOW_DIRTY=1 for a local deployment."
  fi
fi

info "Running TypeScript checks..."
npm run lint
info "Running tests..."
npm test

WRANGLER_CMD=(npx --no-install wrangler)
info "Verifying pinned Wrangler: $EXPECTED_WRANGLER"
ACTUAL_WRANGLER="$(${WRANGLER_CMD[@]} --version | head -n 1 | tr -d '\r')"
grep -q "${EXPECTED_WRANGLER}" <<< "$ACTUAL_WRANGLER" || die "Unexpected Wrangler version: $ACTUAL_WRANGLER"

info "Verifying Cloudflare authentication..."
"${WRANGLER_CMD[@]}" whoami >/dev/null
success "Cloudflare authentication verified."

DB_NAME="$(sed -n 's/^[[:space:]]*database_name[[:space:]]*=[[:space:]]*"\([^"]*\)"[[:space:]]*$/\1/p' wrangler.toml | head -n 1)"
[[ -n "$DB_NAME" ]] || die "Could not determine D1 database_name from wrangler.toml."

if ! $IS_CI; then
  echo "Production target: $DB_NAME"
  read -r -p "Apply pending D1 migrations and deploy? [y/N] " confirm
  case "$confirm" in y|Y|yes|YES) ;; *) warn "Deployment cancelled."; exit 0 ;; esac
fi

# Migration ordering: schema changes are applied first, but the validator blocks
# destructive operations so the currently deployed Worker remains compatible.
if [[ "${SKIP_MIGRATION:-0}" == "1" ]]; then
  warn "SKIP_MIGRATION=1 — migration step skipped (local/manual only)."
else
  info "Checking remote D1 migration state..."
  "${WRANGLER_CMD[@]}" d1 migrations list "$DB_NAME" --remote
  info "Applying pending D1 migrations..."
  "${WRANGLER_CMD[@]}" d1 migrations apply "$DB_NAME" --remote
  success "D1 migrations applied."
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
DEPLOY_LOG="$TMP_DIR/deploy.log"

info "Deploying Worker with pinned Wrangler..."
"${WRANGLER_CMD[@]}" deploy 2>&1 | tee "$DEPLOY_LOG"
success "Worker deployment completed."

WORKER_URL="${WORKER_URL:-$(grep -Eo 'https://[A-Za-z0-9._-]+\.workers\.dev' "$DEPLOY_LOG" | tail -n 1 || true)}"

if [[ "${SKIP_HEALTHCHECK:-0}" == "1" ]]; then
  warn "SKIP_HEALTHCHECK=1 — health check skipped (local/manual only)."
elif [[ -z "$WORKER_URL" ]]; then
  warn "Worker URL could not be detected; set WORKER_URL for a post-deploy health check."
elif ! command -v curl >/dev/null 2>&1; then
  die "curl is required for the production post-deployment health check."
else
  HEALTH_RESPONSE="$(curl --fail --silent --show-error --max-time 20 "${WORKER_URL%/}/health")" || die "Post-deployment health check failed."
  grep -qE '"status"[[:space:]]*:[[:space:]]*"ok"' <<< "$HEALTH_RESPONSE" || die "Health endpoint did not report status=ok."
  success "Post-deployment health check passed."
fi

echo "Deployment completed: Worker=xbet-telegram-bot D1=$DB_NAME migrations=$MIGRATION_COUNT"
