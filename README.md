# XBet Telegram Bot (1xBet Fast Cash)

Telegram bot එකක් ලෙස 1xBet affiliate services, financial agent operations සහ quality-first free sports tips සපයන Cloudflare Worker project එකකි.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Free Tips System](#free-tips-system)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Contact](#contact)

## Overview

- **Worker:** `https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev`
- **Bot:** `@fast_1xbetcash_bot`
- **Tips channel:** `@fast_xbet_official_tips`
- **Runtime:** Cloudflare Workers with TypeScript
- **Database:** Cloudflare D1 (`fastxbetcash_bot-db`)
- **Storage:** Cloudflare R2 (`chat-media`)
- **Deployment:** GitHub Actions and Wrangler

The bot runs in webhook mode, handles deposits and withdrawals through configured agent channels, stores operational data in D1, stores media in R2, and publishes automated tips on the configured schedule. Tips are selected using no-vig market consensus, best available odds, value scoring, bookmaker coverage, and freshness filters.

## Features

- Telegram Bot API webhook integration
- 1xBet affiliate deep links and promotion support
- Free sports tips from The Odds API
- eZ Cash, mCash, FriMi, iPay and bank-transfer workflows
- D1-backed admin dashboard and support tickets
- R2 receipt and chat-media storage
- Webhook-secret validation, admin authorization, rate limiting and fraud checks
- Scheduled tips, hourly settlement and daily R2 cleanup
- Sinhala, English and Tamil UI support where configured

## Tech Stack

| Area | Technology |
| --- | --- |
| Runtime | Cloudflare Workers |
| Language | TypeScript |
| Database | Cloudflare D1 (SQLite) |
| Object storage | Cloudflare R2 |
| Bot | Telegram Bot API |
| Odds provider | The Odds API |
| CI/CD | GitHub Actions |
| CLI | Wrangler `4.131.0` |

## Project Structure

```text
src/
├── worker.ts              # Cloudflare Worker entry point
├── index.ts               # Node/local compatibility entry point
├── bot.ts                 # Telegram update handling and bot flows
├── apiRoutes.ts           # Health, admin, tips and storage routes
├── config.ts              # Environment validation and configuration helpers
├── types.ts               # Env and domain types
├── db.ts                  # D1 queries
├── sqlite-d1.ts           # D1/SQLite compatibility helpers
├── tips.ts                # Candidate selection and tip formatting
├── tipsProvider.ts        # The Odds API client
├── tipsSettlement.ts      # Tip settlement and performance tracking
├── landingPage.ts         # Public landing page renderer
├── adminPage.ts           # Admin dashboard renderer
├── storage.ts, r2.ts      # R2/storage helpers
├── security.ts, rateLimit.ts, fraud.ts
├── i18n.ts, utils.ts, logger.ts
├── brandLogo.ts, ogImage.ts
└── logCleanup.ts
migrations/                # Ordered D1 migrations
scripts/                   # Maintenance and setup scripts
.github/workflows/ci-cd.yml
wrangler.toml              # Worker, D1, R2 and cron configuration
validate-migrations.mjs
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A Cloudflare account with Workers, D1 and R2 access
- A Telegram bot token and an Odds API key

### Installation

```bash
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git
cd Tele-bot-cloudflared-main
npm ci
cp .env.example .env
```

Fill local values in `.env`. Do not write `process.env.X` into `.env`; that text is not expanded by dotenv. Local `.env` is ignored by Git and should never be committed.

## Configuration

`wrangler.toml` contains non-secret Worker variables, bindings and cron schedules. Store credentials and tokens as Cloudflare Secrets:

```bash
npx wrangler login
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ADMIN_API_SECRET
npx wrangler secret put ODDS_API_KEY
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

Apply D1 migrations before the first deployment:

```bash
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
```

## Environment Variables

| Variable | Description | Required | Secret |
| --- | --- |:---:|:---:|
| `BOT_TOKEN` | Telegram bot token | Yes | Yes |
| `BOT_USERNAME` | Telegram username | Yes | No |
| `BOT_MODE` | `production` or local mode | Yes | No |
| `USE_POLLING` | Keep `false` for Worker deployment | Yes | No |
| `ADMIN_IDS` | Comma-separated Telegram admin IDs | Yes | No |
| `ADMIN_CHANNEL_ID` | Admin channel/chat ID | No | No |
| `WEBHOOK_SECRET` | Telegram webhook secret | Yes | Yes |
| `ADMIN_API_SECRET` | Admin API authorization secret | Yes | Yes |
| `CHANNEL_URL` | Main Telegram channel URL | Yes | No |
| `CHANNEL_USERNAME` | Main channel username | No | No |
| `EZCASH_NUMBER`, `MCASH_NUMBER`, `FRIMI_NUMBER`, `IPAY_NUMBER` | Payment numbers | No | No |
| `BANK_DETAILS` | Bank payment instructions | No | No |
| `WHATSAPP_NUMBER` | Support contact | No | No |
| `MIN_TRANSACTION_LKR`, `MAX_TRANSACTION_LKR` | Transaction limits | Yes | No |
| `DEPOSIT_INSTRUCTIONS` | Deposit instructions | No | No |
| `XBET_LINK` | Affiliate URL | No | No |
| `XBET_PROMO_CODE` | Affiliate promo code | No | No |
| `ODDS_API_KEY` | The Odds API key | Yes for tips | Yes |
| `TIPS_CHANNEL_ID`, `TIPS_CHANNEL_URL` | Tips destination | Yes for tips | No |
| `TIPS_SPORTS` | Comma-separated sport keys | Yes for tips | No |
| `TIPS_ODDS_REGIONS` | Odds region; use `eu` for free tier | Yes for tips | No |
| `TIPS_MIN_ODDS`, `TIPS_MAX_ODDS` | Decimal odds bounds | Yes | No |
| `TIPS_HOURS_AHEAD` | Maximum event window | Yes | No |
| `TIPS_PER_SLOT` | Maximum tips per cron slot | Yes | No |
| `TIPS_MAX_FEEDS` | Maximum bounded feeds | Yes | No |
| `TIPS_MIN_CONSENSUS` | Minimum consensus probability; default `0.55` | No | No |
| `TIPS_MIN_VALUE` | Minimum value score; default `0.02` | No | No |
| `TIPS_MIN_BOOKMAKERS` | Minimum bookmaker count; default `3` | No | No |
| `TIPS_MAX_STALE_HOURS` | Maximum freshness window; default `6` | No | No |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 credentials | If R2 used | Yes |
| `R2_BUCKET_NAME` | R2 bucket name | If R2 used | No |
| `R2_PUBLIC_DOMAIN` | Optional public media domain | No | No |

See `.env.example` for the complete local template.

## Deployment

### Local/manual deployment

```bash
npm run lint
npm test
npm run validate:migrations
npm run deploy
```

`deploy.sh` checks pinned Wrangler, validates migrations, applies pending remote migrations, deploys the Worker and performs a health check. Local deployment requires confirmation and authenticated Wrangler access.

### CI/CD deployment

Push to `main` to run `.github/workflows/ci-cd.yml`. The workflow runs typecheck/lint, tests and migration validation before `npm run deploy:cf:ci`. Configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub Actions secrets.

### Telegram webhook

The Worker receives Telegram updates at its Worker origin. Set the webhook after deployment:

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev","secret_token":"<WEBHOOK_SECRET>","allowed_updates":["message","callback_query"]}'
```

Alternatively use `/api/setup-webhook?action=set` after setting the required secrets.

### Cron schedules

| Cron (UTC) | Sri Lanka time | Purpose |
| --- | --- | --- |
| `0 2 * * *` | 07:30 | R2 cleanup |
| `30 2 * * *` | 08:00 | Free tips slot 1 |
| `30 6 * * *` | 12:00 | Free tips slot 2 |
| `30 12 * * *` | 18:00 | Free tips slot 3 |
| `15 * * * *` | Hourly | Tip settlement |

## Free Tips System

The tips pipeline uses one bounded odds request per configured sport/feed and does not add extra API calls for scoring:

1. Normalize every bookmaker market and remove invalid prices.
2. Calculate each bookmaker's no-vig fair probability: `(1 / price) / sum(1 / all outcomes)`.
3. Use the median fair probability across bookmakers as consensus probability.
4. Select the highest available decimal price as `bestPrice`.
5. Calculate value: `(consensusProbability * bestPrice) - 1`.
6. Reject weak, invalid, duplicate, or stale candidates.
7. Rank by value, then consensus probability, bookmaker count and lower best price.

Default quality thresholds are consensus `0.55`, value `0.02`, bookmaker count `3`, and stale limit `6` hours. Confidence is High at `0.70+`, Medium at `0.60+`, and Low at the configured minimum. The system posts fewer tips rather than force-filling a slot. Settlement stores the same best available odds used in the published candidate.

Free-tier safeguards remain enabled: one region (`eu`), bounded feeds (`10`), retries with backoff, credit guard and no additional requests for consensus calculations.

## API Endpoints

### Public

- `GET /` — public landing page
- `GET /health` or `/api/health` — health/configuration status
- `GET /api/status` — public Worker availability status
- `GET /api/tips/stats?days=7` — tips performance summary
- `GET /api/tips/click` — tracked affiliate redirect
- `GET /og-image.jpg`, `/og-image.png`, `/og-image.svg` — social preview assets

### Webhook and setup

- `GET /api/setup-webhook` — current Telegram webhook information
- `POST /api/setup-webhook` — register the current Worker webhook
- `POST /webhook` — Telegram update endpoint

### Admin-protected

- `GET /api/admin/status`
- `GET /api/admin/dashboard`
- `GET /api/admin/trends`
- `GET/PATCH /api/admin/tickets`
- `POST /api/admin/schedule`
- `GET /api/admin/receipts`
- `POST /api/tips/settle`
- `POST /api/cleanup/logs`
- `GET /api/cleanup/logs/status`
- `/admin`, `/admin/`, `/panel` — admin dashboard UI

Unknown `/api/*` paths return JSON `404` and do not fall through to the public landing page.

## Testing

```bash
npx tsc --noEmit
npm run lint
npm test
npm run validate:migrations
```

The current baseline suite contains 16 test files and 128 passing tests. Tests cover bot flows, API authorization, tips scoring, settlement, storage, configuration, landing rendering and migrations.

## Security

- Keep `.env` and all tokens out of Git.
- Use Cloudflare Secrets for credentials and API keys.
- Telegram webhook requests use a secret token.
- Admin routes require a constant-time checked admin secret and configured admin ID validation where applicable.
- D1 queries use prepared statements and parameter binding.
- Rate limiting and fraud checks protect sensitive flows.
- Receipts require admin authorization and safe storage-key validation.
- Do not expose admin secrets in client-side code or URLs.

## Troubleshooting

- **Bot does not respond:** check `BOT_TOKEN`, webhook status, Worker logs and that the webhook secret matches.
- **Bot cannot post to the channel:** add the bot as an administrator and verify `TIPS_CHANNEL_ID`.
- **No tips are posted:** check `ODDS_API_KEY`, `TIPS_SPORTS`, quota usage, event freshness and quality thresholds. A slot intentionally posts no tip when no candidate qualifies.
- **Stuck tips:** inspect D1 rows with `status = 'PROCESSING'` and review settlement logs.
- **D1 migration failure:** run `npm run validate:migrations`, then apply migrations with the exact database name.
- **CI deployment failure:** verify `CLOUDFLARE_API_TOKEN` permissions and `CLOUDFLARE_ACCOUNT_ID`.
- **Unknown API route returns HTML:** update to the current `apiRoutes.ts`; unknown `/api/*` paths now return JSON `404`.

Example D1 diagnostic:

```bash
npx wrangler d1 execute fastxbetcash_bot-db --remote \
  --command "SELECT * FROM tip_posts WHERE status='PROCESSING';"
```

## License

MIT

## Contact

- Email: `lakmalsujith25@gmail.com`
- Telegram channel: `@fast_xbet_official_tips`
- Bot: `@fast_1xbetcash_bot`

Betting involves risk. Tips are informational only; never stake more than you can afford to lose.

## Responsible Gambling

This service is intended for adults aged 18+. Follow local laws and use responsible gambling limits. No tip is a guaranteed outcome.
