# 🇱🇰 XBet Telegram Cashier & Management Bot

[![CI / CD](https://github.com/Lakmal2078/Tele-bot-cloudflared-main/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Lakmal2078/Tele-bot-cloudflared-main/actions/workflows/ci-cd.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=node.js)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)](https://workers.cloudflare.com/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-0088cc?logo=telegram)](https://core.telegram.org/bots/api)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> Production-oriented Telegram cashier, transaction-management, referral, and free-tips bot built with TypeScript, grammY, Cloudflare Workers, D1, R2, and GitHub Actions.

This repository is designed around a production deployment workflow with versioned database migrations, authenticated administrative APIs, Telegram webhook protection, transaction integrity controls, duplicate-submission protection, scheduled free tips, automated tests, and deployment health checks.

> **Security:** Never commit Telegram bot tokens, API keys, payment credentials, Cloudflare credentials, private keys, or other secrets to Git.

---

## ✨ Features

### Telegram bot

- 💳 Deposit workflow with receipt submission
- 💸 Withdrawal workflow
- 🧾 Receipt/media backup through Cloudflare R2
- 🌐 Sinhala, English, and Tamil user flows
- 🔗 Referral tracking and referral dashboard
- 📜 Transaction history
- 👮 Admin-only transaction moderation
- 🛡️ Callback authorization and transaction-state protection
- 🚫 Duplicate receipt and duplicate pending-withdrawal protection
- ⏱️ User and transaction abuse/rate-limit protection
- `/start`, `/menu`, `/deposit`, `/confirm_deposit`, `/withdraw`, `/register`, `/referrals`, `/history`, `/language`, `/help`, `/id`, `/cancel`

### Automated free tips

- 🤖 Automated sports tips powered by The Odds API
- ⚽ EPL and UEFA Champions League
- 🏀 NBA
- 🎾 ATP tennis
- 🎯 Configurable odds range and forecast window
- 🕐 Scheduled publishing at **08:00, 12:00, and 18:00 Sri Lanka time**
- 🔁 Retry/backoff handling for temporary Odds API failures
- 🔒 Lease-based scheduled-tip claiming to prevent concurrent cron workers from publishing the same slot
- 🧹 Recovery of stale `PROCESSING` tip jobs after lease expiry

### Production/security

- 🔐 Fail-closed Telegram webhook secret validation
- 🔐 Authenticated administrative API endpoints
- 🧱 Per-isolate admin authentication throttling
- 🧱 Webhook request method, content-type, and body-size validation
- 🛡️ Security response headers
- 🗄️ D1 financial audit trail and status-change triggers
- 🔒 Atomic conditional transaction status transitions
- 🚫 Database-level duplicate submission guards
- 📦 Versioned, forward-only migrations
- 🧪 Migration validation and regression tests
- 🚀 Single GitHub Actions production deployment path
- ❤️ Post-deployment health check

---

## 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │     Telegram Users   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Telegram Bot API  │
                         └──────────┬───────────┘
                                    │ Webhook
                                    ▼
                    ┌──────────────────────────────┐
                    │ Cloudflare Worker             │
                    │ src/worker.ts                 │
                    │                              │
                    │ grammY + security + routing  │
                    └──────┬───────────┬───────────┘
                           │           │
                 ┌─────────┘           └──────────┐
                 ▼                                ▼
        ┌─────────────────┐              ┌─────────────────┐
        │ Cloudflare D1   │              │ Cloudflare R2   │
        │ users           │              │ receipts/media  │
        │ transactions    │              │ logs            │
        │ referrals       │              └─────────────────┘
        │ financial audit │
        │ tip jobs        │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Worker Cron     │
        │ free tips       │
        │ cleanup         │
        └─────────────────┘

 GitHub main
      │
      ▼
 GitHub Actions
      │
      ├── npm ci
      ├── lint
      ├── tests
      ├── migration validation
      ├── deploy.sh
      └── health check
             │
             ▼
      Cloudflare Workers
```

### Runtime modes

| Runtime | Entry point | Purpose |
|---|---|---|
| Cloudflare Workers | `src/worker.ts` | Primary production webhook deployment |
| Node.js / PM2 | `src/index.ts` → `dist/server.cjs` | VPS, Termux, Android, or Node runtime |

The application keeps the Cloudflare Worker as the primary production path while retaining a Node.js/PM2 runtime for supported environments.

---

## 📁 Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci-cd.yml                 # Single CI/CD production path
├── docs/
│   ├── security-phase1.md
│   ├── deployment-safety-phase2.md
│   ├── phase3-financial-integrity.md
│   ├── security-phase4.md
│   └── phase4-cloudflare-edge-protection.md
├── migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_*.sql                    # Existing schema evolution
│   ├── 0003_financial_integrity.sql
│   ├── 0004_abuse_protection.sql
│   └── README.md
├── scripts/
│   └── validate-migrations.mjs
├── src/
│   ├── bot.ts                         # Telegram bot handlers
│   ├── config.ts                      # Environment/config validation
│   ├── db.ts                          # D1 data access
│   ├── fraud.ts                       # Abuse/fraud checks
│   ├── i18n.ts                        # Localisation
│   ├── index.ts                       # Node.js runtime
│   ├── logger.ts                      # Audit/application logging
│   ├── rateLimit.ts                   # Rate limiting
│   ├── r2.ts                          # R2 media operations
│   ├── security.ts                    # Request/admin security controls
│   ├── tips.ts                        # Automated free-tip service
│   ├── types.ts                       # Shared types
│   ├── utils.ts                       # Shared utilities
│   └── worker.ts                      # Cloudflare Worker entry point
├── deploy.sh                          # Production Cloudflare deployment
├── deploy-proot.sh                    # Termux/proot deployment path
├── package.json
├── package-lock.json
├── wrangler.toml
├── tsconfig.json
└── README.md
```

> Database schema is managed through `migrations/`. Do not introduce a separate production schema source that bypasses migration history.

---

## 🚀 Quick Start

### Requirements

- Node.js **22+**
- npm
- Git
- Telegram bot created through [@BotFather](https://t.me/BotFather)
- Cloudflare account for Worker/D1/R2 deployment
- Wrangler **4.131.0** through the pinned project dependency

Install dependencies:

```bash
npm ci
```

Run the full local quality check:

```bash
npm run check
```

Run tests:

```bash
npm test
```

Run TypeScript validation:

```bash
npm run lint
```

Validate migration filenames and destructive SQL rules:

```bash
npm run validate:migrations
```

---

## 🔐 Configuration & Secrets

Application configuration is validated centrally by `src/config.ts`.

### Required production secrets

The Cloudflare Worker currently requires the following secrets when the automated tips feature is enabled:

```text
BOT_TOKEN
ADMIN_IDS
WEBHOOK_SECRET
ADMIN_API_SECRET
ODDS_API_KEY
```

Configure them with Wrangler:

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put ADMIN_IDS
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ADMIN_API_SECRET
npx wrangler secret put ODDS_API_KEY
```

For `ADMIN_API_SECRET`, use a long random value. Example generator:

```bash
openssl rand -base64 32
```

Never put real secret values in:

- `README.md`
- `.env.example`
- `wrangler.toml`
- source code
- GitHub issues or pull requests
- commit messages
- public logs

### Local Node.js environment

For local Node.js/PM2 development:

```bash
cp .env.example .env
```

Then fill in the required local values. `.env` must never be committed.

---

## ☁️ Cloudflare Deployment

Cloudflare Workers is the primary production deployment target.

### 1. Authenticate Wrangler

```bash
npx wrangler login
```

### 2. Verify resources

The current deployment configuration uses:

- Worker: `xbet-telegram-bot`
- D1 binding: `DB`
- R2 binding: `CHAT_MEDIA`
- versioned migrations in `migrations/`

Review `wrangler.toml` before deployment.

### 3. Validate locally

```bash
npm ci
npm run lint
npm test
npm run validate:migrations
bash -n deploy.sh
```

### 4. Deploy

Recommended local production command:

```bash
npm run deploy:cf
```

The deployment script performs repository and environment checks, validates migrations, runs quality gates, applies remote D1 migrations, deploys with the pinned Wrangler version, and performs a post-deployment health check.

### CI deployment

Production deployments from `main` are handled by the single workflow:

```text
.github/workflows/ci-cd.yml
```

You normally do **not** need to run `wrangler deploy` manually after pushing to `main`.

```bash
git push origin main
```

Then GitHub Actions runs the production pipeline.

> **Important:** CI deliberately refuses migration/health-check bypass flags. Do not weaken those protections to make a deployment pass.

---

## 🔄 GitHub Actions CI/CD

There is intentionally **one** production workflow:

```text
.github/workflows/ci-cd.yml
```

The quality gate performs:

```text
npm ci
   ↓
npm run lint
   ↓
npm test
   ↓
npm run validate:migrations
   ↓
bash -n deploy.sh
```

For a push to `main`, a successful quality job is followed by the production deployment job.

### Required GitHub Actions secrets

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The Cloudflare API token should follow least-privilege principles.

The workflow uses a production concurrency group so multiple production deployments are not allowed to race each other.

---

## 🗄️ Database & Migration Policy

D1 schema changes are **versioned and forward-only**.

Current migration history includes:

```text
0001_initial_schema.sql
0002_*.sql
0003_financial_integrity.sql
0004_abuse_protection.sql
```

### Rules

1. Never edit an already-applied production migration.
2. Never delete an already-applied production migration.
3. Add a new migration for every schema change.
4. Migration numbers must be unique and sequentially ordered.
5. Destructive SQL is blocked by the migration validator by default.
6. Prefer expand/contract changes for breaking schema evolution.
7. Review production migration state before deployment.

Validate migrations:

```bash
npm run validate:migrations
```

Inspect remote migration state:

```bash
npx wrangler d1 migrations list fastxbetcash_bot-db --remote
```

Apply pending migrations manually only when deliberately operating outside the automated deployment flow:

```bash
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
```

See [`migrations/README.md`](migrations/README.md) and the Phase 2 deployment-safety documentation for the complete policy.

---

## 💰 Financial Integrity

The bot does not maintain a fake local wallet balance. Deposit and withdrawal records represent transaction requests and their lifecycle state.

### Atomic status transitions

Financial status changes use conditional database updates such as:

```sql
UPDATE transactions
SET status = 'APPROVED'
WHERE id = ?
  AND status = 'PENDING'
  AND deleted_at IS NULL;
```

This ensures that only one concurrent state transition can win for the same pending transaction.

### Audit trail

Migration `0003_financial_integrity.sql` adds a `financial_audit` table and database triggers for important deposit/withdrawal lifecycle events.

The audit layer records events such as:

- `CREATED`
- `STATUS_CHANGED`
- `SOFT_DELETED`

### Duplicate submission protection

Migration `0004_abuse_protection.sql` adds database-level guards for:

- the same active receipt being submitted by a different user
- the same pending withdrawal being submitted again with the same key transaction fields

These are authoritative database protections, not only UI checks.

---

## 🤖 Automated Free Tips

The automated tips system is implemented in `src/tips.ts` and runs from Worker Cron Triggers.

### Schedule

Sri Lanka time (UTC+05:30):

| Local time | UTC cron |
|---|---|
| 08:00 | `30 2 * * *` |
| 12:00 | `30 6 * * *` |
| 18:00 | `30 12 * * *` |

The public tips channel is configured through:

```text
TIPS_CHANNEL_ID
TIPS_CHANNEL_URL
```

### Selection controls

The current production configuration uses:

- Sports: EPL, UEFA Champions League, NBA, ATP tennis
- Regions: UK and EU
- Minimum odds: `1.40`
- Maximum odds: `2.50`
- Forecast window: up to `48` hours ahead

### Retry and concurrency safety

The tip scheduler uses:

- unique scheduled slots
- lease tokens
- lease expiry timestamps
- attempt counters
- guarded post/update operations
- bounded retries with backoff for temporary Odds API errors

This makes scheduled jobs duplicate-resistant and recoverable when a Worker invocation fails.

> No design using separate D1 and Telegram API operations can mathematically guarantee exactly-once external delivery. The implementation therefore uses lease/idempotency controls to provide strong duplicate resistance while remaining recoverable.

---

## 🛡️ Security Model

### Telegram webhook

Webhook requests are protected by:

- POST-only enforcement
- JSON content-type validation
- maximum request body size
- `X-Telegram-Bot-Api-Secret-Token` verification
- fail-closed secret handling
- security response headers

### Administrative APIs

Sensitive endpoints require `ADMIN_API_SECRET` authentication.

Examples include:

```text
/api/admin/status
/api/cleanup/logs/status
/api/cleanup/logs
```

Public health endpoints intentionally expose only liveness information:

```text
/health
/api/health
```

### Abuse protection

The application includes:

- Telegram/user rate limiting
- deposit/withdrawal fraud checks
- admin authentication throttling
- callback authorization
- atomic transaction transitions
- database-level duplicate guards

The in-process rate limiter is defense-in-depth only. For internet-facing production traffic, Cloudflare WAF/Rate Limiting should also be configured.

See:

- [`docs/security-phase1.md`](docs/security-phase1.md)
- [`docs/security-phase4.md`](docs/security-phase4.md)
- [`docs/phase4-cloudflare-edge-protection.md`](docs/phase4-cloudflare-edge-protection.md)

---

## 🤖 Bot Commands

### User commands

| Command | Purpose |
|---|---|
| `/start` | Start the bot |
| `/menu` | Open the main menu |
| `/deposit` | Start a cash deposit |
| `/confirm_deposit` | Confirm a deposit with receipt information |
| `/withdraw` | Start a cash withdrawal |
| `/register` | Open 1xBet registration flow |
| `/referrals` | Referral dashboard |
| `/history` | Transaction history |
| `/id` | Show Telegram ID |
| `/language` | Change language |
| `/help` | Help and support |
| `/cancel` | Cancel the current operation |

Additional aliases may exist for compatibility. The bot's registered command menu is the source of truth.

### Admin commands

Administrative operations are restricted to configured admin IDs and are not intended to be exposed as a public command menu.

---

## 🩺 Health Checks

The Worker exposes:

```text
/health
/api/health
```

A healthy response is intentionally minimal:

```json
{"status":"ok","service":"telegram-bot"}
```

After deployment:

```bash
curl -i https://<your-worker-domain>/health
```

A successful deployment should be verified with the health endpoint and, where appropriate, Telegram webhook status.

---

## 🧪 Tests & Quality

### Full check

```bash
npm run check
```

### TypeScript

```bash
npm run lint
```

### Tests

```bash
npm test
```

### Migration validation

```bash
npm run validate:migrations
```

### Deployment script syntax

```bash
bash -n deploy.sh
```

The repository contains focused regression tests for security, financial integrity, automated tips, and abuse-protection safeguards.

Some security tests intentionally use source-level regression assertions for large Telegram callback flows; these complement, rather than replace, real integration testing.

---

## 📱 Termux / Android / PM2

A Node.js/PM2 deployment path is available for supported Termux/proot/VPS environments.

Example:

```bash
pkg update -y
pkg install -y proot-distro git curl
proot-distro install ubuntu
proot-distro login ubuntu

git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git xbet-bot
cd xbet-bot
chmod +x deploy-proot.sh
bash deploy-proot.sh
```

Useful PM2 commands:

```bash
npm run pm2:status
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
```

For long-running Android deployments, configure Termux/background execution according to the device's power-management behavior.

---

## 🚨 Troubleshooting

### CI fails during quality checks

Run locally:

```bash
npm ci
npm run lint
npm test
npm run validate:migrations
bash -n deploy.sh
```

### Migration validation fails

Read the migration validator output and inspect the migration file. Do not bypass destructive-migration protection casually.

### Worker deployment succeeds but health check fails

Check:

1. Cloudflare Worker deployment
2. Worker logs
3. D1 binding
4. R2 binding
5. required secrets
6. `/health` response
7. Telegram webhook configuration

### Bot does not receive webhook updates

Inspect Telegram webhook state:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Set a webhook only after confirming the correct Worker URL and secret configuration.

Never publish a real bot token in shell history, logs, screenshots, issues, or chat messages.

### Free tip was not published

Check:

1. Worker Cron Trigger schedule
2. The Odds API quota and response status
3. `ODDS_API_KEY`
4. configured sports/regions
5. odds range `1.40–2.50`
6. available matches in the next 48 hours
7. Worker logs
8. duplicate/lease state in `tip_posts`

---

## 📦 Production Release Flow

```text
Feature branch
      ↓
Pull Request
      ↓
CI quality gates
      ↓
Migration review (if applicable)
      ↓
Merge to main
      ↓
Production deployment
      ↓
D1 migration application
      ↓
Worker deployment
      ↓
Health check
      ↓
Post-deployment verification
```

For database failures, prefer a carefully reviewed forward-fix migration instead of assuming a production database can safely be rolled back.

For application-only failures, roll back the Worker application version where appropriate.

---

## 🤝 Contributing

1. Create a focused feature branch.
2. Make the smallest safe change.
3. Add or update tests.
4. Add a new migration for database changes.
5. Never modify an already-applied production migration.
6. Run:

```bash
npm run check
npm run validate:migrations
bash -n deploy.sh
```

7. Open a pull request.
8. Wait for CI.
9. Review production/security impact before merging.

Do not commit:

- `.env`
- credentials
- API keys
- generated build output
- local databases
- private certificates/keys

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| [`migrations/README.md`](migrations/README.md) | Database migration policy |
| [`docs/security-phase1.md`](docs/security-phase1.md) | Core security hardening |
| [`docs/deployment-safety-phase2.md`](docs/deployment-safety-phase2.md) | CI/CD and deployment safety |
| [`docs/phase3-financial-integrity.md`](docs/phase3-financial-integrity.md) | Financial integrity and tip reliability |
| [`docs/security-phase4.md`](docs/security-phase4.md) | Telegram abuse and transaction protection |
| [`docs/phase4-cloudflare-edge-protection.md`](docs/phase4-cloudflare-edge-protection.md) | Cloudflare edge protection runbook |

---

## 📄 License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).

---

## 👤 Maintainer

**Lakmal2078**

Repository: https://github.com/Lakmal2078/Tele-bot-cloudflared-main
