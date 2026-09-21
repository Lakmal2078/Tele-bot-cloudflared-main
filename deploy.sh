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

# Clean up npm environment variables that trigger EALLOWSCRIPTS in nested npm commands
unset npm_config_allow_scripts || true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

CI_MODE="${CI:-false}"
IS_CI=false
if [[ "$CI_MODE" == "true" || "$CI_MODE" == "1" ]]; then IS_CI=true; fi

# ── Wrangler environment (optional) ──────────────────────────────────────
# Set WRANGLER_ENV to deploy a specific environment defined in wrangler config
# (e.g. WRANGLER_ENV=staging).  Empty = top-level (default) environment.
WRANGLER_ENV="${WRANGLER_ENV:-}"

# ── Health-check configuration ───────────────────────────────────────────
# The path checked after deploy.  Override or set SKIP_HEALTHCHECK=1 to skip.
HEALTH_CHECK_PATH="${HEALTH_CHECK_PATH:-/health}"

# ── Prerequisite checks ──────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || die "Node.js is required."
command -v npm  >/dev/null 2>&1 || die "npm is required."
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
(( NODE_MAJOR >= 18 )) || die "Node.js 18+ is required; found $(node -v)."

# ── Locate wrangler config (toml | jsonc | json) ─────────────────────────
WRANGLER_CONFIG=""
for cfg in wrangler.toml wrangler.jsonc wrangler.json; do
  if [[ -f "$cfg" ]]; then WRANGLER_CONFIG="$cfg"; break; fi
done
[[ -n "$WRANGLER_CONFIG" ]] || die "No wrangler config found (wrangler.toml / wrangler.jsonc / wrangler.json)."

# ── Required-file checks ─────────────────────────────────────────────────
for file in package.json package-lock.json "$WRANGLER_CONFIG" src/worker.ts validate-migrations.mjs; do
  [[ -f "$file" ]] || die "Required file missing: $file"
done

# ── CI safety gates ─────────────────────────────────────────────────────
if $IS_CI; then
  [[ "${SKIP_LINT:-0}"               != "1" ]] || die "SKIP_LINT is forbidden in CI."
  [[ "${SKIP_TESTS:-0}"              != "1" ]] || die "SKIP_TESTS is forbidden in CI."
  [[ "${SKIP_MIGRATION:-0}"          != "1" ]] || die "SKIP_MIGRATION is forbidden in CI."
  [[ "${SKIP_HEALTHCHECK:-0}"        != "1" ]] || die "SKIP_HEALTHCHECK is forbidden in CI."
  [[ "${ALLOW_BREAKING_MIGRATIONS:-0}" != "1" ]] || die "ALLOW_BREAKING_MIGRATIONS is forbidden in CI."
  [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]        || die "CLOUDFLARE_API_TOKEN is required in CI."
fi

