# 🇱🇰 XBet Telegram Bot (1xBet Fast Cash)

A Cloudflare Workers–based Telegram bot that combines **free sports betting tips** with **1xBet cash agent services** (deposits, withdrawals, and account management) for the Sri Lankan market.

- **Worker URL:** https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev
- **Bot:** [@fast_1xbetcash_bot](https://t.me/fast_1xbetcash_bot)
- **Channel:** [@fast_xbet_official_tips](https://t.me/fast_xbet_official_tips)

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Free Tips System](#-free-tips-system)
- [API Endpoints](#-api-endpoints)
- [Testing](#-testing)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [Contact](#-contact)

---

## 📌 Overview

This is a **Telegram bot deployed as a single Cloudflare Worker** — there is no separate backend server in production. It provides two things to users on Telegram:

1. **Free sports betting tips**, generated automatically three times a day from a quality-first, market-consensus value-scoring model (no-vig consensus probability, best available price, confidence labels, stale/quality filters).
2. **1xBet financial agent services** — deposits and withdrawals via eZ Cash, mCash, FriMi, and iPay, with admin approval workflows, fraud checks, and audit logging.

State is stored in **Cloudflare D1** (SQLite), receipts and structured logs are stored in **Cloudflare R2**, and the whole app runs at the edge with cron-triggered jobs for tips publishing, settlement, and cleanup.

## ✨ Features

- 🤖 Telegram bot in webhook mode (grammY)
- 🎯 Automated free sports tips, 3× daily (08:00 / 12:00 / 18:00 Sri Lanka time), sourced from The Odds API
- ⏱️ Hourly automatic tip settlement (win/loss/void)
- 💰 Deposit & withdrawal flows for eZ Cash, mCash, FriMi, iPay
- 📊 Admin dashboard with charts, trends, and ticket/schedule management
- 🖼️ Cloudflare R2 storage for deposit receipts and structured audit logs
- 🔒 Webhook secret validation, rate limiting, fraud detection, admin API auth
- 🌐 Multi-language support (English / Sinhala / Tamil)
- ⏰ Cron-based automation for tips, settlement, and log cleanup

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers (TypeScript) |
| Bot Framework | [grammY](https://grammy.dev/) (Telegram Bot API, webhook mode) |
| Database | Cloudflare D1 (SQLite) |
| Object Storage | Cloudflare R2 |
| Odds Provider | [The Odds API](https://the-odds-api.com/) |
| Testing | Vitest |
| Linting | ESLint + TypeScript |
| CI/CD | GitHub Actions |
| CLI | Wrangler `4.131.0` (pinned) |

## 📁 Project Structure

```
src/
├── worker.ts          # Cloudflare Worker entry point (fetch + scheduled handlers)
├── index.ts            # Local Node.js dev-preview server (not used in production)
├── bot.ts               # grammY bot: commands, conversations, deposit/withdrawal flows
├── apiRoutes.ts        # /api/* and /health route handlers
├── landingPage.ts      # Generates the public landing page (HTML)
├── adminPage.ts         # Admin dashboard HTML
├── adminChart.ts        # Admin dashboard charts (SVG/D3)
├── tips.ts               # Free tips generation, scoring, and publishing
├── tipsProvider.ts       # The Odds API client
├── tipsSettlement.ts     # Hourly settlement of published tips
├── db.ts                  # D1 query helpers
├── sqlite-d1.ts           # Local SQLite shim implementing the D1 interface (for src/index.ts)
├── storage.ts / r2.ts     # Cloudflare R2 helpers (receipts, uploads)
├── logger.ts              # Structured audit logging (transactions & errors) to R2
├── logCleanup.ts          # Scheduled R2 log cleanup
├── security.ts            # Webhook validation, security headers
├── rateLimit.ts           # Rate limiting
├── fraud.ts                # Fraud detection heuristics
├── i18n.ts                 # English / Sinhala / Tamil translations
├── config.ts                # Environment validation
├── brandLogo.ts / ogImage.ts # Branding & Open Graph image generation
├── types.ts                  # Shared TypeScript types (Env, etc.)
└── utils.ts                  # Shared utilities

migrations/     # D1 SQL migrations (0001–0007)
scripts/        # deploy helper, env scanner, tips-provider check, CF secrets setup
tests/          # Vitest unit tests (16 files, 128 tests)
docs/           # Design notes for security, financial integrity, and edge protection phases
```

> **Note:** `src/index.ts` is a Node.js preview server used only for local development (`npm run dev`); it is **not** deployed. The Cloudflare Worker's real entry point, configured in `wrangler.toml`, is `src/worker.ts`.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Cloudflare account with Workers, D1, and R2 enabled
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- An API key from [The Odds API](https://the-odds-api.com/) (for free tips)

### Installation

```bash
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git
cd Tele-bot-cloudflared-main
npm install
cp .env.example .env   # fill in your values
```

```bash
npx wrangler login
```

Set the required secrets (never store these in `wrangler.toml`):

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ADMIN_API_SECRET
npx wrangler secret put ODDS_API_KEY
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

Apply D1 migrations, then deploy:

```bash
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
npx wrangler deploy
```

Register the Telegram webhook:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WORKER_URL>/webhook&secret_token=<WEBHOOK_SECRET>"
```

## 🔐 Environment Variables

Non-secret configuration lives in `wrangler.toml` under `[vars]`; secrets are set with `wrangler secret put` and never committed. See `.env.example` for local development.

| Variable | Description | Secret? |
|---|---|:---:|
| `BOT_TOKEN` | Telegram bot token | ✅ |
| `BOT_USERNAME` | Bot's Telegram username | |
| `WEBHOOK_SECRET` | Telegram webhook validation secret | ✅ |
| `ADMIN_API_SECRET` | Admin dashboard/API auth secret | ✅ |
| `ADMIN_IDS` | Comma-separated Telegram admin user IDs | |
| `ADMIN_CHANNEL_ID` | Channel for deposit/withdrawal admin alerts | |
| `CHANNEL_URL` / `CHANNEL_USERNAME` | Public Telegram channel | |
| `EZCASH_NUMBER` / `MCASH_NUMBER` / `FRIMI_NUMBER` / `IPAY_NUMBER` | Payment agent numbers | |
| `WHATSAPP_NUMBER` | Support contact number | |
| `MIN_TRANSACTION_LKR` / `MAX_TRANSACTION_LKR` | Transaction limits | |
| `XBET_LINK` / `XBET_PROMO_CODE` | 1xBet affiliate link & promo code | |
| `ODDS_API_KEY` | The Odds API key | ✅ |
| `TIPS_CHANNEL_ID` / `TIPS_CHANNEL_URL` | Channel tips are posted to | |
| `TIPS_SPORTS` | Comma-separated sport keys | |
| `TIPS_ODDS_REGIONS` | Odds regions (e.g. `eu`) | |
| `TIPS_MIN_ODDS` / `TIPS_MAX_ODDS` | Odds range filter | |
| `TIPS_HOURS_AHEAD` | Lookahead window for fixtures | |
| `TIPS_PER_SLOT` | Tips published per slot | |
| `TIPS_MAX_FEEDS` | Max odds feeds fetched per run (credit guard) | |
| `TIPS_MIN_CONSENSUS` | Minimum consensus probability | |
| `TIPS_MIN_VALUE` | Minimum value-score threshold | |
| `TIPS_MIN_BOOKMAKERS` | Minimum bookmakers required for consensus | |
| `TIPS_MAX_STALE_HOURS` | Max age before odds are considered stale | |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 S3-compatible credentials (local dev only) | ✅ |
| `R2_BUCKET_NAME` / `R2_PUBLIC_DOMAIN` | R2 bucket config | |

## 🌐 Deployment

### Local deploy
```bash
npm run deploy       # = bash deploy.sh
```

### CI/CD (recommended)
Pushing to `main` runs quality gates (type-check, lint, tests, migration validation, shell-script syntax check) and, if they pass, deploys automatically via `.github/workflows/ci-cd.yml`.

Required GitHub repository secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Cron triggers

| Cron (UTC) | Sri Lanka Time | Purpose |
|---|---|---|
| `0 2 * * *` | 07:30 | R2 log cleanup |
| `30 2 * * *` | 08:00 | Free tips — slot 1 |
| `30 6 * * *` | 12:00 | Free tips — slot 2 |
| `30 12 * * *` | 18:00 | Free tips — slot 3 |
| `15 * * * *` | — | Hourly tips settlement |

## 🎯 Free Tips System

Tips are generated using a **quality-first, market-consensus value model**:

- **No-vig consensus probability** — the median implied probability across multiple bookmakers, with the vig removed
- **Best available price** — the highest odds offered among tracked bookmakers
- **Value score** = `(consensusProbability × bestPrice) − 1`
- **Confidence labels** — High (≥ 0.70), Medium (≥ 0.60), Low (≥ 0.55)
- **Quality filters** — a candidate must clear `TIPS_MIN_CONSENSUS`, `TIPS_MIN_VALUE`, `TIPS_MIN_BOOKMAKERS`, and `TIPS_MAX_STALE_HOURS`; the system does **not** force-fill a slot with a weak pick just to hit `TIPS_PER_SLOT`
- **Free-tier budget** — capped odds regions (`eu`) and feed count (`TIPS_MAX_FEEDS`), with retry and credit-guard logic to stay inside The Odds API's free quota

## 📡 API Endpoints

All routes are handled by `src/apiRoutes.ts` and dispatched from `src/worker.ts`.

| Route | Method | Purpose |
|---|---|---|
| `/health`, `/api/health` | GET/HEAD | Service + configuration health check |
| `/api/status` | GET/HEAD | Lightweight public "is it online" check |
| `/api/telegram/webhook`, `/api/setup-webhook` | GET/POST | Telegram webhook management |
| `/api/tips/stats` | GET/HEAD | Free tips statistics |
| `/api/tips/settle` | POST | Manually trigger tip settlement |
| `/api/cleanup/logs`, `/api/cleanup/logs/status` | POST / GET | R2 log cleanup |
| `/api/admin/status`, `/api/admin/dashboard`, `/api/admin/trends` | GET/HEAD | Admin dashboard data (requires admin auth) |
| `/api/admin/tickets`, `/api/admin/schedule` | GET/POST | Admin ticket & schedule management |
| `/api/admin/receipts`, `/api/receipts/get` | GET/HEAD | Signed receipt retrieval from R2 |
| `/admin`, `/panel` | GET/HEAD | Admin dashboard UI |
| `/og-image.*`, `/favicon.*`, `/logo.*` | GET/HEAD | Generated branding assets |
| any other GET/HEAD | — | Public landing page |
| any other unmatched `/api/*` | — | `404 { ok: false, error: "Not found" }` |
| POST (unmatched by the above) | — | Telegram webhook handler |

## 🧪 Testing

```bash
npm test                    # Vitest — 16 files, 128 tests
npx tsc --noEmit             # Type-check
npm run lint                  # ESLint + type-check
npm run validate:migrations   # Validate D1 migrations are sequential & non-breaking
npm run check                 # lint + test
```

## 🔒 Security

- Telegram webhook requests are validated with a timing-safe secret comparison
- Admin API routes require `ADMIN_API_SECRET` (or `WEBHOOK_SECRET` as fallback)
- Per-IP/user rate limiting on sensitive routes
- Heuristic fraud detection on deposit/withdrawal flows
- All D1 queries are parameterized
- Structured transaction and error audit logs are persisted to R2 for compliance
- Secrets are stored via `wrangler secret put`, never in `wrangler.toml` or source

## 🛠 Troubleshooting

**Free tips aren't posting?**
Check for stuck rows in D1:
```bash
npx wrangler d1 execute fastxbetcash_bot-db --remote --command "SELECT * FROM tip_posts WHERE status='PROCESSING';"
```

**Bot can't post to the channel?**
Confirm the bot is an admin of `@fast_xbet_official_tips`.

**Odds API errors or missing tips?**
Check your quota on The Odds API dashboard (free tier: 500 requests/month) — usage is also logged via the `[Tips] Credit guard` log line.

**Webhook returns 401?**
Confirm `WEBHOOK_SECRET` is set as a Cloudflare secret and matches the value used when registering the webhook with Telegram.

**An `/api/...` URL unexpectedly shows the landing page?**
This was a known routing gap where unmatched `/api/*` paths fell through to the landing page instead of returning a 404. It has been fixed in `src/apiRoutes.ts` — unmatched `/api/*` requests now return `404 { ok: false, error: "Not found" }`.

## 📄 License

MIT — see [LICENSE](./LICENSE).

## 📞 Contact

- Email: lakmalsujith25@gmail.com
- Channel: [@fast_xbet_official_tips](https://t.me/fast_xbet_official_tips)
