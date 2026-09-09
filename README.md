# 🇱🇰 XBet Telegram Cashier & Management Bot

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-0088cc?logo=telegram)](https://core.telegram.org/bots/api)

**A powerful, production-ready Telegram bot for managing cash deposits, withdrawals, and player analytics for 1XBet gaming operations in Sri Lanka.**

Streamlined financial workflows with **multi-language support** (Sinhala 🇱🇰, English 🇬🇧, Tamil 🇮🇳), **4 payment gateways**, **real-time admin analytics**, **Cloudflare R2 receipt storage**, and **24/7 automated operations**.

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
  - [Termux/Android Setup](#android-termux-setup)
  - [Linux VPS Setup](#linux-vps-setup)
  - [Cloudflare Workers Setup](#cloudflare-workers-setup)
- [Configuration](#️-configuration)
- [Commands](#-commands)
- [Process Management](#-process-management)
- [Troubleshooting](#-troubleshooting-faq)
- [Architecture](#-architecture)
- [Security Considerations](#-security-considerations)
- [Contributing](#-contributing)

---

## 🌟 Features

### 💳 Multi-Channel Payment Processing
- **🏦 Bank Transfer** – Commercial Bank, Sampath, BOC, HNB, etc.
- **📱 eZ Cash** (Dialog Mobile)
- **📲 mCash** (Mobitel Mobile)
- **💳 FriMi** (Nations Trust Bank)

### 💰 Complete Transaction Workflows

**Deposit Flow:**
1. User selects payment method
2. Submits transaction receipt (screenshot)
3. Enters player ID & amount (with min/max validation)
4. Receipt auto-uploaded to **Cloudflare R2**
5. Admin receives instant notification with 1-click approval
6. User receives instant confirmation notification

**Withdrawal Flow:**
1. User selects payment method & destination account
2. Enters player ID, amount & security code
3. Admin notifies with 1-click approval
4. Automatic user confirmation

**Deposit Confirmation** (`/confirm_deposit`):
- Direct screenshot submission
- Auto R2 backup with metadata
- Admin channel alerts

### 🌐 Multi-Language Support
- **සිංහල** (Sinhala) – Default
- **English** – Full translation
- **தமிழ்** (Tamil) – Complete support
- User language preference saved in database

### 📊 Admin Control Panel
- **Real-time Analytics** (`/stats`):
  - Total users & new users today
  - Approved deposit/withdrawal volumes
  - Pending transaction counts
  - Net cash flow analysis
- **One-Click Transaction Management**:
  - Approve/reject deposits in single click
  - Approve/reject withdrawals with notifications
  - Inline buttons in admin notifications
- **Broadcast Engine**:
  - Mass notifications to all users
  - Telegram rate-limiting protection (25 msg/s)
  - Delivery/blocked/failed tracking

### 🔄 Referral System
- Unique referral links per user (`t.me/bot?start=ref<id>`)
- Referral dashboard with earnings tracking
- Telegram share buttons for easy distribution
- Automatic referral volume calculation

### 🛡️ Security & Verification
- **Channel Force-Join** – Users must join official channel before using bot
- **User Authentication** – Telegram User ID verification
- **Admin-Only Commands** – Role-based access control
- **Input Validation** – Player ID format, amount bounds, file type validation

### ⚡ Dual Operating Modes
- **Long Polling** (`USE_POLLING=true`) – Works on Termux/Android without domain/SSL
- **Webhook** – For public VPS with domain & SSL certificate

### ☁️ Cloud Storage & Backup
- **Cloudflare R2** – Receipt storage with automatic 30-day retention cleanup
- **Audit Logging** – Transaction logs & error tracking in R2
- **Manual Backups** – SQLite database backup scripts

### 📊 Web Dashboard (Port 3000)
- Health check endpoint
- System statistics
- Configuration status
- R2 log retention management
- Real-time cleanup monitoring

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 22 LTS** or **Termux with proot-distro Ubuntu**
- **Telegram Bot Token** (from @BotFather)
- **Admin Telegram Numeric ID** (from @userinfobot)
- **Git** installed

---

### Android Termux Setup

#### Step 1: Install Termux & proot-distro

```bash
# Install Termux from F-Droid (https://f-droid.org/packages/com.termux/)
# Open Termux and run:

termux-wake-lock
pkg update -y && pkg install -y proot-distro git curl
proot-distro install ubuntu
```

#### Step 2: Login to Ubuntu Environment

```bash
proot-distro login ubuntu
```

#### Step 3: Clone & Deploy

```bash
# Clone repository
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared- xbet-bot
cd xbet-bot

# Make deployment script executable
chmod +x deploy-proot.sh

# Run automated setup
bash deploy-proot.sh
```

The script will automatically:
1. ✅ Update Ubuntu packages
2. ✅ Install Node.js 22 LTS with native SQLite support
3. ✅ Install PM2 Process Manager
4. ✅ Install dependencies (`npm install`)
5. ✅ Create `.env` file (prompts for BOT_TOKEN & ADMIN_IDS)
6. ✅ Build production bundle (`npm run build`)
7. ✅ Start bot with PM2 (`pm2 start dist/server.cjs`)

#### Step 4: Keep Bot Running 24/7

To prevent Android from killing Termux:

1. **Enable Wake Lock:**
   ```bash
   termux-wake-lock
   ```
   (Icon should appear in notification bar)

2. **Disable Battery Optimization:**
   - Phone Settings → Apps → Termux → Battery
   - Set to **"Unrestricted"** or **"Don't optimize"**

3. **Lock in Recent Apps:**
   - Open Recent Apps → Long-press Termux → "Lock"

4. **Auto-Start on Boot (Optional):**
   - Install **Termux:Boot** from F-Droid
   - Create `~/.termux/boot/` startup script

---

### Linux VPS Setup

#### Ubuntu/Debian Server

```bash
# Clone repository
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared- xbet-bot
cd xbet-bot

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env  # Edit with your configuration

# Build production bundle
npm run build

# Start with PM2
pm2 start dist/server.cjs --name xbet-bot
pm2 save
pm2 startup
```

#### Systemd Auto-Start (Optional)

```bash
# Create systemd service file
sudo tee /etc/systemd/system/xbet-bot.service > /dev/null <<EOF
[Unit]
Description=XBet Telegram Bot
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which pm2) start dist/server.cjs --name xbet-bot --no-daemon
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl enable xbet-bot.service
sudo systemctl start xbet-bot.service
```

---

### Cloudflare Workers Setup

#### Prerequisites
- Cloudflare account with Workers & D1 Database
- `wrangler` CLI installed

#### Step 1: Install Wrangler

```bash
npm install -g wrangler
wrangler login  # Follow browser prompt to authorize
```

#### Step 2: Configure Secrets

```bash
# Set sensitive environment variables
npx wrangler secret put BOT_TOKEN
# Paste your Telegram bot token when prompted

npx wrangler secret put ADMIN_IDS
# Paste comma-separated admin IDs: 123456789,987654321

npx wrangler secret put WEBHOOK_SECRET
# (Optional) Paste a random secret for webhook validation
```

#### Step 3: Deploy

```bash
chmod +x deploy.sh
./deploy.sh

# Or via npm
npm run deploy:cf
```

This will:
1. ✅ Install dependencies
2. ✅ Create Cloudflare D1 database from `schema.sql`
3. ✅ Build production bundle
4. ✅ Deploy to Cloudflare Workers

#### Step 4: Connect Webhook

After deployment, Cloudflare will display your Worker URL (e.g., `https://xbet-bot.workers.dev`).

Set Telegram webhook:
```bash
curl -F "url=https://xbet-bot.workers.dev/" \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

---

## ⚙️ Configuration

### Environment Variables (.env)

Create a `.env` file in the project root with the following structure:

```env
# ==========================================
# 1. TELEGRAM BOT CONFIGURATION (REQUIRED)
# ==========================================
# Get from @BotFather
BOT_TOKEN=7123456789:AAFlxyz...YourBotToken...

# Get from @userinfobot by sending /start
# Use comma-separated numeric IDs only (e.g., 123456789,987654321)
# Do NOT use @usernames
ADMIN_IDS=123456789,987654321

# Optional: For webhook mode security
WEBHOOK_SECRET=my_random_secure_secret_key_here

# Optional: WhatsApp support link
WHATSAPP_NUMBER=+94771234567

# ==========================================
# 2. RUNTIME MODE & DATABASE
# ==========================================
# Set to 'true' for Termux/VPS (long polling)
# Set to 'false' for public domain with webhook
USE_POLLING=true

# SQLite database file path (data persists across restarts)
DB_PATH=data/bot.db

# ==========================================
# 3. TELEGRAM CHANNEL SETTINGS
# ==========================================
# Official channel username (e.g., @fast_xbet_cash)
CHANNEL_USERNAME=@fast_xbet_cash

# Channel URL for force-join verification
CHANNEL_URL=https://t.me/fast_xbet_cash

# 1XBet affiliate link
XBET_LINK=https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622

# 1XBet VIP promo code
XBET_PROMO_CODE=VGSL

# ==========================================
# 4. TRANSACTION LIMITS
# ==========================================
# Minimum deposit amount (LKR)
MIN_TRANSACTION_LKR=1000

# Maximum deposit amount (LKR)
MAX_TRANSACTION_LKR=500000

# Instructions shown during deposit flow
DEPOSIT_INSTRUCTIONS=Please get official payment instructions from your agent and send a screenshot of the transaction receipt.

# ==========================================
# 5. PAYMENT METHOD DETAILS
# ==========================================
# Bank account details for transfers
BANK_DETAILS=Bank: Commercial Bank | Account: 8001234567 | Name: Cashier Agent | Branch: Colombo

# Dialog eZ Cash wallet number
EZCASH_NUMBER=0771234567

# Mobitel mCash wallet number
MCASH_NUMBER=0711234567

# FriMi/NTB wallet number or ID
FRIMI_NUMBER=0771234567

# ==========================================
# 6. CLOUDFLARE R2 STORAGE (OPTIONAL)
# ==========================================
# Leave blank if not using R2 (local storage only)

# Your Cloudflare Account ID
R2_ACCOUNT_ID=your_account_id

# R2 API Token Access Key ID
R2_ACCESS_KEY_ID=your_access_key_id

# R2 API Token Secret Access Key
R2_SECRET_ACCESS_KEY=your_secret_access_key

# R2 Bucket name (e.g., xbet-receipts)
R2_BUCKET_NAME=your_bucket_name

# Public domain for R2 (e.g., https://receipts.example.com)
# Leave blank to use default R2 URLs
R2_PUBLIC_DOMAIN=

# ==========================================
# 7. ADMIN CHANNEL (OPTIONAL)
# ==========================================
# Separate channel ID for admin notifications
# If empty, uses CHANNEL_USERNAME for notifications
ADMIN_CHANNEL_ID=
```

### Configuration Examples

**For Termux/Android:**
```env
USE_POLLING=true
DB_PATH=data/bot.db
# R2 credentials are optional
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

**For VPS with Domain:**
```env
USE_POLLING=false
DB_PATH=/var/lib/xbet-bot/bot.db
WEBHOOK_SECRET=your_secure_random_string_here
# Enable R2 for production backup
R2_ACCOUNT_ID=your_id
R2_ACCESS_KEY_ID=your_key
```

**For Cloudflare Workers:**
```env
# Use wrangler secret put instead of .env
# Secrets are set via CLI, not in .env
```

---

## 🤖 Commands

### User Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Launch bot & main menu | Automatic on first message |
| `/menu` | Open main navigation menu | `/menu` |
| `/deposit` | Start deposit workflow | `/deposit` |
| `/confirm_deposit` | Submit receipt for confirmation | `/confirm_deposit` + photo |
| `/withdraw` | Start withdrawal workflow | `/withdraw` |
| `/register` | Get 1XBet registration link | `/register` |
| `/referrals` or `/myreferrals` | View referral dashboard | `/referrals` |
| `/history` or `/transactions` | View deposit/withdrawal history | `/history` |
| `/language` or `/lang` | Change language (සිංහල/English/தமிழ்) | `/language` |
| `/help` or `/support` or `/faq` | Show FAQ & support options | `/help` |
| `/id` or `/myid` or `/whoami` | View your Telegram ID & role | `/id` |
| `/cancel` | Cancel current operation | `/cancel` |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/admin` or `/panel` | Open admin control panel |
| `/stats` | View real-time analytics (users, deposits, withdrawals, cash flow) |
| `/cleanuplogs` or `/cleanup` | Manually trigger R2 log retention cleanup |

---

## 🛠️ Process Management (PM2)

### Common Commands

```bash
# View bot status
pm2 status

# View live logs
pm2 logs xbet-bot

# Restart bot (apply .env changes)
pm2 restart xbet-bot

# Stop bot gracefully
pm2 stop xbet-bot

# Start previously stopped bot
pm2 start xbet-bot

# Save current PM2 state (auto-start on reboot)
pm2 save

# View detailed process info
pm2 info xbet-bot

# Flush all logs
pm2 flush

# Monitor in real-time (system metrics)
pm2 monit
```

### After .env Changes

Always restart the bot to apply new environment variables:
```bash
pm2 restart xbet-bot
```

---

## 💾 Database Management

### Manual Backup

```bash
# Create timestamped backup
cp data/bot.db data/bot_backup_$(date +%Y-%m-%d).db

# List all backups
ls -lh data/bot_backup_*.db
```

### Query Database Directly

```bash
# Count total users
sqlite3 data/bot.db "SELECT COUNT(*) as total_users FROM users;"

# View recent deposits
sqlite3 data/bot.db "SELECT id, user_id, player_id, amount, status, created_at FROM deposits ORDER BY id DESC LIMIT 10;"

# View recent withdrawals
sqlite3 data/bot.db "SELECT id, user_id, player_id, amount, status, created_at FROM withdrawals ORDER BY id DESC LIMIT 10;"

# Check referral data
sqlite3 data/bot.db "SELECT referrer_id, COUNT(*) as referral_count FROM referrals GROUP BY referrer_id;"
```

### Database Schema

See `schema.sql` for complete schema:
- **users** – User profiles, language preference, referral data
- **deposits** – Deposit requests with status tracking
- **withdrawals** – Withdrawal requests with destination accounts
- **referrals** – Referrer-referred user relationships
- **user_state** – Temporary multi-step workflow state

---

## 🌐 Web Dashboard (Port 3000)

When running, the bot serves a dashboard at `http://localhost:3000` or `http://<your-vps-ip>:3000`:

- **Health Check:** `GET /health` or `GET /api/health`
- **Cleanup Status:** `GET /api/cleanup/logs/status`
- **Manual Cleanup:** `POST /api/cleanup/logs` (with `retentionDays` body parameter)

---

## ❓ Troubleshooting & FAQ

### Bot Not Responding to Messages

**Problem:** Sent messages but bot doesn't reply

**Solution:**
1. Check PM2 logs:
   ```bash
   pm2 logs xbet-bot
   ```

2. Verify `BOT_TOKEN` is correct in `.env`:
   ```bash
   grep BOT_TOKEN .env
   ```

3. Confirm `USE_POLLING=true` is set (or webhook properly configured)

4. If webhook was previously set, delete it:
   ```bash
   curl https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook
   ```

5. Restart bot:
   ```bash
   pm2 restart xbet-bot
   ```

---

### Bot Stops When Closing Termux

**Problem:** Bot shuts down when Termux app is closed

**Solution:**
- Bot runs in `proot-distro` isolated environment
- It continues running in background even with Termux closed
- Ensure `termux-wake-lock` is active (check notification bar)
- Check Settings → Apps → Termux → Battery → "Unrestricted"

---

### Admin Not Receiving Notifications

**Problem:** Admin ID doesn't get deposit/withdrawal alerts

**Solution:**
1. Verify `ADMIN_IDS` uses **Telegram numeric ID**, not username:
   ```env
   ADMIN_IDS=123456789,987654321  # ✅ Correct
   ADMIN_IDS=@myusername          # ❌ Wrong
   ```

2. Get correct numeric ID from `@userinfobot`:
   - Open Telegram
   - Message `@userinfobot`
   - Send `/start`
   - Copy the `Id` field

3. Add to `.env` and restart:
   ```bash
   pm2 restart xbet-bot
   ```

---

### Cloudflare R2 Not Storing Receipts

**Problem:** Receipt screenshots not being backed up to R2

**Solution:**
1. Verify R2 credentials in `.env`:
   ```bash
   grep -E "R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_BUCKET_NAME" .env
   ```

2. Test R2 connection:
   ```bash
   npm run dev  # Run in development mode with console logs
   ```

3. Check for errors in PM2 logs:
   ```bash
   pm2 logs xbet-bot | grep -i "R2\|error"
   ```

4. Verify Cloudflare credentials are valid (check Cloudflare dashboard)

---

### High Memory Usage

**Problem:** Bot consuming too much memory

**Solution:**
1. Check current memory:
   ```bash
   pm2 monit
   ```

2. Clear old logs:
   ```bash
   pm2 flush
   ```

3. Restart bot:
   ```bash
   pm2 restart xbet-bot
   ```

4. Monitor memory over time:
   ```bash
   pm2 save
   ```

---

### Webhook Connection Issues

**Problem:** Webhook not receiving Telegram updates

**Solution:**
1. Verify webhook is set:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

2. Set webhook with correct URL:
   ```bash
   curl -F "url=https://your-domain.com/" https://api.telegram.org/bot<TOKEN>/setWebhook
   ```

3. Verify SSL certificate is valid (required by Telegram)

4. Check firewall allows inbound connections on port 443

---

### Database Corruption / Data Loss

**Problem:** Database file corrupted or data missing

**Solution:**
1. Restore from recent backup:
   ```bash
   cp data/bot_backup_YYYY-MM-DD.db data/bot.db
   pm2 restart xbet-bot
   ```

2. Check database integrity:
   ```bash
   sqlite3 data/bot.db "PRAGMA integrity_check;"
   ```

3. If severely corrupted, restore full backup and sync with records

---

## 📊 Architecture

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Language** | TypeScript 5.8 |
| **Bot Framework** | Grammy 1.35 |
| **Runtime** | Node.js 22 LTS |
| **Database** | SQLite (local) / Cloudflare D1 (serverless) |
| **File Storage** | Cloudflare R2 (optional) |
| **Process Manager** | PM2 24/7 |
| **Cloud Deployment** | Cloudflare Workers (optional) |
| **Build Tool** | esbuild |

### Project Structure

```
├── src/
│   ├── bot.ts              # Grammy bot setup & command handlers
│   ├── db.ts               # Database operations & queries
│   ├── sqlite-d1.ts        # SQLite/D1 database abstraction
│   ├── r2.ts               # Cloudflare R2 integration
│   ├── logger.ts           # Audit logging to R2
│   ├── logCleanup.ts       # R2 retention cleanup
│   ├── worker.ts           # Cloudflare Worker entry point
│   ├── index.ts            # Node.js server entry point
│   ├── types.ts            # TypeScript interfaces
│   ├── i18n.ts             # Multi-language strings (if available)
│   └── utils.ts            # Helper functions (if available)
├── dist/
│   └── server.cjs          # Compiled production bundle
├── data/
│   ├── bot.db              # SQLite database (auto-created)
│   └── bot_backup_*.db     # Manual backups
├── schema.sql              # Database schema
├── package.json
├── tsconfig.json
├── wrangler.toml           # Cloudflare Workers config
├── deploy.sh               # Cloudflare deployment script
├── deploy-proot.sh         # Termux deployment script
└── README.md
```

---

## 🔐 Security Considerations

### Best Practices

1. **Secret Management:**
   - ✅ Never commit `.env` file to Git
   - ✅ Use environment variables for secrets
   - ✅ Rotate `WEBHOOK_SECRET` regularly
   - ✅ Use strong random values for secrets

2. **Database Security:**
   - ✅ Regular backups (daily recommended)
   - ✅ Verify database integrity with `PRAGMA integrity_check`
   - ✅ Restrict database file permissions: `chmod 600 data/bot.db`

3. **Admin Access:**
   - ✅ Use numeric Telegram IDs only (not usernames)
   - ✅ Limit admin count to necessary personnel
   - ✅ Audit admin actions via logs

4. **Transaction Security:**
   - ✅ All financial data logged to audit trail
   - ✅ Receipt screenshots backed up to R2
   - ✅ Approval/rejection recorded with timestamps
   - ✅ Admin identity tracked in logs

5. **Network Security:**
   - ✅ Use HTTPS/SSL for webhook endpoints
   - ✅ Verify webhook secret tokens
   - ✅ Restrict bot API access to necessary commands

### Audit Logging

All transactions are logged to Cloudflare R2 (if configured):
- **Transaction Logs:** `logs/transactions/YYYY/MM/DD/`
- **Error Logs:** `logs/errors/YYYY/MM/DD/`
- **Retention:** 30 days (auto-cleanup daily)

---

## 📈 Performance Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# View memory & CPU usage
pm2 status

# Show resource info
pm2 info xbet-bot
```

### Health Checks

```bash
# Local health check
curl http://localhost:3000/health

# Remote health check
curl http://your-vps-ip:3000/api/health

# Response example:
# {"status":"ok","botConfigured":true,"port":3000}
```

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Tele-bot-cloudflared-.git
cd Tele-bot-cloudflared-

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your test bot token

# Run in development mode with hot reload
npm run dev

# Build production bundle
npm run build

# Type checking
npm run lint
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💬 Support

For issues, questions, or feedback:

1. **Check the FAQ** above for common solutions
2. **Review logs:** `pm2 logs xbet-bot`
3. **Check database:** `sqlite3 data/bot.db ".tables"`
4. **Open an Issue** on GitHub with:
   - Error message from logs
   - Steps to reproduce
   - Environment details (Termux/VPS/Workers)
   - Configuration details (USE_POLLING mode, etc.)

---

## 🎯 Roadmap

- [ ] Multi-user admin roles (viewer, approver, admin)
- [ ] Email/SMS notifications for admins
- [ ] Dashboard UI for analytics
- [ ] Payment gateway API integrations
- [ ] Automated reconciliation reports
- [ ] User KYC verification system
- [ ] Transaction dispute resolution workflow

---

## ⚠️ Disclaimer

This bot is designed for managing legitimate gaming operations. Users are responsible for:
- Complying with local laws and regulations
- Proper financial record-keeping
- Secure handling of user data
- Regular audits and verification

---

## 🙏 Acknowledgments

- **Grammy** – Telegram Bot Framework
- **Cloudflare** – R2 Storage & Workers
- **PM2** – Process Management
- **Node.js** – JavaScript Runtime

---

## 📞 Contact

**Author:** Lakmal2078  
**Repository:** [Tele-bot-cloudflared-](https://github.com/Lakmal2078/Tele-bot-cloudflared-)

---

<div align="center">

**Made with ❤️ for Sri Lankan gaming operations**

🇱🇰 Proud to serve the community with reliable, high-performance financial workflows.

⭐ If this bot helped you, please give it a star! ⭐

</div>