# ── Verify pinned Wrangler version ──────────────────────────────────────
EXPECTED_WRANGLER="$(node -p 'require("./package.json").devDependencies.wrangler')"
[[ "$EXPECTED_WRANGLER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
  || die "Wrangler must be pinned to an exact semver version; found: $EXPECTED_WRANGLER"
LOCK_WRANGLER="$(node -p 'require("./package-lock.json").packages["node_modules/wrangler"].version')"
[[ "$LOCK_WRANGLER" == "$EXPECTED_WRANGLER" ]] \
  || die "package-lock.json Wrangler version ($LOCK_WRANGLER) does not match package.json ($EXPECTED_WRANGLER)."

# ── Verify npm scripts exist before running them ────────────────────────
has_npm_script() {
  node -e "
    const s = require('./package.json').scripts || {};
    process.exit(s['$1'] ? 0 : 1);
  " 2>/dev/null
}

# ── Migrations directory ────────────────────────────────────────────────
[[ -d migrations ]] || die "migrations/ directory is required."
MIGRATION_COUNT="$(find migrations -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')"
(( MIGRATION_COUNT > 0 )) || die "No D1 migrations found."

# ── Install dependencies ────────────────────────────────────────────────
if $IS_CI || [[ ! -d node_modules ]]; then
  info "Installing locked dependencies..."
  npm ci
else
  info "Dependencies already present in node_modules, skipping reinstall."
fi

# ── Validate D1 migrations ─────────────────────────────────────────────
info "Validating D1 migrations..."
if $IS_CI; then
  # In CI, breaking migrations are always blocked — don't forward the flag.
  npm run validate:migrations
else
  # Locally, ALLOW_BREAKING_MIGRATIONS=1 can be forwarded to the validator.
  if [[ "${ALLOW_BREAKING_MIGRATIONS:-0}" == "1" ]]; then
    ALLOW_BREAKING_MIGRATIONS=1 npm run validate:migrations
  else
    npm run validate:migrations
  fi
fi

# ── Git hygiene ─────────────────────────────────────────────────────────
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git ls-files --error-unmatch .env >/dev/null 2>&1 && die ".env is tracked by Git — remove it from version control."
  if ! $IS_CI && [[ "${ALLOW_DIRTY:-0}" != "1" && -n "$(git status --porcelain)" ]]; then
    die "Working tree is dirty. Commit/stash changes or use ALLOW_DIRTY=1 for a local deployment."
  fi
fi

# ── Lint ───────────────────────────────────────────────────────────────
if [[ "${SKIP_LINT:-0}" == "1" ]]; then
  warn "SKIP_LINT=1 — lint step skipped (local/manual only)."
elif has_npm_script lint; then
  info "Running lint..."
  npm run lint
else
  warn "No 'lint' script in package.json — skipping."
fi

# ── Tests ──────────────────────────────────────────────────────────────
if [[ "${SKIP_TESTS:-0}" == "1" ]]; then
  warn "SKIP_TESTS=1 — test step skipped (local/manual only)."
elif has_npm_script test; then
  info "Running tests..."
  npm test
else
  warn "No 'test' script in package.json — skipping."
fi

# ── Wrangler setup ──────────────────────────────────────────────────────
# Base command without --env (for global commands like --version, whoami, r2).
WRANGLER_BASE=(npx --no-install wrangler)
# Deploy/d1 command with optional --env flag.
WRANGLER_DEPLOY=("${WRANGLER_BASE[@]}")
if [[ -n "$WRANGLER_ENV" ]]; then
  WRANGLER_DEPLOY+=(--env "$WRANGLER_ENV")
  info "Using Wrangler environment: $WRANGLER_ENV"
fi

info "Verifying pinned Wrangler: $EXPECTED_WRANGLER"
ACTUAL_WRANGLER="$("${WRANGLER_BASE[@]}" --version | head -n 1 | tr -d '\r')"
grep -q "${EXPECTED_WRANGLER}" <<< "$ACTUAL_WRANGLER" \
  || die "Unexpected Wrangler version: $ACTUAL_WRANGLER"

info "Verifying Cloudflare authentication..."
"${WRANGLER_BASE[@]}" whoami >/dev/null
success "Cloudflare authentication verified."

# ── Extract D1 database name from wrangler config ──────────────────────
# `wrangler d1 migrations` commands require the database NAME, not the ID.
# We extract database_name; if only database_id is present, we look up the
# name via `wrangler d1 list`.
DB_NAME=""
DB_ID=""

if [[ "$WRANGLER_CONFIG" == *.toml ]]; then
  DB_NAME="$(sed -n 's/^[[:space:]]*database_name[[:space:]]*=[[:space:]]*"\([^"]*\)"[[:space:]]*$/\1/p' "$WRANGLER_CONFIG" | head -n 1)"
  DB_ID="$(sed -n 's/^[[:space:]]*database_id[[:space:]]*=[[:space:]]*"\([^"]*\)"[[:space:]]*$/\1/p' "$WRANGLER_CONFIG" | head -n 1)"
elif [[ "$WRANGLER_CONFIG" == *.jsonc || "$WRANGLER_CONFIG" == *.json ]]; then
  # For JSON/JSONC, use node to parse (handles comments in jsonc)
  read -r DB_NAME DB_ID <<< "$(node -e "
    const fs = require('fs');
    const raw = fs.readFileSync(process.argv[1], 'utf8');
    const clean = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const cfg = JSON.parse(clean);
    const dbs = cfg.d1_databases || [];
    const db = dbs[0] || {};
    process.stdout.write((db.database_name || '') + ' ' + (db.database_id || ''));
  " "$WRANGLER_CONFIG" 2>/dev/null || echo "")"
fi

# If we have a name, use it directly. If only an ID, look up the name.
if [[ -n "$DB_NAME" ]]; then
  DB_IDENTIFIER="$DB_NAME"
elif [[ -n "$DB_ID" ]]; then
  info "No database_name in config; looking up name from D1 list (ID: $DB_ID)..."
  DB_IDENTIFIER="$("${WRANGLER_BASE[@]}" d1 list --json 2>/dev/null \
    | node -e "
      let data = '';
      process.stdin.on('data', c => data += c);
      process.stdin.on('end', () => {
        try {
          const dbs = JSON.parse(data);
          const match = dbs.find(d => d.uuid === process.argv[1]);
          if (match) process.stdout.write(match.name);
        } catch (e) {}
      });
    " "$DB_ID" 2>/dev/null || true)"
  [[ -n "$DB_IDENTIFIER" ]] \
    || die "Could not find D1 database name for ID '$DB_ID'. Add database_name to your wrangler config."
  warn "Using D1 database name '$DB_IDENTIFIER' (resolved from ID '$DB_ID')."
else
  die "Could not determine D1 database_name or database_id from $WRANGLER_CONFIG."
fi

info "D1 database: $DB_IDENTIFIER"

# ── R2 bucket verification (optional) ──────────────────────────────────
R2_BUCKET_NAME="${R2_BUCKET_NAME:-}"
if [[ -n "$R2_BUCKET_NAME" ]]; then
  info "Verifying R2 bucket: $R2_BUCKET_NAME"
  if "${WRANGLER_BASE[@]}" r2 bucket list 2>/dev/null | grep -q "$R2_BUCKET_NAME"; then
    success "R2 bucket '$R2_BUCKET_NAME' exists."
  else
    warn "R2 bucket '$R2_BUCKET_NAME' not found — create it before deploying."
  fi
fi

# ── Interactive confirmation (local only) ──────────────────────────────
if ! $IS_CI; then
  echo "Production target: D1=$DB_IDENTIFIER  migrations=$MIGRATION_COUNT"
  read -r -p "Apply pending D1 migrations and deploy? [y/N] " confirm
  case "$confirm" in y|Y|yes|YES) ;; *) warn "Deployment cancelled."; exit 0 ;; esac
fi

# ── Apply D1 migrations ────────────────────────────────────────────────
# Migrations are applied before Worker deployment so the deployed code never
# depends on a schema that has not been applied. The validator blocks
# destructive operations so the currently deployed Worker remains compatible.
if [[ "${SKIP_MIGRATION:-0}" == "1" ]]; then
  warn "SKIP_MIGRATION=1 — migration step skipped (local/manual only)."
else
  info "Checking remote D1 migration state..."
  "${WRANGLER_DEPLOY[@]}" d1 migrations list "$DB_IDENTIFIER" --remote
  info "Applying pending D1 migrations..."
  "${WRANGLER_DEPLOY[@]}" d1 migrations apply "$DB_IDENTIFIER" --remote
  success "D1 migrations applied."
fi

# ── Deploy Worker ──────────────────────────────────────────────────────
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
DEPLOY_LOG="$TMP_DIR/deploy.log"

info "Deploying Worker with pinned Wrangler ($EXPECTED_WRANGLER)..."
"${WRANGLER_DEPLOY[@]}" deploy 2>&1 | tee "$DEPLOY_LOG"
success "Worker deployment completed."

# ── Extract deployed URL ───────────────────────────────────────────────
# Try workers.dev URL first, then custom domain from deploy log.
WORKER_URL="${WORKER_URL:-}"
if [[ -z "$WORKER_URL" ]]; then
  WORKER_URL="$(grep -Eo 'https://[A-Za-z0-9._-]+\.workers\.dev' "$DEPLOY_LOG" | tail -n 1 || true)"
fi
if [[ -z "$WORKER_URL" ]]; then
  # Try to find a custom domain route in the output
  WORKER_URL="$(grep -Eo 'https://[A-Za-z0-9._-]+\.[A-Za-z]{2,}[/A-Za-z0-9._-]*' "$DEPLOY_LOG" | grep -v 'workers\.dev' | head -n 1 || true)"
fi

# ── Post-deployment health check ───────────────────────────────────────
if [[ "${SKIP_HEALTHCHECK:-0}" == "1" ]]; then
  warn "SKIP_HEALTHCHECK=1 — health check skipped (local/manual only)."
elif [[ -z "$WORKER_URL" ]]; then
  warn "Worker URL could not be detected; set WORKER_URL for a post-deploy health check."
elif ! command -v curl >/dev/null 2>&1; then
  warn "curl not available — skipping health check."
else
  HEALTH_URL="${WORKER_URL%/}${HEALTH_CHECK_PATH}"
  info "Health check: $HEALTH_URL"
  HEALTH_RESPONSE_FILE="$TMP_DIR/health.json"
  HTTP_CODE="$(curl --silent --show-error --max-time 20 \
    --output "$HEALTH_RESPONSE_FILE" --write-out '%{http_code}' \
    "$HEALTH_URL" 2>"$TMP_DIR/health.err")" && CURL_EXIT=0 || CURL_EXIT=$?

  if [[ "$CURL_EXIT" -ne 0 ]]; then
    CURL_ERR="$(cat "$TMP_DIR/health.err" 2>/dev/null || echo 'unknown error')"
    if $IS_CI; then
      die "Post-deployment health check failed (curl exit $CURL_EXIT): $CURL_ERR"
    else
      warn "Health check failed (curl exit $CURL_EXIT): $CURL_ERR"
      warn "Set SKIP_HEALTHCHECK=1 if your Worker has no health endpoint."
    fi
  elif [[ "$HTTP_CODE" != "200" ]]; then
    if $IS_CI; then
      die "Post-deployment health check failed (HTTP $HTTP_CODE)."
    else
      warn "Health check returned HTTP $HTTP_CODE (expected 200)."
      warn "Set SKIP_HEALTHCHECK=1 if your Worker has no health endpoint."
    fi
  else
    HEALTH_RESPONSE="$(cat "$HEALTH_RESPONSE_FILE" 2>/dev/null || echo '')"
    # Require both HTTP 200 and configuration.healthy === true (and status=ok).
    if [[ -n "$HEALTH_RESPONSE" ]]; then
      if ! grep -qE '"status"[[:space:]]*:[[:space:]]*"ok"' <<< "$HEALTH_RESPONSE"; then
        if $IS_CI; then
          die "Health endpoint did not report status=ok. Response: $HEALTH_RESPONSE"
        else
          warn "Health endpoint did not report status=ok. Response: $HEALTH_RESPONSE"
        fi
      elif ! grep -qE '"healthy"[[:space:]]*:[[:space:]]*true' <<< "$HEALTH_RESPONSE"; then
        if $IS_CI; then
          die "Health endpoint reported configuration.healthy=false. Response: $HEALTH_RESPONSE"
        else
          warn "Health endpoint reported configuration.healthy=false. Response: $HEALTH_RESPONSE"
        fi
      else
        success "Post-deployment health check passed."
      fi
    else
      success "Post-deployment health check passed (empty body, HTTP 200)."
    fi
  fi
fi

# ── Auto-register Telegram webhook (authenticated; requires ADMIN_API_SECRET) ─
# Public unauthenticated setWebhook has been removed. Registration must use
# an admin credential via header. Skip automatically when secret is unavailable.
if [[ -n "$WORKER_URL" ]] && command -v curl >/dev/null 2>&1; then
  if [[ -n "${ADMIN_API_SECRET:-}" ]]; then
    info "Synchronizing Telegram webhook (authenticated)..."
    WEBHOOK_RES="$(curl --silent --show-error --max-time 15 \
      -X POST \
      -H "X-Admin-Secret: ${ADMIN_API_SECRET}" \
      "${WORKER_URL%/}/api/setup-webhook?action=set" 2>/dev/null || true)"
    if grep -q '"ok":true' <<< "$WEBHOOK_RES"; then
      success "Telegram webhook registered: $WORKER_URL"
    else
      warn "Webhook auto-registration response: $WEBHOOK_RES"
    fi
  else
    warn "ADMIN_API_SECRET not set in environment — skipping automatic webhook registration."
    warn "Register manually with an authenticated POST to /api/setup-webhook."
  fi
fi

# ── Summary ────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
success "Deployment completed:"
echo "  Worker:      xbet-telegram-bot"
echo "  D1 database: $DB_IDENTIFIER"
echo "  Migrations:  $MIGRATION_COUNT files"
if [[ -n "$WORKER_URL" ]]; then
  echo "  URL:         $WORKER_URL"
fi
if [[ -n "$WRANGLER_ENV" ]]; then
  echo "  Environment: $WRANGLER_ENV"
fi
echo "  Wrangler:    $EXPECTED_WRANGLER"
echo "══════════════════════════════════════════════════════════════"

