# Fast xBet Cash — Telegram Bot

A production Telegram bot running on **Cloudflare Workers + TypeScript**. It provides 1xBet affiliate cash support, guided deposit and withdrawal flows, and scheduled free sports tips.

> **Secrets:** Keep credentials, payment details, and affiliate values in Cloudflare Secrets or GitHub Actions secrets. Never commit real tokens, API keys, phone numbers, bank details, or webhook secrets.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Telegram webhook](#telegram-webhook)
- [Local development and tests](#local-development-and-tests)
- [Free tips system](#free-tips-system)
- [Public and protected routes](#public-and-protected-routes)
- [Scheduled jobs](#scheduled-jobs)
- [Deployment and CI/CD](#deployment-and-cicd)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Contact](#contact)

## Features

- Telegram webhook bot built with [grammY](https://grammy.dev/).
- Languages: **Sinhala (SI)**, **English (EN)**, and **Tamil (TA)** across both the Telegram bot and localized web pages (`/`, `/en/`, `/ta/`).
- Public commands: `/start`, `/menu`, `/tips`, `/deposit`, `/confirm_deposit`, `/withdraw`, `/register`, `/referrals`, `/history`, `/dashboard`, `/ticket`, `/safety`, `/id`, `/language`, `/help`, `/cancel`.
- Free sports tips with configurable feeds, quality thresholds, freshness limits, publishing caps, and dynamic sport filter tabs.
- Team & player icon resolution (`src/teamIcons.ts`) combining static crests/flags, D1 `team_icon_cache`, TheSportsDB lookup, and SVG fallback badges.
- Automated tip settlement with **WON / LOST / VOID** outcomes, exponential backoff retries, and audited admin overrides.
- Deposit and withdrawal workflows with magic-byte validated R2 receipt storage and authenticated admin receipt proxy.
- Mobile-responsive protected admin dashboard (`/admin`) with D3/SVG trends, R2 analytics, attribution funnel, support tickets, and a **Telegram BotFather Setup Kit** supporting live **640×360 JPEG photo upload & reset** in R2.
- Security hardening: D1-backed failure-only admin brute-force protection, HMAC-signed `HttpOnly; SameSite=Strict` admin sessions, strict nonce CSP, `X-Frame-Options: DENY` + `frame-ancestors 'none'`, timing-safe credential checks, and parameterized D1 queries.
- Vitest tests plus ESLint and TypeScript checks.

## Tech stack

| Layer | Technology |
|---|---|
| Production runtime | Cloudflare Workers |
| Production entry point | `src/worker.ts` |
| Local Node preview | `src/index.ts` (not used for production) |
| Language | TypeScript |
| Telegram framework | grammY |
| Database | Cloudflare D1 |
| Object storage | Cloudflare R2 |
| Odds provider | The Odds API v4 |
| Tests | Vitest |
| Lint and type checks | ESLint, TypeScript |
| Deployment tooling | Wrangler 4.157.0 (pinned in `package.json`) |
| CI/CD | GitHub Actions |

## Project structure

```text
.
├── .github/                 # CI/CD, CodeQL, Dependabot workflows
├── data/                    # Local preview data directory (database files are gitignored)
├── docs/                    # Architecture, operations, security, and free-tips documentation
├── migrations/              # Forward-only Cloudflare D1 SQL migrations
├── public/                  # Static landing-page and SEO assets
├── scripts/                 # Env scan, secure Cloudflare secret setup, tips-provider check
├── src/
│   ├── worker.ts            # Production Worker entry point (fetch and scheduled handlers)
│   ├── index.ts             # Local Node preview server
│   ├── bot.ts               # Telegram bot setup and handlers
│   ├── cashier.ts           # Deposit and withdrawal transaction processing
│   ├── fraud.ts             # Rate limits and fraud rule evaluation
│   ├── tips.ts              # Free-tip selection and publishing
│   ├── tipsSettlement.ts    # Tip result evaluation and settlement
│   ├── publicTips.ts        # Public tips feed, dynamic sport tabs, and landing-page tip cards
│   ├── teamIcons.ts         # Team/player logo cache (D1 + TheSportsDB + SVG fallback)
│   ├── apiRoutes.ts         # HTTP API routing, BotFather photo upload/reset, and admin endpoints
│   ├── adminPage.ts         # Responsive Admin Dashboard HTML and client controls
│   ├── adminChart.ts        # SVG financial trends chart renderer
│   ├── landingPage.ts       # Public landing page HTML
│   ├── seoContentPages.ts   # Localized SEO guide pages
│   ├── privacyPage.ts       # Privacy policy HTML
│   ├── db.ts                # D1 data access
│   ├── storage.ts           # R2 / S3 object storage access
│   └── ...                  # Other Worker modules
├── tests/                   # Vitest test suite
├── deploy.sh                # Deployment script used by CI
├── package-lock.json        # Deterministic npm lockfile for CI & audit
├── validate-migrations.mjs  # Migration validation
├── wrangler.toml            # Worker name, bindings, vars, assets, and cron triggers
├── .env.example             # Local configuration placeholders
├── CONTRIBUTING.md
├── LICENSE                  # MIT
└── SECURITY.md
```

## Prerequisites

- **Node.js 22** or newer. Confirm the exact version used in `.github/workflows/ci-cd.yml` and match it locally.
- A Cloudflare account with a Worker, a D1 database (`fastxbetcash_bot-db`), and an R2 bucket (`chat-media`).
- A Telegram bot token from **@BotFather**.
- An API key from [The Odds API](https://the-odds-api.com/) for the tips system.
- Repository access if you work with the CI/CD workflow.

## Quick start

Set up a local development environment in a few minutes:

```bash
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git
cd Tele-bot-cloudflared-main
npm ci
cp .env.example .env     # then fill in placeholder values for local testing
npm run check            # lint, typecheck, and tests
npm run dev              # start the local preview server
```

Do not commit `.env`. It is listed in `.gitignore`.

## Configuration

### Non-secret variables (`wrangler.toml` `[vars]`)

| Variable | Purpose | Current value |
|---|---|---|
| `BOT_MODE` | Runtime mode | `production` |
| `USE_POLLING` | Use polling instead of webhooks | `false` |
| `PUBLIC_BASE_URL` | Canonical public HTTPS origin for SEO and webhook URLs | Worker URL |
| `BOT_USERNAME` | Telegram bot username | `fast_1xbetcash_bot` |
| `CHANNEL_URL` / `CHANNEL_USERNAME` | Public tips channel | `@fast_xbet_official_tips` |
| `MIN_TRANSACTION_LKR` / `MAX_TRANSACTION_LKR` | Transaction limits | `1000` / `500000` |
| `R2_BUCKET_NAME` | R2 bucket | `chat-media` |
| `TIPS_SPORTS` | Sports feeds to scan | See [Free tips system](#free-tips-system) |
| `TIPS_ODDS_REGIONS` | Bookmaker regions | `eu` |
| `TIPS_MIN_ODDS` / `TIPS_MAX_ODDS` | Odds window | `1.30` / `3.00` |
| `TIPS_HOURS_AHEAD` | Look-ahead window for events | `72` |
| `TIPS_PER_SLOT` | Tips published per slot | `3` |
| `TIPS_MAX_FEEDS` | Maximum paid feed requests per run | `5` |
| `TIPS_MIN_CONSENSUS` | Minimum no-vig consensus probability | `0.45` |
| `TIPS_MIN_VALUE` | Minimum positive expected value | `0.001` |
| `TIPS_MIN_BOOKMAKERS` | Minimum bookmakers for Tier 1 | `1` |
| `TIPS_MAX_STALE_HOURS` | Maximum odds age | `24` |

Affiliate and payment contact values (`XBET_LINK`, `XBET_PROMO_CODE`, `*_NUMBER`) are intentionally empty in `wrangler.toml`. Set them with `wrangler secret put` or per-environment configuration.

### Cloudflare Secrets

Set sensitive values with `wrangler secret put` or ``npm run secrets:cf` (non-echoing interactive setup with secure secret generation):

| Secret | Purpose |
|---|---|
| `BOT_TOKEN` | Telegram bot token |
| `WEBHOOK_SECRET` | Telegram `secret_token` checked on every webhook request (min 16 chars) |
| `ADMIN_IDS` | Comma-separated numeric Telegram user IDs with admin access |
| `ADMIN_API_SECRET` | Protects `/admin` login and admin API routes (min 24 chars) |
| `ADMIN_CHANNEL_ID` | Channel for admin notifications |
| `ODDS_API_KEY` | The Odds API key |
| `SECURITY_CODE_PEPPER` | HMAC pepper for withdrawal security codes (min 16 chars; required for withdrawals) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_DOMAIN` | R2 access (Node preview and media delivery) |
| `TIPS_CHANNEL_ID` | Channel ID for free tips publishing |
| `BANK_DETAILS`, `BOC_DETAILS`, `PEOPLES_DETAILS`, `SAMPATH_DETAILS`, `LOLC_DETAILS` | Bank deposit details |
| `EZCASH_NUMBER`, `MCASH_NUMBER`, `FRIMI_NUMBER`, `IPAY_NUMBER`, `WHATSAPP_NUMBER` | Payment and contact numbers |
| `XBET_LINK`, `XBET_PROMO_CODE` | Affiliate values |

See [`.env.example`](./.env.example) for the full list of local placeholders.

## Telegram webhook

Replace the placeholders with your values. Never paste a real token into a public issue or document.

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<PUBLIC_BASE_URL>/webhook&secret_token=<WEBHOOK_SECRET>"
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

The Worker rejects webhook requests with a missing or wrong secret before any bot processing.

## Local development and tests

```bash
npm run dev              # tsx watch on the local Node preview (src/index.ts)
npm run build            # bundle to dist/server.cjs
npm start                # run the built preview server
```

Quality checks:

```bash
npm run lint                  # ESLint and TypeScript
npm test                      # Vitest suite
npm run validate:migrations   # Validate sequential D1 SQL migrations
npm run audit:deps            # Production dependency vulnerability audit
npm run check                 # lint + tests
```

To check that the Worker bundle builds without deploying:

```bash
npx wrangler deploy --dry-run --outdir /tmp/wrangler-check
```

Do not run production deployment or remote D1 commands to validate local changes.

## Free tips system

The Worker publishes free tips to the channel three times a day at **08:00, 12:00, and 18:00 Sri Lanka time** (02:30, 06:30, and 12:30 UTC).

Configured sports (`TIPS_SPORTS`):

```text
auto:soccer, auto:cricket, auto:basketball, auto:tennis, auto:table_tennis, auto:esports, soccer_epl, cricket_international_t20
```

**Quota estimate:** With `TIPS_MAX_FEEDS=5` and 3 slots per day, the maximum is about 15 paid odds requests per day, or about 450 per month. The free plan of The Odds API allows 500 requests per month. Zero-credit calls (`/v4/sports` discovery and `/v4/sports/.../scores` settlement checks) do not count toward this limit.

Selection and publishing pipeline:

1. **Sport discovery:** Validates active sports using the zero-credit `/v4/sports` endpoint. Sports are interleaved by category (soccer, cricket, basketball, tennis, table tennis, esports) so one sport does not use all feed slots.
2. **Odds collection:** Collects head-to-head decimal odds from the configured regions.
3. **Consensus and value:** Removes bookmaker margin (no-vig) to estimate consensus probability and computes expected value against the best available price.
4. **Candidate selection in tiers:**
   - **Tier 1 (strict):** Requires minimum consensus, minimum value, odds in the configured window, and data no older than `TIPS_MAX_STALE_HOURS`.
   - **Tier 2 (quality fallback):** Accepts any single verified bookmaker price with positive value.
   - **Tier 3 (wider odds):** Widens the odds window to capture high-probability favourites.
   - **Tier 4 (deduplication fallback):** Selects the best upcoming candidate even if it was scheduled before, so the channel stays active.
5. **Delivery:** Posts formatted tips in Sinhala and English to `TIPS_CHANNEL_ID`, falling back to `CHANNEL_USERNAME` if the ID is not set. If no event passes any tier, the bot posts a notice with a scan summary.
6. **Settlement:** Stores tip records and slot keys in D1. The maintenance cron checks match results every five minutes, updates D1, and edits channel posts with the final WIN, LOSS, or VOID outcome.

Further provider notes are in [`docs/free-tips.md`](./docs/free-tips.md).

## Public and protected routes

### Public

| Method | Path | Description |
|---|---|---|
| GET, HEAD | `/`, `/en/`, `/ta/` | Localized landing pages (Sinhala default, English, Tamil) |
| GET, HEAD | `/privacy`, `/privacy-policy`, `/legal/privacy` | Privacy policy |
| GET, HEAD | `/robots.txt` | Robots policy generated from `PUBLIC_BASE_URL` |
| GET, HEAD | `/sitemap.xml` | XML sitemap with `hreflang` alternates and SEO guides |
| GET, HEAD | `/api/tips/preview` | Sanitized public tips feed |
| GET, HEAD | `/api/status` | Lightweight public status |
| GET, HEAD | `/health` | Configuration-oriented health response (see [`docs/OPERATIONS.md`](./docs/OPERATIONS.md)) |
| GET, HEAD | `/bot-description-640x360.jpg`, `/api/bot/description-photo` | BotFather 640×360 description photo (Worker-first; serves custom R2 image when uploaded, else default asset) |
| GET, HEAD | `/og-image.jpg`, `/og-image.png`, `/og-image.svg` | OpenGraph preview images |
| GET | `/go/tip/:id` | Allowlisted tip click redirect & attribution logger |
| POST | `/api/analytics/event` | Rate-limited web conversion beacon |

### Bot and protected operations

| Method | Path | Description |
|---|---|---|
| POST | `/webhook` | Telegram webhook (requires `X-Telegram-Bot-Api-Secret-Token`) |
| POST | `/admin/login`, `/admin/logout` | Exchanges `ADMIN_API_SECRET` for signed `HttpOnly` session cookie / clears cookie |
| GET, HEAD | `/admin`, `/panel` | Protected Admin UI (login form when unauthenticated; full dashboard after sign-in) |
| POST | `/api/tips/settle` | Admin trigger for tip settlement |
| POST | `/api/admin/tips/settlement/override` | Manual historical tip settlement override (requires an authenticated admin session or `ADMIN_API_SECRET` via `Authorization: Bearer` / `X-Admin-Secret`; audit actor is recorded as `shared-admin-secret`) |
| POST, DELETE | `/api/admin/bot/description-photo` | Upload (auto-cropped 640×360 JPEG/PNG/WebP) or reset custom BotFather description photo in R2 |
| GET, HEAD | `/api/admin/dashboard`, `/api/admin/status` | Admin operations dashboard & status |
| GET, HEAD | `/api/admin/trends`, `/api/admin/r2-analytics` | Financial trends & R2 storage analytics |
| GET | `/api/admin/receipts` | Authenticated proxy for private R2 deposit receipts |
| GET, POST | `/api/admin/tickets`, `/api/admin/schedule` | Support ticket management & scheduled post drafts |

Unknown `/api/*` routes return a JSON 404.

## Scheduled jobs

All schedules are defined in `wrangler.toml` in UTC.

| Cron (UTC) | Sri Lanka time | Job |
|---|---|---|
| `0 2 * * *` | 07:30 | R2 log cleanup |
| `30 2 * * *` | 08:00 | Free tips, slot 1 |
| `30 6 * * *` | 12:00 | Free tips, slot 2 |
| `30 12 * * *` | 18:00 | Free tips, slot 3 |
| `*/5,7,22,37,52 * * * *` | Every 5 minutes | Tip settlement every 5 minutes; health checks additionally at :07, :22, :37, :52 |

Jobs must be safe to retry. A scheduled run can execute more than once.

## Deployment and CI/CD

Production deployment runs through GitHub Actions:

```text
pull request → review
push to main → quality checks → migration validation → production deploy
```

Merging into `main` is a production deployment. Test changes on a branch first. Routine development should not run production deploy commands locally. The canonical CI command is `npm run deploy:cf:ci`.

Before a release, run:

```bash
npm ci
npm run lint
npm test
npm run validate:migrations
bash -n deploy.sh
npm audit --omit=dev --audit-level=high
```

Database migrations are forward-only. A rollback must remain compatible with the current schema. For the full procedure, see [`docs/OPERATIONS.md`](./docs/OPERATIONS.md).

## Security

- Keep Telegram tokens, webhook secrets, admin secrets, Odds API keys, payment details, affiliate values, and R2 credentials out of source control.
- Validate the Telegram webhook secret before processing any update.
- Use timing-safe SHA-256 + `timingSafeEqual` comparisons for credentials.
- Protect `/admin` and admin APIs with signed `HttpOnly; SameSite=Strict` session cookies, optional IP allowlisting (`ADMIN_IP_ALLOWLIST`), and D1-backed failure-only brute-force rate limiting.
- Enforce strict nonce-based CSP (no inline `onclick` handlers) and anti-clickjacking headers (`X-Frame-Options: DENY`, `frame-ancestors 'none'`) on admin HTML pages.
- Validate magic bytes and file size bounds on receipt and BotFather photo uploads before writing to R2.
- Use parameterized D1 queries only and keep D1 migrations forward-only and versioned.
- Rotate any credential that may have been exposed. See [`docs/SECRETS_ROTATION.md`](./docs/SECRETS_ROTATION.md).
- Report vulnerabilities as described in [`SECURITY.md`](./SECURITY.md).

Further reading: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/SECURITY_TOP10.md`](./docs/SECURITY_TOP10.md).

## Troubleshooting

**Webhook returns 401.** The Cloudflare `WEBHOOK_SECRET` does not match the `secret_token` set on Telegram. Check the webhook status:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

**The bot cannot post to the tips channel.** Confirm the bot is an administrator of the channel with posting rights, and that `TIPS_CHANNEL_ID` or `CHANNEL_USERNAME` is correct.

**Only fallback notices are published.** Check the Odds API key and quota, the sports list, and the quality thresholds (`TIPS_MIN_CONSENSUS`, `TIPS_MIN_VALUE`, `TIPS_MAX_STALE_HOURS`).

**Tips stay pending.** Check the Worker logs and the five-minute settlement cron. A pending result can be correct if the event has not finished or the score data is not available yet.

**Local preview database errors.** The preview stores data in `data/`. Keep `data/.gitkeep` tracked and delete local database files if they become inconsistent.

## License

MIT. See [`LICENSE`](./LICENSE).

## Contact

- Email: `lakmalsujith25@gmail.com`
- Tips channel: [`@fast_xbet_official_tips`](https://t.me/fast_xbet_official_tips)
- Bot: [`@fast_1xbetcash_bot`](https://t.me/fast_1xbetcash_bot)
