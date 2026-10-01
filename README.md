# 🇱🇰 Fast xBet Cash — Telegram Bot

Production Telegram bot on **Cloudflare Workers + TypeScript** for 1xBet affiliate cash support, guided deposits/withdrawals, and scheduled free sports tips.

> **Secrets:** keep credentials and partner/payment-sensitive values in Cloudflare Secrets or GitHub Actions secrets. Never commit real tokens, API keys, payment details, or webhook secrets.

## Table of contents

- [Features](#features)
- [Landing page and public routes](#landing-page-and-public-routes)
- [Tech stack](#tech-stack)
- [Project tree](#project-tree)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Telegram webhook](#telegram-webhook)
- [Local development and tests](#local-development-and-tests)
- [Free tips system](#free-tips-system)
- [API endpoints](#api-endpoints)
- [Deployment and CI/CD](#deployment-and-cicd)
- [Cron schedule](#cron-schedule)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)
- [Contact](#contact)

## Features

- Telegram webhook bot powered by grammY.
- User-facing languages: **Sinhala (SI), English (EN), and Tamil (TA)**.
- Public bot commands:
  `/start`, `/menu`, `/tips`, `/deposit`, `/confirm_deposit`, `/withdraw`, `/register`, `/referrals`, `/history`, `/dashboard`, `/ticket`, `/safety`, `/id`, `/language`, `/help`, `/cancel`.
- Free sports tips with configurable feed, quality, freshness, and publishing limits.
- Automated tip settlement with **WON / LOST / VOID** outcomes.
- Deposit and withdrawal workflows with receipt storage.
- Protected admin dashboard for operational, support, trend, and tip-settlement views.
- Cloudflare D1 for application data and R2 for object storage.
- Rate limiting, webhook-secret validation, timing-safe secret comparisons, and parameterized D1 queries.
- Vitest and ESLint/TypeScript quality checks.

## Landing page and public routes

The public site is rendered by `src/landingPage.ts` and uses the repository's `public/` static assets.

| Method | Route | Purpose |
|---|---|---|
| GET/HEAD | `/` | Public landing page |
| GET/HEAD | `/privacy` | Privacy policy |
| GET/HEAD | `/privacy-policy` | Privacy policy alias |
| GET/HEAD | `/legal/privacy` | Privacy policy alias |
| GET/HEAD | `/robots.txt` | Robots directives generated from `PUBLIC_BASE_URL` |
| GET/HEAD | `/sitemap.xml` | Sitemap generated from `PUBLIC_BASE_URL` |
| GET/HEAD | `/api/tips/preview` | Sanitized public tips feed |
| GET/HEAD | `/api/status` | Public worker status |

The canonical public origin is configured with `PUBLIC_BASE_URL`.

## Tech stack

| Layer | Technology |
|---|---|
| Production runtime | Cloudflare Workers |
| Production entry | `src/worker.ts` |
| Local Node preview | `src/index.ts` |
| Language | TypeScript |
| Telegram bot | grammY |
| Database | Cloudflare D1 |
| Object storage | Cloudflare R2 |
| Odds provider | The Odds API v4 |
| Tests | Vitest |
| Lint/type checking | ESLint + TypeScript |
| Deployment tooling | Wrangler **4.141.0** (pinned in `package.json`) |
| CI/CD | GitHub Actions |

## Project tree

After this cleanup, the relevant repository structure is:

```text
.
├── .github/                 # CI/CD, CodeQL, Dependabot, and repository automation
├── data/
│   └── .gitkeep             # Keeps the local-preview data directory in git
├── docs/                    # Architecture, hardening, security, and free-tips documentation
├── migrations/              # Forward-only Cloudflare D1 SQL migrations
├── public/                  # Static landing-page and SEO assets
├── scripts/                 # Environment scans, Cloudflare secret setup, and tips-provider checks
├── src/
│   ├── worker.ts            # Production Cloudflare Worker entry
│   ├── index.ts             # Local Node preview server; not the production deploy entry
│   ├── bot.ts               # Telegram bot setup and handlers
│   ├── tips.ts              # Free-tip selection and scheduled publishing
│   ├── tipsSettlement.ts    # Tip-result evaluation and settlement
│   ├── landingPage.ts       # Public landing-page HTML
│   ├── privacyPage.ts       # Privacy-policy HTML
│   ├── publicTips.ts        # Public tips feed and landing-page tip cards
│   ├── apiRoutes.ts         # HTTP/API routing and admin endpoints
│   ├── db.ts                # D1 data access
│   ├── storage.ts           # R2/storage access
│   └── ...                  # Other Worker modules
├── tests/                   # Vitest test suite
├── deploy.sh                # Production deployment script used by CI
├── package.json             # Scripts and dependencies
├── package-lock.json        # Locked dependency tree
├── tsconfig.json            # TypeScript configuration
├── wrangler.toml            # Worker bindings, vars, assets, and cron triggers
├── .env.example             # Local configuration placeholders
├── CONTRIBUTING.md          # Contribution guidance
├── LICENSE                  # MIT license
└── SECURITY.md              # Security policy
```

The repository also contains the embedded asset modules used by `src/apiRoutes.ts`, including the OG image, brand logo, favicon, and bot-description image data.

## Prerequisites

- **Node.js 22**.
- A Cloudflare account with the required Worker, D1, and R2 resources.
- A Telegram bot token created through **@BotFather**.
- Repository access if you are working with the CI/CD deployment workflow.

Install dependencies with:

```bash
npm ci
```

For local configuration, copy the placeholder file:

```bash
cp .env.example .env
```

Do not commit `.env`.

## Configuration

### `wrangler.toml` variables

The committed `[vars]` section contains non-secret runtime configuration. Important values include:

| Variable | Value/source |
|---|---|
| `BOT_MODE` | `production` |
| `USE_POLLING` | `false` |
| `PUBLIC_BASE_URL` | Public HTTPS Worker origin |
| `BOT_USERNAME` | Telegram bot username |
| `CHANNEL_URL` / `CHANNEL_USERNAME` | Public tips-channel identity |
| `MIN_TRANSACTION_LKR` / `MAX_TRANSACTION_LKR` | Transaction limits |
| `TIPS_SPORTS` | `auto:soccer,auto:cricket,auto:basketball,auto:tennis,auto:table_tennis,auto:esports` |
| `TIPS_ODDS_REGIONS` | `eu` |
| `TIPS_MIN_ODDS` / `TIPS_MAX_ODDS` | `1.30` / `3.00` |
| `TIPS_HOURS_AHEAD` | `72` |
| `TIPS_PER_SLOT` | `3` |
| `TIPS_MAX_FEEDS` | `4` |
| `TIPS_MIN_CONSENSUS` | `0.42` |
| `TIPS_MIN_VALUE` | `0.003` |
| `TIPS_MIN_BOOKMAKERS` | `2` |
| `TIPS_MAX_STALE_HOURS` | `24` |

Do not edit bindings, database IDs, asset configuration, cron schedules, or other `wrangler.toml` values as part of routine cleanup.

### Cloudflare Secrets

Sensitive values are provisioned separately. The repository's `scripts/setup-cf-secrets.sh` is the canonical list/setup helper.

Examples include:

- `BOT_TOKEN`
- `ADMIN_IDS`
- `WEBHOOK_SECRET`
- `ADMIN_API_SECRET`
- `ODDS_API_KEY`
- `SECURITY_CODE_PEPPER`
- Payment/bank details such as `BANK_DETAILS`, `BOC_DETAILS`, `PEOPLES_DETAILS`, `SAMPATH_DETAILS`, `LOLC_DETAILS`, `EZCASH_NUMBER`, `MCASH_NUMBER`, `FRIMI_NUMBER`, and `IPAY_NUMBER`
- `WHATSAPP_NUMBER`
- Affiliate values `XBET_LINK` and `XBET_PROMO_CODE`

Use placeholders in documentation and local examples. Never publish real values.

See [`.env.example`](./.env.example) and [`scripts/setup-cf-secrets.sh`](./scripts/setup-cf-secrets.sh).

## Telegram webhook

Use placeholders for both the bot token and webhook secret:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<PUBLIC_BASE_URL>/webhook&secret_token=<WEBHOOK_SECRET>"
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

The production Worker validates the Telegram webhook secret before processing updates.

## Local development and tests

The local Node preview is `src/index.ts`:

```bash
npm run dev
npm run build
npm start
```

Quality checks:

```bash
npm run lint
npm test
npm run validate:migrations
```

Combined check:

```bash
npm run check
```

For a safe Wrangler bundle validation that does not deploy:

```bash
npx wrangler deploy --dry-run --outdir /tmp/wrangler-after
```

Do **not** use production deployment or remote-D1 commands merely to validate a cleanup.

## Free tips system

The Worker schedules three free-tip slots per day at **08:00, 12:00, and 18:00 Sri Lanka time**.

Configured sports are exactly:

```text
auto:soccer,auto:cricket,auto:basketball,auto:tennis,auto:table_tennis,auto:esports
```

With `TIPS_MAX_FEEDS=4` and three daily tip slots, a simple upper-bound estimate is:

**4 feeds × 3 slots/day ≈ 12 provider requests/day ≈ 360/month.**

This is an **estimate only**, not a guaranteed quota or billing figure; actual provider usage depends on the provider's request/market accounting.

The selection pipeline:

1. Query configured sports within the feed cap.
2. Collect bookmaker head-to-head prices.
3. Calculate no-vig consensus probability and value.
4. Apply consensus, value, bookmaker, odds, and freshness filters.
5. Publish qualifying tips to the Telegram channel and store settlement data in D1.
6. Expose sanitized tip data through `/api/tips/preview`.
7. Settle pending tips hourly using available scores and update channel messages.

If no candidate passes the configured filters, the system uses a fallback notice rather than inventing a tip.

See [`docs/free-tips.md`](./docs/free-tips.md) for the deeper provider/tips notes.

## API endpoints

### Public

| Method | Path | Description |
|---|---|---|
| GET/HEAD | `/` | Landing page |
| GET/HEAD | `/privacy` | Privacy policy |
| GET/HEAD | `/privacy-policy` | Privacy policy alias |
| GET/HEAD | `/legal/privacy` | Privacy policy alias |
| GET/HEAD | `/robots.txt` | Robots policy |
| GET/HEAD | `/sitemap.xml` | XML sitemap |
| GET/HEAD | `/api/tips/preview` | Sanitized public tips feed |
| GET/HEAD | `/api/status` | Public status |

### Bot and protected operations

| Method | Path | Description |
|---|---|---|
| POST | `/webhook` | Telegram webhook |
| POST | `/api/tips/settle` | Admin settlement trigger |
| GET/HEAD | `/api/admin/dashboard` | Protected admin dashboard data |
| GET/HEAD | `/api/admin/status` | Protected admin status |
| GET/HEAD | `/api/admin/trends` | Protected financial trends |
| GET/HEAD | `/api/admin/tickets` | Protected support tickets |
| POST | `/api/admin/schedule` | Protected channel-post scheduling |
| GET/HEAD | `/admin`, `/admin/`, `/panel` | Protected admin UI |

Unknown `/api/*` routes return JSON 404 responses rather than the landing page.

## Deployment and CI/CD

Production deployment is controlled by the repository's GitHub Actions workflow.

```text
push to main
  → quality checks
  → migration validation
  → production deployment
```

The production entry is `src/worker.ts`. Merging a pull request into `main` is therefore a production deployment event.

For this repository, do not run production deployment commands locally as part of routine development. Review changes on a branch, run local quality checks, and let the configured CI/CD workflow handle production deployment after an approved merge.

## Cron schedule

All schedules are defined in `wrangler.toml` and are UTC-based.

| Cron (UTC) | Sri Lanka time | Purpose |
|---|---:|---|
| `0 2 * * *` | 07:30 | R2 log cleanup |
| `30 2 * * *` | 08:00 | Free tips slot 1 |
| `30 6 * * *` | 12:00 | Free tips slot 2 |
| `30 12 * * *` | 18:00 | Free tips slot 3 |
| `15 * * * *` | Hourly | Pending-tip settlement |

## Security

- Keep Telegram tokens, webhook secrets, admin secrets, odds API keys, payment details, affiliate credentials, and R2 credentials out of source control.
- Validate the Telegram webhook secret before bot processing.
- Use timing-safe comparisons for sensitive credentials.
- Protect admin routes with the configured admin secret/session controls.
- Use parameterized D1 queries.
- Keep D1 migrations forward-only and versioned.
- Review [`SECURITY.md`](./SECURITY.md) and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for repository-specific security and architecture details.

## Troubleshooting

### Webhook returns 401

Check that the Cloudflare `WEBHOOK_SECRET` matches the Telegram webhook `secret_token`, then inspect webhook status with:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### Bot cannot post to the tips channel

Confirm the bot has the required channel permissions and that the configured tips-channel identifiers are correct.

### Only fallback tips are published

Check the configured tips-provider credentials, feed cap, sport list, and quality thresholds. Provider quota/account status can also affect candidate availability.

### Tips remain pending

Review Worker logs and the hourly settlement trigger. Pending results can be legitimate when an event is incomplete or score data is unavailable/invalid.

### Local preview database issues

The Node preview uses local data under `data/`. Database files are gitignored; keep `data/.gitkeep` tracked.

## License

MIT — see [`LICENSE`](./LICENSE).

## Contact

- Email: `lakmalsujith25@gmail.com`
- Tips channel: [`@fast_xbet_official_tips`](https://t.me/fast_xbet_official_tips)
- Bot: [`@fast_1xbetcash_bot`](https://t.me/fast_1xbetcash_bot)

---

**Repository:** [`Lakmal2078/Tele-bot-cloudflared-main`](https://github.com/Lakmal2078/Tele-bot-cloudflared-main)
