#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  🔄 deploy-proot.sh
#  Deploy xbet-telegram-bot from a proot environment (Termux)
#
#  proot provides a lightweight chroot-like environment in Termux
#  that supports full npm/wrangler functionality without root.
#
#  Usage:
#    bash deploy-proot.sh [project-dir]
#
#  Prerequisites:
#    - Termux with proot installed
#    - Or: pkg install proot
# ═══════════════════════════════════════════════════════════════
set -Eeuo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

PROJECT_DIR="${1:-$(pwd)}"
cd "$PROJECT_DIR"

# ── Check proot ─────────────────────────────────────────────────
if ! command -v proot >/dev/null 2>&1; then
  warn "proot not found. Installing..."
  pkg install -y proot 2>/dev/null || die "Failed to install proot. Run: pkg install proot"
fi
success "proot available."

# ── Verify project ──────────────────────────────────────────────
for file in package.json wrangler.toml src/worker.ts deploy.sh validate-migrations.mjs; do
  [[ -f "$file" ]] || die "Required file missing: $file"
done

# ── Create proot wrapper script ────────────────────────────────
PROOT_SCRIPT="$(mktemp)"
trap 'rm -f "$PROOT_SCRIPT"' EXIT

cat > "$PROOT_SCRIPT" << 'PROOT_EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$1"
cd "$PROJECT_DIR"

# Ensure npm cache works in proot
export npm_config_cache="/tmp/npm-cache"
export HOME="/tmp"

# Install dependencies if needed
if [[ ! -d node_modules ]]; then
  echo "[INFO] Installing dependencies..."
  npm ci 2>/dev/null || npm install
fi

# Set defaults for proot environment
export SKIP_HEALTHCHECK="${SKIP_HEALTHCHECK:-1}"
export ALLOW_DIRTY="${ALLOW_DIRTY:-1}"

# Run deploy
echo "[INFO] Running deploy.sh in proot..."
bash deploy.sh
PROOT_EOF

chmod +x "$PROOT_SCRIPT"

# ── Run inside proot ─────────────────────────────────────────────
info "Starting proot environment..."
info "Project: $PROJECT_DIR"

# proot options:
#   -r /        → root filesystem (Termux's)
#   -b /data    → bind /data (for Termux paths)
#   -b /proc    → bind /proc
#   -b /sys     → bind /sys
#   -b /dev     → bind /dev
#   --link2symlink → handle hard links
proot \
  --link2symlink \
  -b /data \
  -b /proc \
  -b /sys \
  -b /dev \
  -b "$PROJECT_DIR" \
  -w "$PROJECT_DIR" \
  /bin/bash "$PROOT_SCRIPT" "$PROJECT_DIR"

success "proot deployment completed."
