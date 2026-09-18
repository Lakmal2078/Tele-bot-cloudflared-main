# 🇱🇰 XBet Telegram Bot (1xBet Fast Cash)

Production-oriented Telegram bot built on **Cloudflare Workers + TypeScript** for 1xBet affiliate services, financial-agent workflows, and scheduled free sports tips.

- **Worker:** `https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev`
- **Bot:** `@fast_1xbetcash_bot`
- **Tips channel:** `@fast_xbet_official_tips`
- **Database:** Cloudflare D1 — `fastxbetcash_bot-db`
- **Storage:** Cloudflare R2 — `chat-media`
- **Deployment:** GitHub Actions + Wrangler `4.131.0`

> **Important:** Credentials must be supplied through Cloudflare Secrets / GitHub Actions secrets and must never be committed.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Free Tips System](#-free-tips-system)
- [API Endpoints](#-api-endpoints)
- [Testing](#-testing)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [Contact](#-contact)

## 📌 Overview

The application runs as a **Cloudflare Worker** and uses Telegram webhook delivery in production. It provides Telegram bot workflows, automated free sports tips, protected admin operations, D1 persistence, R2 storage, and scheduled jobs.

The production Worker entry point is `src/worker.ts`. `src/index.ts` is a separate Node.js local-preview server and is **not** the Cloudflare deployment entry point.

## ✨ Features

- 🤖 Telegram webhook bot powered by grammY
- 🎯 Automated free tips from The Odds API
- 📈 Market-consensus/no-vig probability and value scoring
- ⏱️ Three scheduled free-tip slots: 08:00, 12:00, 18:00 Sri Lanka time
- 🧾 Hourly tip settlement and Telegram result updates
- 💰 Deposit/withdrawal workflows with eZ Cash, mCash, FriMi, iPay and bank details
- 📊 Protected admin dashboard, charts, trends, tickets and schedules
- 🖼️ Cloudflare R2 media/receipt storage
- 🔒 Webhook secret validation, timing-safe comparisons, rate limiting and fraud checks
- 🌍 Sinhala / English / Tamil support
- 🧹 Scheduled R2 audit-log retention cleanup
- 🧪 Vitest regression/unit suite plus TypeScript/ESLint quality gates
- 🚀 GitHub Actions CI/CD with D1 migration validation before deployment

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers |
| Language | TypeScript |
| Telegram | grammY + Telegram Bot API |
| Database | Cloudflare D1 (SQLite) |
| Object storage | Cloudflare R2 |
| Sports data | The Odds API |
| Tests | Vitest |
| Lint/type-check | ESLint + TypeScript |
| CI/CD | GitHub Actions |
| CLI | Wrangler `4.131.0` (exactly pinned) |

## 📁 Project Structure

```text
.
├── .github/workflows/ci-cd.yml   # CI quality gates + production deployment
├── migrations/                   # Versioned D1 migrations (0001–0007)
├── scripts/
│   ├── check-tips-provider.mjs   # Odds API/quota/feed diagnostic
│   ├── scan-env.mjs              # Environment consistency scanner
│   └── setup-cf-secrets.sh       # Cloudflare secret helper
├── src/
│   ├── adminChart.ts             # Admin chart rendering
│   ├── adminPage.ts              # Protected admin UI
│   ├── apiRoutes.ts              # HTTP/API routing
│   ├── bot.ts                    # Telegram bot handlers/conversations
│   ├── brandLogo.ts              # Branding assets
│   ├── config.ts                 # Environment validation/config helpers
│   ├── db.ts                     # D1 data access
│   ├── fraud.ts                  # Fraud/abuse checks
│   ├── i18n.ts                   # Sinhala/English/Tamil translations
│   ├── index.ts                  # Node.js local preview server only
│   ├── landingPage.ts            # Server-rendered landing page
│   ├── logCleanup.ts             # R2 log-retention cleanup
│   ├── logger.ts                 # Structured audit/error logging
│   ├── ogImage.ts                # Open Graph image assets
│   ├── r2.ts                     # R2 helpers
│   ├── rateLimit.ts              # Rate-limiting helpers
│   ├── security.ts               # Security headers/auth helpers
│   ├── sqlite-d1.ts              # Local D1-compatible SQLite shim
│   ├── storage.ts                # Storage abstraction
│   ├── tipsProvider.ts           # The Odds API integration
│   ├── tipsSettlement.ts         # Tip result settlement
│   ├── tips.ts                   # Tip selection/publishing
│   ├── types.ts                  # Shared Worker/env types
│   ├── utils.ts                  # Shared utilities
│   └── worker.ts                 # Cloudflare Worker entry point
├── tests/                        # Vitest tests (currently 16 files / 129 tests)
├── .env.example                  # Local environment template
├── .gitignore                    # Secrets/build/runtime exclusions
├── deploy.sh                     # Production deployment script
├── eslint.config.mjs             # ESLint configuration
├── package.json                  # Scripts/dependencies
├── package-lock.json             # Locked npm dependency graph
├── validate-migrations.mjs       # D1 migration safety validator
└── wrangler.toml                 # Worker, D1, R2 and cron configuration
```

> `landingPage.ts` is the source of the landing page. There is no separate `landing.html` template in the current production tree.

## 🚀 Getting Started

### Prerequisites

- Node.js 22 LTS recommended
- npm
- Cloudflare account with Workers, D1 and R2
- Telegram bot created through BotFather
- The Odds API account/key if free tips are enabled

### Installation

```bash
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git
cd Tele-bot-cloudflared-main
npm ci
cp .env.example .env
```

Fill `.env` for local Node.js preview/testing. Do **not** commit `.env`.

### Cloudflare authentication

```bash
npx wrangler login
npx wrangler whoami
```

### D1 migrations

```bash
npx wrangler d1 migrations list fastxbetcash_bot-db --remote
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
```

The deployment script also validates and applies pending migrations before deploying the Worker.

## ⚙️ Configuration

### `wrangler.toml`

Production configuration includes:

- `name = "xbet-telegram-bot"`
- `main = "src/worker.ts"`
- compatibility date `2026-09-09`
- `nodejs_compat`
- D1 binding `DB`
- R2 binding `CHAT_MEDIA`
- five cron triggers

Non-secret runtime configuration belongs in `[vars]`. Set `PUBLIC_BASE_URL` to the real public HTTPS origin without a trailing slash; production refuses to render the landing page when it is missing or invalid. Credentials such as `BOT_TOKEN`, `WEBHOOK_SECRET`, `ADMIN_API_SECRET`, and `ODDS_API_KEY` must be Cloudflare Secrets instead.

### `.env`

`.env` is intended for local Node.js preview and tooling. `.gitignore` ignores `.env` and all `.env.*` files except `.env.example`.

## 🔐 Environment Variables

The canonical variable template is `.env.example`.

| Variable | Purpose | Secret? |
|---|---|:---:|
| `BOT_TOKEN` | Telegram Bot API token | ✅ |
| `BOT_USERNAME` | Telegram bot username | |
| `BOT_MODE` | Local bot mode | |
| `PUBLIC_BASE_URL` | Trusted canonical/SEO origin, e.g. `https://your-real-domain` | |
| `USE_POLLING` | Enable local long polling | |
| `ADMIN_IDS` | Comma-separated Telegram admin IDs | ⚠️ |
| `ADMIN_CHANNEL_ID` | Admin/audit notification channel | |
| `WEBHOOK_SECRET` | Telegram webhook secret token | ✅ |
| `ADMIN_API_SECRET` | Admin HTTP authentication secret | ✅ |
| `CHANNEL_URL` / `CHANNEL_USERNAME` | Public Telegram channel | |
| `EZCASH_NUMBER` / `MCASH_NUMBER` / `FRIMI_NUMBER` / `IPAY_NUMBER` | Payment destinations | ⚠️ |
| `BANK_DETAILS` | Bank-payment instructions | ⚠️ |
| `WHATSAPP_NUMBER` | Support contact | ⚠️ |
| `MIN_TRANSACTION_LKR` / `MAX_TRANSACTION_LKR` | Transaction limits | |
| `DEPOSIT_INSTRUCTIONS` | Deposit instructions | |
| `XBET_LINK` / `XBET_PROMO_CODE` | Affiliate configuration | ⚠️ |
| `ODDS_API_KEY` | The Odds API credential | ✅ |
| `TIPS_CHANNEL_ID` / `TIPS_CHANNEL_URL` | Automated tips destination | |
| `TIPS_SPORTS` | Sport keys to query | |
| `TIPS_ODDS_REGIONS` | Odds regions, e.g. `eu` | |
| `TIPS_MIN_ODDS` / `TIPS_MAX_ODDS` | Odds filter | |
| `TIPS_HOURS_AHEAD` | Fixture look-ahead window | |
| `TIPS_PER_SLOT` | Maximum tips per slot | |
| `TIPS_MAX_FEEDS` | Feed/request guard | |
| `TIPS_MIN_CONSENSUS` | Minimum consensus probability | |
| `TIPS_MIN_VALUE` | Minimum value score | |
| `TIPS_MIN_BOOKMAKERS` | Minimum bookmaker count | |
| `TIPS_MAX_STALE_HOURS` | Maximum odds age | |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Local S3-compatible R2 credentials | ✅ |
| `R2_BUCKET_NAME` / `R2_PUBLIC_DOMAIN` | R2 configuration | |

## 🌐 Deployment

### Local production deployment

```bash
npm run deploy
```

The root `deploy.sh` checks prerequisites, verifies the exact Wrangler version, validates migrations, runs lint/tests, verifies Cloudflare authentication, applies remote D1 migrations, deploys the Worker, and performs a post-deployment health check when a Worker URL can be detected.

### CI/CD deployment

```text
push to main
    ↓
quality gates
    ├─ npm ci
    ├─ npm run lint
    ├─ npm test
    ├─ npm run validate:migrations
    └─ bash -n deploy.sh
    ↓
npm run deploy:cf:ci
    ↓
D1 migrations
    ↓
Cloudflare Worker deploy
```

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The latest `main` workflow run for commit `7fc513131de4a5d671ee5ef04ce2344eb82cabed` completed successfully on 2026-09-16.

### Telegram webhook

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev/webhook&secret_token=<WEBHOOK_SECRET>"
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

The bot must have administrator rights in the tips channel if it is expected to publish channel posts.

### Cron schedule

Cloudflare cron expressions are UTC. Sri Lanka is UTC+05:30.

| Cron (UTC) | Sri Lanka time | Purpose |
|---|---:|---|
| `0 2 * * *` | 07:30 | R2 log cleanup |
| `30 2 * * *` | 08:00 | Free tips slot 1 |
| `30 6 * * *` | 12:00 | Free tips slot 2 |
| `30 12 * * *` | 18:00 | Free tips slot 3 |
| `15 * * * *` | hourly | Tip settlement |

## 🎯 Free Tips System

The tips engine is intentionally **quality-first** rather than quantity-first.

### Selection model

1. Query configured sports/feeds from The Odds API.
2. Collect bookmaker prices for eligible markets.
3. Remove bookmaker margin to estimate no-vig implied probabilities.
4. Build a market-consensus probability from multiple bookmakers.
5. Select the best available price.
6. Calculate `valueScore = (consensusProbability × bestPrice) − 1`.
7. Reject stale or low-quality candidates.
8. Publish only candidates that pass configured thresholds; the system does not force-fill weak selections merely to reach `TIPS_PER_SLOT`.

### Current thresholds

| Setting | Current value |
|---|---:|
| `TIPS_MIN_CONSENSUS` | `0.55` |
| `TIPS_MIN_VALUE` | `0.02` |
| `TIPS_MIN_BOOKMAKERS` | `3` |
| `TIPS_MAX_STALE_HOURS` | `6` |
| `TIPS_MIN_ODDS` | `1.40` |
| `TIPS_MAX_ODDS` | `2.50` |
| `TIPS_HOURS_AHEAD` | `48` |
| `TIPS_PER_SLOT` | `3` |
| `TIPS_MAX_FEEDS` | `10` |
| `TIPS_ODDS_REGIONS` | `eu` |

Confidence labels are model classifications, not guarantees of a sporting outcome.

## 📡 API Endpoints

| Endpoint | Method | Access / purpose |
|---|---|---|
| `/health` / `/api/health` | GET/HEAD | Configuration/service health |
| `/api/status` | GET/HEAD | Public availability check |
| `/webhook` | POST | Telegram webhook |
| `/api/telegram/webhook` | GET/POST | Webhook setup/status helper |
| `/api/setup-webhook` | GET/POST | Webhook setup helper |
| `/api/tips/stats` | GET/HEAD | Tips statistics |
| `/api/tips/performance` | GET/HEAD | Tips performance/click statistics |
| `/api/tips/settle` | POST | Manual settlement trigger |
| `/api/cleanup/logs` | POST | R2 log cleanup |
| `/api/cleanup/logs/status` | GET | Cleanup status |
| `/api/admin/status` | GET/HEAD | Protected admin status |
| `/api/admin/dashboard` | GET/HEAD | Protected dashboard data |
| `/api/admin/trends` | GET/HEAD | Protected financial trends |
| `/api/admin/tickets` | GET/POST | Protected support-ticket operations |
| `/api/admin/schedule` | GET/POST | Protected scheduled-post operations |
| `/api/admin/receipts` | GET/HEAD | Protected receipt operations |
| `/api/receipts/get` | GET/HEAD | Signed receipt retrieval |
| `/admin` / `/panel` | GET/HEAD | Protected admin UI/login |
| `/og-image.*` / `/favicon.*` / `/logo.*` | GET/HEAD | Generated branding assets |
| unmatched `/api/*` | any | JSON `404` response |
| other GET/HEAD | GET/HEAD | Public landing page |

## 🧪 Testing

Current repository verification includes **16 test files / 129 tests**. The latest `main` CI run completed successfully.

```bash
npx tsc --noEmit
npm run lint
npm test
npm run validate:migrations
bash -n deploy.sh
```

Or:

```bash
npm run check
```

Before production deployment:

```bash
git status --short
git ls-files | grep -E '(^|/)(\.env($|\.)|dist/|node_modules/|\.wrangler/)' || true
```

## 🔒 Security

- Telegram webhook secret is validated before bot processing.
- Secret comparisons use timing-safe comparison helpers.
- Admin endpoints require `ADMIN_API_SECRET` authentication.
- Admin UI does not expose financial/operational dashboard data to unauthenticated visitors.
- Sensitive operations use rate limiting and fraud/abuse checks.
- D1 queries use prepared/parameterized statements.
- Secrets belong in Cloudflare Secrets, not `wrangler.toml` or source code.
- `.env`, database files, build output and Wrangler caches are ignored by Git.
- CI blocks migration/deployment safety bypass flags.
- D1 schema changes are maintained as forward-only versioned migrations.

## 🛠 Troubleshooting

### Bot webhook returns `401`

```bash
npx wrangler secret put WEBHOOK_SECRET
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

The secret stored in Cloudflare must match the secret registered with Telegram.

### Bot cannot post tips to the channel

Confirm that the bot is an administrator of `@fast_xbet_official_tips` and that `TIPS_CHANNEL_ID` points to the correct channel.

### Tips are stuck in `PROCESSING`

```bash
npx wrangler d1 execute fastxbetcash_bot-db --remote --command "SELECT * FROM tip_posts WHERE status='PROCESSING';"
```

Inspect Worker logs before changing rows manually.

### Odds API quota is exhausted

```bash
npm run check:tips-provider
```

Keep `TIPS_MAX_FEEDS`, `TIPS_SPORTS`, and `TIPS_ODDS_REGIONS` within the intended request budget.

### `/api/...` unexpectedly returns the landing page

Unmatched `/api/*` requests are designed to return JSON `404`. Verify that the deployed Worker matches `src/apiRoutes.ts` and that the latest CI/CD deployment completed successfully.

### Local preview database problems

`src/index.ts` uses the local D1-compatible SQLite shim and stores the database under `data/` by default. Local database files are intentionally ignored by Git.

## 📄 License

MIT — see [LICENSE](./LICENSE).

## 📞 Contact

- Email: `lakmalsujith25@gmail.com`
- Telegram channel: `@fast_xbet_official_tips`

---

**Repository:** `Lakmal2078/Tele-bot-cloudflared-main`
