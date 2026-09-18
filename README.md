# 🇱🇰 Fast xBet Cash — Telegram Bot

Production Telegram bot on **Cloudflare Workers + TypeScript** for 1xBet affiliate cash support, guided deposits/withdrawals, and scheduled free sports tips.

| Item | Value |
|------|--------|
| **Worker** | `https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev` |
| **Bot** | [@fast_1xbetcash_bot](https://t.me/fast_1xbetcash_bot) |
| **Tips channel** | [@fast_xbet_official_tips](https://t.me/fast_xbet_official_tips) |
| **Database** | Cloudflare D1 — `fastxbetcash_bot-db` |
| **Storage** | Cloudflare R2 — `chat-media` |
| **Deploy** | GitHub Actions + Wrangler `4.131.2` |

> **Secrets** belong in Cloudflare Secrets / GitHub Actions secrets — never commit credentials.

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Free tips system](#free-tips-system)
- [API endpoints](#api-endpoints)
- [Testing](#testing)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Contact](#contact)

## Overview

The app runs as a **Cloudflare Worker** with Telegram **webhooks** in production.

- **Production entry:** `src/worker.ts`
- **Local Node preview:** `src/index.ts` (not the Worker deploy entry)
- **Landing page:** public site with live tips cards (`/api/tips/preview`)
- **Admin:** protected dashboard for tickets, trends, and schedules

## Features

- Telegram webhook bot (grammY) with SI / EN / TA
- Automated free tips from [The Odds API](https://the-odds-api.com/) (free-plan budget aware)
- No-vig consensus probability + value scoring
- Three tip slots: **08:00 · 12:00 · 18:00** Sri Lanka time
- Hourly settlement → WON / LOST / VOID on channel posts
- Deposit / withdrawal flows (eZ Cash, mCash, FriMi, iPay, bank)
- R2 receipt storage + scheduled log cleanup
- Card-style tips preview on the landing page
- Rate limits, fraud checks, webhook secret validation
- Vitest suite + ESLint / TypeScript quality gates
- CI/CD with D1 migration validation before deploy

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Cloudflare Workers |
| Language | TypeScript |
| Bot | grammY |
| Database | Cloudflare D1 |
| Object storage | Cloudflare R2 |
| Odds data | The Odds API v4 |
| Tests | Vitest |
| Deploy | Wrangler + GitHub Actions |

## Project structure

```text
.
├── src/                    # Worker + bot application code
│   ├── worker.ts           # Cloudflare Worker entry
│   ├── index.ts            # Local Node preview server
│   ├── bot.ts              # Telegram bot handlers
│   ├── tips.ts             # Free tips selection + channel posts
│   ├── tipsSettlement.ts   # Match results + message edits
│   ├── publicTips.ts       # Public /api/tips/preview + landing cards
│   ├── landingPage.ts      # Public landing HTML
│   ├── apiRoutes.ts        # HTTP API routes
│   ├── db.ts / storage.ts  # D1 access
│   └── ...
├── tests/                  # Vitest unit tests
├── migrations/             # Forward-only D1 SQL migrations
├── public/                 # Static assets (favicon, OG image)
├── scripts/                # env scan, secrets, tips provider check
├── docs/                   # Architecture, operations, free-tips notes
├── deploy.sh               # Production deploy script
├── wrangler.toml           # Worker config, vars, cron, bindings
└── package.json
```

## Getting started

```bash
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git
cd Tele-bot-cloudflared-main
npm ci
cp .env.example .env
```

Edit `.env` for local preview only. Do **not** commit `.env`.

```bash
npx wrangler login
npx wrangler whoami
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
```

## Configuration

### `wrangler.toml`

- Worker name: `xbet-telegram-bot`
- Main: `src/worker.ts`
- Bindings: D1 `DB`, R2 `CHAT_MEDIA`, static `ASSETS` → `./public`
- Non-secret runtime config in `[vars]`
- Secrets (`BOT_TOKEN`, `WEBHOOK_SECRET`, `ADMIN_API_SECRET`, `ODDS_API_KEY`, …) via `wrangler secret put`

### Free-plan tips budget (500 credits / month)

Default vars are tuned for The Odds API free tier:

| Setting | Default | Notes |
|---------|---------|--------|
| `TIPS_MAX_FEEDS` | `3` | Paid odds requests per slot |
| `TIPS_PER_SLOT` | `3` | Tips published per slot |
| `TIPS_ODDS_REGIONS` | `eu` | 1 region → 1 credit × feeds |
| `TIPS_MAX_STALE_HOURS` | `24` | Wider window = more candidates |
| Sports | EPL, UCL, La Liga, NBA, ATP | Rotated by feed cap |

Rough budget: **3 feeds × 3 slots/day ≈ 9 credits/day (~270/month)**.  
`/sports` discovery and `/scores` settlement are quota-free on free plans.

## Environment variables

Canonical template: [`.env.example`](./.env.example).

| Variable | Purpose | Secret? |
|----------|---------|:-------:|
| `BOT_TOKEN` | Telegram Bot API token | ✅ |
| `BOT_USERNAME` | Bot username | |
| `PUBLIC_BASE_URL` | Canonical HTTPS origin (no trailing slash) | |
| `ADMIN_IDS` | Comma-separated Telegram admin user IDs | ⚠️ |
| `ADMIN_CHANNEL_ID` | Admin / audit channel | |
| `WEBHOOK_SECRET` | Telegram webhook secret | ✅ |
| `ADMIN_API_SECRET` | Admin HTTP auth | ✅ |
| `CHANNEL_URL` / `CHANNEL_USERNAME` | Public tips channel | |
| `TIPS_CHANNEL_ID` / `TIPS_CHANNEL_URL` | Automated tips destination | |
| `ODDS_API_KEY` | The Odds API key | ✅ |
| `TIPS_SPORTS` | Sport keys to query | |
| `TIPS_ODDS_REGIONS` | Odds regions (e.g. `eu`) | |
| `TIPS_MAX_FEEDS` / `TIPS_PER_SLOT` | Feed + publish limits | |
| `TIPS_MIN_CONSENSUS` / `TIPS_MIN_VALUE` / `TIPS_MIN_BOOKMAKERS` | Quality filters | |
| `TIPS_MAX_STALE_HOURS` / `TIPS_HOURS_AHEAD` | Time windows | |
| `XBET_LINK` / `XBET_PROMO_CODE` | Affiliate | ⚠️ |
| `EZCASH_NUMBER` / `MCASH_NUMBER` / `FRIMI_NUMBER` / `IPAY_NUMBER` | Payment rails | ⚠️ |
| `BANK_DETAILS` / `WHATSAPP_NUMBER` | Support | ⚠️ |
| `MIN_TRANSACTION_LKR` / `MAX_TRANSACTION_LKR` | Limits | |
| `R2_*` | Local S3-compatible R2 credentials (Node preview) | ✅ |

## Deployment

### Local

```bash
npm run deploy
```

`deploy.sh` validates Wrangler version, migrations, lint/tests, auth, applies remote D1 migrations, deploys the Worker, and runs a health check when possible.

### CI/CD

```text
push → main
  → Quality gates (lint, test, migration validate)
  → deploy:cf:ci
  → D1 migrations
  → Cloudflare Worker deploy
```

Required GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

### Telegram webhook

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev/webhook&secret_token=<WEBHOOK_SECRET>"
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

The bot must be a **channel admin** on `@fast_xbet_official_tips` to post tips.

### Cron (UTC → Sri Lanka UTC+05:30)

| Cron (UTC) | Sri Lanka | Purpose |
|------------|-----------|---------|
| `0 2 * * *` | 07:30 | R2 log cleanup |
| `30 2 * * *` | 08:00 | Free tips slot 1 |
| `30 6 * * *` | 12:00 | Free tips slot 2 |
| `30 12 * * *` | 18:00 | Free tips slot 3 |
| `15 * * * *` | hourly | Tip settlement (edit channel posts) |

## Free tips system

Quality-first pipeline:

1. Query configured sports (capped by `TIPS_MAX_FEEDS`)
2. Collect bookmaker H2H prices
3. No-vig consensus probability + value score
4. Filter by consensus, value, bookmakers, odds range, freshness
5. Post to Telegram channel + store in D1
6. Landing page reads `/api/tips/preview` (card UI)
7. Hourly settlement fetches scores (quota-free) and edits channel messages with ✅ / ❌

If no candidate passes filters, a **fallback** notice is posted (no fake tips).

More detail: [docs/free-tips.md](./docs/free-tips.md).

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Public | Landing page |
| `GET` | `/api/tips/preview` | Public | Sanitized tips feed for the site |
| `GET` | `/api/status` | Public | Health / public status |
| `POST` | `/webhook` | Telegram secret | Bot updates |
| `POST` | `/api/tips/settle` | Admin | Manual settlement run |
| Admin UI / APIs | `/admin…` | `ADMIN_API_SECRET` | Dashboard & ops |

Unmatched `/api/*` routes return JSON `404` (not the landing page).

## Testing

```bash
npm run lint          # ESLint + tsc --noEmit
npm test              # Vitest
npm run check         # lint + test
npm run validate:migrations
```

CI runs the same quality gates on every push to `main`.

## Security

- Webhook secret validated before bot handling
- Timing-safe secret compares
- Admin routes require `ADMIN_API_SECRET`
- Rate limiting + fraud / abuse checks
- Parameterized D1 queries
- Secrets only in Cloudflare / GitHub secrets
- Forward-only versioned migrations
- CodeQL + Dependabot on GitHub

See also [SECURITY.md](./SECURITY.md) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Troubleshooting

### Webhook `401`

```bash
npx wrangler secret put WEBHOOK_SECRET
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

Cloudflare secret must match the Telegram `secret_token`.

### Bot cannot post to the channel

Confirm bot is admin on `@fast_xbet_official_tips` and `TIPS_CHANNEL_ID` is correct.

### Only fallback messages (no real tips)

- Check Odds API remaining credits: `npm run check:tips-provider`
- Review `TIPS_MAX_FEEDS`, sports list, and quality thresholds in `wrangler.toml`
- Inspect Worker logs around cron slots

### Tips stuck in `PROCESSING`

```bash
npx wrangler d1 execute fastxbetcash_bot-db --remote --command \
  "SELECT id, status, slot, created_at FROM tip_posts WHERE status='PROCESSING';"
```

### Local DB issues

`src/index.ts` uses a local SQLite shim under `data/`. DB files are gitignored.

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- Email: `lakmalsujith25@gmail.com`
- Channel: [@fast_xbet_official_tips](https://t.me/fast_xbet_official_tips)
- Bot: [@fast_1xbetcash_bot](https://t.me/fast_1xbetcash_bot)

---

**Repository:** [Lakmal2078/Tele-bot-cloudflared-main](https://github.com/Lakmal2078/Tele-bot-cloudflared-main)
