# 🇱🇰 XBet Telegram Cashier & Management Bot (`cloudflared`)

[![CI / CD](https://github.com/Lakmal2078/Tele-bot-cloudflared-main/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Lakmal2078/Tele-bot-cloudflared-main/actions/workflows/ci-cd.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-green?logo=node.js)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)](https://workers.cloudflare.com/)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare-Tunnel-F38020?logo=cloudflare)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-0088cc?logo=telegram)](https://core.telegram.org/bots/api)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> **Enterprise-grade Telegram Cashier, Financial Transaction Management, Multi-Tier Referral, and Automated Sports Betting Tips Bot** built with TypeScript, grammY, Cloudflare Workers, Cloudflare Tunnel (`cloudflared`), Cloudflare D1 / SQLite, Cloudflare R2, and Docker.

Designed with dual-runtime compatibility (**Serverless Cloudflare Edge** and **Self-Hosted Node.js / Docker / VPS**), end-to-end webhook cryptographic authentication, versioned forward-only database migrations, financial audit trails, rate limiting, anti-fraud controls, and localized user interfaces in **Sinhala (සිංහල)**, **Tamil (தமிழ்)**, and **English**.

---

## 📑 Table of Contents

- [Core Features](#-core-features)
- [System Architecture](#-system-architecture)
- [Prerequisites & Tooling](#-prerequisites--tooling)
- [Environment Configuration](#-environment-configuration)
- [Installation & Local Setup](#-installation--local-setup)
- [Cloudflare Tunnel (`cloudflared`) Setup](#-cloudflare-tunnel-cloudflared-setup)
- [Production Deployment Guide](#-production-deployment-guide)
  - [1. Cloudflare Workers (Edge Serverless)](#1-cloudflare-workers-edge-serverless)
  - [2. Docker & Docker Compose](#2-docker--docker-compose)
  - [3. Linux VPS with PM2](#3-linux-vps-with-pm2)
  - [4. Linux VPS with Systemd](#4-linux-vps-with-systemd)
  - [5. Android / Termux Deployment](#5-android--termux-deployment)
- [Operational Endpoints & Healthchecks](#-operational-endpoints--healthchecks)
- [Automated Free Sports Tips Engine](#-automated-free-sports-tips-engine)
- [Database Migrations](#-database-migrations)
- [Security & Compliance](#-security--compliance)
- [Maintenance & Monitoring](#-maintenance--monitoring)
- [Contributing & License](#-contributing--license)

---

## ✨ Core Features

### 1. Telegram Cashier & Account Operations
- **Deposit Workflow:** User selects deposit channel (Bank Transfer, eZ Cash, mCash, FriMi), receives instructions, inputs amount, and uploads payment slips/receipts.
- **Withdrawal Workflow:** Fast withdrawal requests with account validation, balance checks, and admin payout review.
- **Media & Receipt Archival:** Safe storage of transaction proof images via Cloudflare R2 or local storage with 30-day retention policies.
- **Multi-Lingual Engine:** Native, dynamic language selection between Sinhala, Tamil, and English.
- **Referral Ecosystem:** Deep-linked referral codes (`/start ref_USERID`), tiered commission summaries, and live conversion statistics.
- **Admin Cashier Panel:** Inline callback moderation buttons (`Approve` / `Reject`) with optimistic locking and multi-admin race-condition prevention.

### 2. Automated Free Sports Betting Tips Engine
- **Live Sports Ingestion:** Automated candidate curation powered by The Odds API across top football leagues (Premier League, La Liga, Serie A, Bundesliga, Champions League), NBA basketball, and ATP tennis.
- **Intelligent Value-Filtering:** Enforces configurable odds limits (`1.40` to `2.80`), deduplication across slots, and time window validation.
- **Scheduled Publishing:** Automated slot posting at **08:00, 12:00, and 18:00 Sri Lanka Time (SLST / UTC+5:30)**.
- **Distributed Lease Locking:** Database-level lease-claiming preventing duplicate posts from concurrent worker cron isolates.
- **Automated Settlement:** Ingests final match scores, auto-evaluates picks (`WON`, `LOST`, `VOID`), and calculates win rates and net yield.

### 3. Edge-Optimized Landing Page & OpenGraph Previews
- **Instant Web Experience:** Server-rendered responsive landing page (`src/landingPage.ts`) with zero client-side framework bloat.
- **Dynamic Language Switcher:** Client-side toggle between Sinhala, English, and Tamil.
- **WhatsApp & Social Link Optimization:** Ultra-optimized 1200x630 JPEG/PNG previews (`/og-image.jpg`, `/og-image.png`) under 80 KB ensuring instant thumbnails on WhatsApp, Telegram, Facebook, and Twitter.
- **Content Security Policy (CSP):** Strict CSP with per-request cryptographic nonces and frame protection.

---

## 🏗️ System Architecture

```text
                                  ┌────────────────────────┐
                                  │     Telegram Users     │
                                  └───────────┬────────────┘
                                              │ Telegram App
                                              ▼
                                  ┌────────────────────────┐
                                  │   Telegram Bot API     │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ HTTPS Webhook (X-Telegram-Bot-Api-Secret-Token)│
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │   Cloudflare Workers    │                     │   Self-Hosted Node/VPS  │
         │   (src/worker.ts)       │                     │   (src/index.ts)        │
         │                         │                     │                         │
         │ - Global Edge Network   │                     │ - Behind cloudflared    │
         │ - Sub-millisecond cold  │                     │ - Docker / PM2 / systemd│
         │ - Fail-closed security  │                     │ - SQLite local fallback │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
             ┌────────┴────────┐                             ┌────────┴────────┐
             ▼                 ▼                             ▼                 ▼
     ┌───────────────┐ ┌───────────────┐             ┌───────────────┐ ┌───────────────┐
     │ Cloudflare D1 │ │ Cloudflare R2 │             │ Local SQLite  │ │ Local / R2    │
     │  (Serverless  │ │ (Receipt & Log│             │ (bot.db with  │ │ Media Backups │
     │  SQL DB)      │ │  Buckets)     │             │  WAL Mode)    │ │               │
     └───────┬───────┘ └───────────────┘             └───────┬───────┘ └───────────────┘
             │                                               │
             ▼                                               ▼
     ┌───────────────┐                               ┌───────────────┐
     │ Worker Crons  │                               │ System Timers │
     │ 08,12,18 SLST │                               │ Node Scheduler│
     └───────────────┘                               └───────────────┘
```

### Runtime Modes

| Feature | Cloudflare Workers Mode | Node.js / Docker Mode |
|---|---|---|
| **Entry Point** | `src/worker.ts` | `src/index.ts` → `dist/server.cjs` |
| **Execution** | Cloudflare Edge V8 Isolates | Node.js 22 LTS Process |
| **Database** | Cloudflare D1 (Serverless Distributed SQL) | SQLite via `node:sqlite` (D1 API Shim) |
| **Storage** | Cloudflare R2 Native Binding | AWS S3 SDK (Cloudflare R2 or Local) |
| **Webhook Transport** | Cloudflare Worker URL (`https://...workers.dev`) | Cloudflare Tunnel (`cloudflared`) / Reverse Proxy |
| **Background Tasks** | Cloudflare Cron Triggers (`[triggers.crons]`) | Node interval scheduler or systemd timer |

---

## 🛠️ Prerequisites & Tooling

Before setting up the project, ensure you have the following installed:

1. **Runtime & Package Manager:**
   - [Node.js](https://nodejs.org/) v20.x or v22.x LTS
   - [npm](https://www.npmjs.com/) v10.x+
   - [Git](https://git-scm.com/)

2. **Telegram Credentials:**
   - Create a bot via [@BotFather](https://t.me/BotFather) to obtain your `BOT_TOKEN`.
   - Obtain your numeric Telegram User ID via [@userinfobot](https://t.me/userinfobot) for `ADMIN_IDS`.

3. **Cloudflare & DevOps Tooling (Optional based on deployment):**
   - **Wrangler CLI:** Pinned in `devDependencies` (`npx wrangler`).
   - **Cloudflare Tunnel CLI (`cloudflared`):** Download from [Cloudflare Releases](https://github.com/cloudflare/cloudflared/releases).
   - **Docker & Docker Compose:** For containerized deployments.
   - **PM2:** `npm install -g pm2` for VPS process management.

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

### Configuration Variables Breakdown

| Variable | Required | Description | Example / Default |
|---|---|---|---|
| `BOT_TOKEN` | **Yes** | Telegram Bot API Token from @BotFather | `1234567890:ABCdefGHI...` |
| `ADMIN_IDS` | **Yes** | Comma-separated numeric Telegram User IDs of Admins | `123456789,987654321` |
| `WEBHOOK_SECRET` | **Yes** | Secret token for Telegram webhook validation (min 16 chars) | `hex_random_32_chars` |
| `ADMIN_API_SECRET` | **Yes** | Secret token for `/api/*` private operational endpoints | `hex_random_32_chars` |
| `PORT` | No | Port for local HTTP server | `3000` |
| `BOT_MODE` | No | Mode: `webhook` (default) or `polling` | `webhook` |
| `USE_POLLING` | No | Set to `true` to force local long polling | `false` |
| `DB_PATH` | No | SQLite database file path for Node.js runtime | `./data/bot.db` |
| `CHANNEL_USERNAME`| No | Public Telegram Channel username | `@FastXBetCashLK` |
| `CHANNEL_URL` | No | Public Telegram Channel invite link | `https://t.me/FastXBetCashLK` |
| `TIPS_CHANNEL_ID` | No | Telegram Channel ID for automated betting tips | `-1001234567890` |
| `TIPS_CHANNEL_URL`| No | Public invite link to betting tips channel | `https://t.me/FastXBetTipsLK` |
| `ADMIN_CHANNEL_ID`| No | Channel ID for real-time cashier alerts | `-1009876543210` |
| `ODDS_API_KEY` | No | API Key from The Odds API (required if tips enabled) | `abcdef0123456789...` |
| `TIPS_SPORTS` | No | Sports leagues to analyze | `soccer_epl,soccer_uefa_champs_league`|
| `TIPS_MIN_ODDS` | No | Minimum decimal odds filter | `1.40` |
| `TIPS_MAX_ODDS` | No | Maximum decimal odds filter | `2.80` |
| `XBET_LINK` | No | Affiliate registration link | `https://reffpa.com/L?tag=...` |
| `XBET_PROMO_CODE` | No | Registration promo code | `FASTLK` |
| `WHATSAPP_NUMBER` | No | Customer support WhatsApp contact | `+94770000000` |
| `BANK_DETAILS` | No | Bank deposit account information | `Commercial Bank 1234567890` |
| `R2_ACCOUNT_ID` | No | Cloudflare Account ID for R2 storage | `...` |
| `R2_ACCESS_KEY_ID`| No | Cloudflare R2 S3 Access Key ID | `...` |
| `R2_SECRET_ACCESS_KEY`| No | Cloudflare R2 S3 Secret Access Key | `...` |
| `R2_BUCKET_NAME` | No | R2 Bucket Name for slips and logs | `xbet-receipts` |

> 🔒 **Security Warning:** Never commit `.env`, `credentials.json`, `*.pem`, or private keys to source control. Ensure `.env` is listed in your `.gitignore`.

---

## 💻 Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git
cd Tele-bot-cloudflared-main
```

### 2. Install Dependencies
```bash
npm ci
```

### 3. Initialize Database
For local Node.js execution, run the migration validator to check SQL scripts:
```bash
npm run validate:migrations
```

### 4. Run Quality Checks
```bash
# Run ESLint and TypeScript checks
npm run lint

# Run all 14 test suites (106+ unit & regression tests)
npm test

# Run full project check
npm run check
```

### 5. Start Development Server
```bash
npm run dev
```
The server will start on `http://0.0.0.0:3000`. You can test the landing page in your browser and check `/api/health`.

---

## 🚇 Cloudflare Tunnel (`cloudflared`) Setup

Using **Cloudflare Tunnel** (`cloudflared`) allows you to securely expose your self-hosted Node.js or Docker bot server to Telegram's Webhook API over HTTPS without opening router ports, configuring firewall rules, or dealing with dynamic IP addresses.

### Method A: Quick Ephemeral Tunnel (Development / Testing)

Run the included helper script:
```bash
npm run tunnel
# Select Option 1 (Quick Tunnel)
```
Or directly via the CLI:
```bash
cloudflared tunnel --url http://localhost:3000
```
This generates a temporary URL such as `https://random-words.trycloudflare.com`.

Register this URL with Telegram:
```bash
curl -F "url=https://random-words.trycloudflare.com" \
     -F "secret_token=YOUR_WEBHOOK_SECRET" \
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

### Method B: Production Named Tunnel (Custom Domain)

#### Step 1: Install `cloudflared`
- **Debian / Ubuntu:**
  ```bash
  curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i cloudflared.deb
  ```
- **macOS:**
  ```bash
  brew install cloudflared
  ```

#### Step 2: Authenticate `cloudflared`
```bash
cloudflared tunnel login
```

#### Step 3: Create a Dedicated Tunnel
```bash
cloudflared tunnel create xbet-bot-tunnel
```
*(Note the returned Tunnel UUID)*

#### Step 4: Route DNS to Your Domain
```bash
cloudflared tunnel route dns xbet-bot-tunnel bot.yourdomain.com
```

#### Step 5: Configure the Tunnel
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: xbet-bot-tunnel
credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: bot.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

#### Step 6: Install and Start as a System Service
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

#### Step 7: Register Telegram Webhook
```bash
curl -s -F "url=https://bot.yourdomain.com" \
        -F "secret_token=YOUR_WEBHOOK_SECRET" \
        -F "drop_pending_updates=false" \
        https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

Verify the webhook status:
```bash
curl -s https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo | jq
```

---

## 🚀 Production Deployment Guide

### 1. Cloudflare Workers (Edge Serverless)

The primary serverless deployment path runs on Cloudflare's global edge network.

#### Setup Cloudflare Secrets
Run the interactive secret setup script:
```bash
npm run secrets:cf
```
Or set them manually via Wrangler:
```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put ADMIN_IDS
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ADMIN_API_SECRET
npx wrangler secret put ODDS_API_KEY
```

#### Execute Migration & Deployment
```bash
# Production deployment with validation & healthcheck
npm run deploy:cf

# Or for CI/CD environments
npm run deploy:cf:ci
```

---

### 2. Docker & Docker Compose

For deploying in a containerized environment (e.g., VPS, AWS ECS, DigitalOcean Droplet, GCP Compute Engine):

#### Build & Run via Docker Compose
```bash
# Build the production image
npm run docker:build

# Launch in background
npm run docker:up

# Check container logs
npm run docker:logs

# Stop containers
npm run docker:down
```

#### Build with Docker CLI
```bash
docker build -t xbet-telegram-bot:latest .
docker run -d \
  --name xbet-bot \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  xbet-telegram-bot:latest
```

---

### 3. Linux VPS with PM2

#### Step 1: Build the Server Bundle
```bash
npm run build
```

#### Step 2: Start PM2 Process
```bash
# Start bot under PM2 supervision
npm run pm2:start

# View live logs
npm run pm2:logs

# Save PM2 process list across system reboots
pm2 save
pm2 startup
```

---

### 4. Linux VPS with Systemd

A production-hardened systemd unit file is included in `scripts/xbet-bot.service`.

```bash
# 1. Build bundle
npm run build

# 2. Copy service template to systemd
sudo cp scripts/xbet-bot.service /etc/systemd/system/xbet-bot.service

# 3. Reload systemd daemon and enable service
sudo systemctl daemon-reload
sudo systemctl enable --now xbet-bot

# 4. Check status & logs
sudo systemctl status xbet-bot
journalctl -u xbet-bot -f
```

---

### 5. Android / Termux Deployment

For lightweight operation on Android devices:
```bash
# Run Termux initialization
bash setup-termux.sh

# Run PRoot deployment wrapper
bash deploy-proot.sh
```

---

## 📡 Operational Endpoints & Healthchecks

The application provides authenticated operational and monitoring endpoints:

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/` | `GET` | None | Public localized marketing landing page |
| `/og-image.jpg` | `GET` | None | Optimized JPEG social share image for WhatsApp |
| `/og-image.png` | `GET` | None | Lossless PNG social share image |
| `/api/health` | `GET` | None | Service liveness and database ping check |
| `/api/stats` | `GET` | Admin Secret | Real-time user, deposit, and referral statistics |
| `/api/dashboard`| `GET` | Admin Secret | Operational dashboard with pending tickets & fraud alerts |
| `/api/tickets` | `GET` | Admin Secret | Support ticket management and status updates |
| `/api/tips/settle`| `POST`| Admin Secret | Triggers match score settling for posted tips |
| `/api/tips/performance`| `GET`| Admin Secret | Win-rate, ROI, and total click analytics |

### Authenticating with Admin Endpoints
Pass your `ADMIN_API_SECRET` via the `X-Admin-Secret` header:
```bash
curl -H "X-Admin-Secret: YOUR_ADMIN_API_SECRET" https://bot.yourdomain.com/api/dashboard
```

---

## ⚽ Automated Free Sports Tips Engine

1. **Candidate Discovery:** Runs daily crons via Cloudflare or Node timers (`08:00`, `12:00`, `18:00` SLST).
2. **Quota-Aware Retrieval:** Fetches available fixtures within `TIPS_HOURS_AHEAD` (default 24h) from The Odds API.
3. **Filtering & Deduplication:** Filters odds between `TIPS_MIN_ODDS` and `TIPS_MAX_ODDS`. Cross-references `tip_posts` in SQLite/D1 to avoid repeating fixtures on the same calendar day.
4. **Channel Distribution:** Formats multilingual betting tickets with affiliate tracking links and posts directly to `TIPS_CHANNEL_ID`.
5. **Settlement Tracking:** Queries match outcomes via `/api/tips/settle`, updates pick statuses (`WON`, `LOST`, `VOID`), and logs click conversion metrics in `tip_clicks`.

---

## 🗄️ Database Migrations

Database schema transitions are managed through ordered, forward-only SQL migrations in the `migrations/` directory:

| Migration File | Description |
|---|---|
| `0001_initial_schema.sql` | Users, deposits, withdrawals, settings, and referrals schema |
| `0002_tip_posts.sql` | Automated sports betting tip post records |
| `0003_financial_integrity.sql` | Audit logging triggers and balance constraint safeguards |
| `0004_abuse_protection.sql` | User rate limiting, cooldowns, and anti-spam locks |
| `0005_operations_dashboard.sql`| Operational audit log and support ticket tables |
| `0006_multi_tip_payload.sql` | JSON payload support for multi-game betting tickets |
| `0007_tip_settlement_and_clicks.sql` | Pick-level score settlement and affiliate click tracking |

### Migration Integrity Rules
- Never modify an existing applied migration file.
- Always add a new sequentially numbered file (e.g. `0008_new_feature.sql`).
- Test migrations locally with `npm run validate:migrations`.

---

## 🛡️ Security & Compliance

- **Timing-Safe Authentication:** All webhook secrets and admin API tokens use `crypto.timingSafeEqual` to eliminate timing attacks.
- **Fail-Closed Webhook Validation:** Telegram updates lacking a valid `X-Telegram-Bot-Api-Secret-Token` are rejected immediately with HTTP 401.
- **Optimistic Concurrency Control:** Prevents race conditions where two admins might concurrently approve or reject the same deposit or withdrawal request.
- **Anti-Spam & Rate Limiting:** Enforces cooldown intervals on transaction submissions and ticket creation to prevent bot flooding.
- **Open-Redirect Protection:** Affiliate link redirection endpoints strictly validate hostnames against an approved whitelist.
- **Strict Content-Security-Policy (CSP):** The web landing page uses per-request cryptographic nonces and prohibits unauthorized external framing.

---

## 📊 Maintenance & Monitoring

### Viewing Real-Time Logs
- **Cloudflare Workers:** `npx wrangler tail`
- **Docker:** `docker compose logs -f`
- **PM2:** `pm2 logs xbet-bot`
- **Systemd:** `journalctl -u xbet-bot -f`

### Backing Up SQLite Database (Self-Hosted)
```bash
# Safely snapshot SQLite database using sqlite3 CLI
sqlite3 data/bot.db ".backup 'data/backup-$(date +%F).db'"
```

---

## 🤝 Contributing & License

Contributions are welcome! Please ensure:
1. All changes pass `npm run check` (linter, types, and all unit tests).
2. Any database modifications include a new forward-only migration.
3. No secrets or personal credentials are committed.

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

**Repository Maintainer:** [Lakmal2078](https://github.com/Lakmal2078)  
**Repository:** https://github.com/Lakmal2078/Tele-bot-cloudflared-main
