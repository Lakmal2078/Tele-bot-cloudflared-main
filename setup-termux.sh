#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# XBet Telegram Bot – One-Click Termux Setup Script (Run outside proot-distro)
# ==============================================================================

set -e

# Acquire wake lock to keep CPU active
termux-wake-lock 2>/dev/null || true

echo "========================================================="
echo "   🇱🇰 Preparing Termux environment for XBet Bot...       "
echo "========================================================="

echo "[1/4] Updating Termux packages..."
pkg update -y
pkg install -y proot-distro git curl tar

echo "[2/4] Checking proot-distro Ubuntu..."
if ! proot-distro list | grep -q "ubuntu.*installed"; then
  echo "Installing Ubuntu inside proot-distro..."
  proot-distro install ubuntu
else
  echo "✓ Ubuntu is already installed in proot-distro."
fi

# Locate the directory where this script is located
CURRENT_DIR="$(pwd)"

echo "[3/4] Ready to enter Ubuntu."
echo "========================================================="
echo "Now log in to Ubuntu by running:"
echo "    proot-distro login ubuntu"
echo ""
echo "Then inside Ubuntu, navigate to this folder and run:"
echo "    bash deploy-proot.sh"
echo "========================================================="
