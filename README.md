# 🇱🇰 XBet Telegram Cashier & Management Bot

[![CI / CD](https://github.com/Lakmal2078/Tele-bot-cloudflared-main/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Lakmal2078/Tele-bot-cloudflared-main/actions/workflows/ci-cd.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=node.js)](https://nodejs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)](https://workers.cloudflare.com/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram-Bot%20API-0088cc?logo=telegram)](https://core.telegram.org/bots/api)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> Production-oriented Telegram cashier and transaction-management bot built with TypeScript, grammY, Cloudflare Workers, D1, and R2.

The project supports deposit and withdrawal workflows, multilingual user interactions, referral tracking, administrative controls, receipt storage, scheduled cleanup, automated quality checks, and Cloudflare deployment.

> **Important:** This repository contains application code and deployment configuration. Never commit Telegram bot tokens, payment credentials, Cloudflare API tokens, private keys, or other secrets.

---

## ✨ Highlights

- 💳 Deposit and withdrawal workflows
- 🧾 Receipt upload and storage through Cloudflare R2
- 🌐 Sinhala, English, and Tamil user flows
- 👮 Admin-only controls and transaction moderation
- 📊 Transaction and user analytics
- 🔗 Referral tracking
- ☁️ Cloudflare Workers deployment
- 🗄️ Cloudflare D1 database with **versioned migrations**
- ⏱️ Scheduled maintenance through Worker Cron Triggers
- 🤖 GitHub Actions CI/CD
- 📱 Optional Termux/Android + PM2 deployment path
- 🩺 `/health` and `/api/health` health endpoints

---

## 🏗️ Architecture

```text
Telegram Users
      │
      ▼
Telegram Bot API
      │
      ▼
Cloudflare Worker (src/worker.ts)
      │
      ├── grammY bot logic
      ├── D1 ───────────────► users / transactions / referrals / state
      ├── R2 ───────────────► receipts / media / logs
      └── Cron Trigger ─────► scheduled cleanup

GitHub
  │
  └── Actions ──► quality gates ──► deploy.sh ──► Cloudflare
```

### Runtime modes

| Mode | Entry point | Purpose |
|---|---|---|
| Cloudflare Workers | `src/worker.ts` | Production webhook deployment |
| Node.js / PM2 | `src/index.ts` → `dist/server.cjs` | Termux, VPS, or other Node.js environments |

The Cloudflare Worker is deployed directly from `src/worker.ts`. The Node.js build is a separate PM2 deployment path.

---

## 📁 Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── migrations/
│   ├── 0001_initial_schema.sql
│   └── README.md
├── src/
│   ├── worker.ts          # Cloudflare Worker entry point
│   └── index.ts           # Node.js / PM2 entry point
├── deploy.sh              # Production Cloudflare deployment
├── deploy-proot.sh        # Termux/proot deployment
├── package.json
├── wrangler.toml
├── tsconfig.json
└── README.md
```

> The old root-level `schema.sql` is intentionally no longer used. Database changes are managed through `migrations/`.

---

## 🚀 Quick Start

### Requirements

- Node.js 22+
- npm
- Git
- A Telegram bot created with [@BotFather](https://t.me/BotFather)
- For Cloudflare deployment: a Cloudflare account with Workers, D1, and R2 configured
- For Termux deployment: Android + Termux + `proot-distro`

Install dependencies:

```bash
npm ci
```

Run quality checks:

```bash
npm run check
```

Run tests only:

```bash
npm test
```

Run the TypeScript type-check:

```bash
npm run lint
```

---

## ☁️ Cloudflare Workers Deployment

Cloudflare is the primary production deployment path.

### 1. Authenticate Wrangler

```bash
npx wrangler login
```

### 2. Verify configuration

The Worker and D1/R2 bindings are defined in `wrangler.toml`.

Current production resources include:

- Worker: `xbet-telegram-bot`
- D1: `fastxbetcash_bot-db`
- D1 binding: `DB`
- R2 binding: `CHAT_MEDIA`

Do not put secret values into `wrangler.toml`.

### 3. Configure secrets

Set the secrets required by the application using Wrangler or your CI/CD secret store. Example:

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put ADMIN_CHANNEL_ID
npx wrangler secret put ADMIN_IDS
npx wrangler secret put BANK_DETAILS
npx wrangler secret put WHATSAPP_NUMBER
npx wrangler secret put EZCASH_NUMBER
npx wrangler secret put FRIMI_NUMBER
npx wrangler secret put MCASH_NUMBER
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_PUBLIC_DOMAIN
```

Never paste real secret values into this README, source code, issues, pull requests, or commit messages.

### 4. Apply database migrations

Database schema is managed by versioned files in `migrations/`.

Inspect migration state:

```bash
npx wrangler d1 migrations list fastxbetcash_bot-db --remote
```

Apply pending migrations deliberately:

```bash
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
```

Read [`migrations/README.md`](migrations/README.md) before applying migrations to an existing production database. The initial migration is a baseline and must not be blindly applied to an already-populated database without confirming migration history.

### 5. Deploy the Worker

Recommended production command:

```bash
npm run deploy:cf
```

The deployment script validates the repository, checks the migration directory, applies versioned D1 migrations, deploys the Worker, and performs a health check.

For CI/CD:

```bash
npm run deploy:cf:ci
```

Emergency/manual migration bypass is available as:

```bash
SKIP_MIGRATION=1 npm run deploy:cf
```

Use the bypass only when you deliberately understand the database state and deployment risk.

---

## 🔄 GitHub Actions CI/CD

The repository includes `.github/workflows/ci-cd.yml`.

On pull requests and pushes to `main`, the quality job runs:

```text
npm ci
  ↓
npm run lint
  ↓
npm test
  ↓
bash -n deploy.sh
```

A push to `main` that passes the quality gates proceeds to the production deployment job.

### Required GitHub Actions secrets

Configure these repository/environment secrets in GitHub:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

The Cloudflare API token should follow the principle of least privilege and should only have the permissions required for the deployment workflow.

For production repositories, protect the `production` GitHub environment with appropriate reviewers and deployment rules.

---

## 🗄️ Database & Migrations

D1 schema changes are **forward-only and versioned**.

### Migration naming

```text
migrations/
├── 0001_initial_schema.sql
├── 0002_add_example_index.sql
└── 0003_add_example_column.sql
```

Use the format:

```text
<number>_<description>.sql
```

### Migration rules

1. Never edit an already-applied production migration.
2. Never delete an already-applied production migration.
3. Add a new migration for every schema change.
4. Review destructive SQL carefully before deployment.
5. Prefer forward-fix migrations instead of destructive rollback migrations.
6. Check remote migration history before changing production data structures.

Local workflow:

```bash
npx wrangler d1 migrations list fastxbetcash_bot-db --local
npx wrangler d1 migrations apply fastxbetcash_bot-db --local
```

Production workflow:

```bash
npx wrangler d1 migrations list fastxbetcash_bot-db --remote
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
```

See [`migrations/README.md`](migrations/README.md) for the complete migration policy.

---

## 🔐 Configuration & Secrets

Non-sensitive production configuration is defined in `wrangler.toml`.

Sensitive values must be stored as Cloudflare Worker secrets or GitHub Actions secrets.

### Important configuration categories

| Category | Examples | Storage |
|---|---|---|
| Telegram | `BOT_TOKEN` | Secret |
| Admin access | `ADMIN_IDS`, `ADMIN_CHANNEL_ID` | Secret |
| Payment details | `BANK_DETAILS`, wallet numbers | Secret |
| Webhook security | `WEBHOOK_SECRET` | Secret |
| R2 credentials | `R2_ACCOUNT_ID`, R2 access values | Secret |
| Public runtime values | channel URL, transaction limits | `wrangler.toml` / vars |

### Local `.env`

For Node.js/PM2 deployments, create a local `.env` file from the repository's environment template if available.

```bash
cp .env.example .env
```

Never commit `.env`.

If `.env.example` is not present, create the variables required by the application based on the source configuration and deployment environment. Keep all real credentials out of Git.

---

## 🤖 Bot Commands

### User commands

| Command | Purpose |
|---|---|
| `/start` | Start the bot and open the main flow |
| `/menu` | Open the main menu |
| `/deposit` | Start a deposit workflow |
| `/confirm_deposit` | Submit a deposit receipt for confirmation |
| `/withdraw` | Start a withdrawal workflow |
| `/register` | Open the registration flow |
| `/referrals` / `/myreferrals` | View referral information |
| `/history` / `/transactions` | View transaction history |
| `/language` / `/lang` | Change language |
| `/help` / `/support` / `/faq` | Open help and support |
| `/id` / `/myid` / `/whoami` | View Telegram ID and role |
| `/cancel` | Cancel the current operation |

### Admin commands

| Command | Purpose |
|---|---|
| `/admin` / `/panel` | Open the admin panel |
| `/stats` | View operational statistics |
| `/cleanuplogs` / `/cleanup` | Trigger log/media cleanup |

> Command availability can change as application logic evolves. Treat the bot implementation as the source of truth.

---

## 📱 Termux / Android Deployment

A separate PM2 deployment path is available for Termux/proot environments.

### 1. Install Termux dependencies

```bash
pkg update -y
pkg install -y proot-distro git curl
proot-distro install ubuntu
```

### 2. Enter Ubuntu

```bash
proot-distro login ubuntu
```

### 3. Clone and deploy

```bash
git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git xbet-bot
cd xbet-bot
chmod +x deploy-proot.sh
bash deploy-proot.sh
```

The deployment script is responsible for installing the required Node.js/PM2 tooling, installing dependencies, building the Node.js bundle, and starting the bot process where supported.

Useful PM2 commands:

```bash
npm run pm2:status
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
```

For 24/7 Android operation, keep Termux protected from aggressive battery optimization and use the platform's recommended background-execution settings.

---

## 🩺 Health Checks

The Worker exposes health endpoints for deployment verification:

```text
/health
/api/health
```

A healthy response reports an `ok` status.

After deployment, verify the public Worker endpoint, for example:

```bash
curl -i https://<your-worker-domain>/health
```

Do not assume a deployment is healthy until the health check succeeds.

---

## 🧪 Development & Quality

### Development

```bash
npm run dev
```

### Type checking

```bash
npm run lint
```

### Tests

```bash
npm test
```

### Full local check

```bash
npm run check
```

### Production Node.js build

```bash
npm run build
npm start
```

The Node.js build is intended for the PM2/VPS/Termux path. Cloudflare Worker deployment uses `src/worker.ts` through Wrangler.

---

## 🛡️ Security Guidelines

- Never commit secrets or credentials.
- Never expose `BOT_TOKEN` in logs or error messages.
- Keep Cloudflare API tokens least-privileged.
- Protect the GitHub `production` environment.
- Review every database migration before production deployment.
- Do not modify applied production migrations.
- Validate user input and transaction amounts server-side.
- Restrict admin operations to configured admin IDs.
- Keep dependencies updated and review security advisories.
- Treat receipt/media objects as potentially sensitive user data.
- Use HTTPS for production endpoints and webhook traffic.

If you discover a security issue, do not publish credentials or exploit details in a public issue. Contact the repository maintainer privately.

---

## 🚨 Troubleshooting

### Deployment fails before migration

Check:

```bash
npm run lint
npm test
bash -n deploy.sh
npx wrangler whoami
```

Then inspect the migration state:

```bash
npx wrangler d1 migrations list fastxbetcash_bot-db --remote
```

### Migration history does not match the database

Stop automatic schema changes and verify the actual production database state first. Do not blindly re-run the baseline migration against an existing database.

### Worker deploys but health check fails

Check:

1. Worker deployment status in Cloudflare.
2. Worker logs.
3. D1 and R2 bindings.
4. Required secrets.
5. Telegram webhook configuration.
6. `/health` response.

### Bot receives no webhook updates

Confirm the webhook URL:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Set or replace it only after confirming the correct Worker URL:

```bash
curl -F "url=https://<your-worker-domain>/" \
  "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook"
```

Never commit the real bot token into a command history that may be shared publicly.

---

## 📦 Release & Deployment Policy

Recommended production flow:

```text
Feature branch
     ↓
Pull Request
     ↓
CI quality gates
     ↓
Migration review (when applicable)
     ↓
Merge to main
     ↓
Production deployment
     ↓
Health check
     ↓
Post-deployment verification
```

Database migrations should be reviewed separately from application-only changes because database changes can be persistent and difficult to reverse.

For a failed application deployment, prefer rolling back the Worker application version where possible. For a failed database change, use a carefully reviewed forward-fix migration rather than assuming the database can safely be rolled back.

---

## 🤝 Contributing

1. Create a feature branch.
2. Make a focused change.
3. Add or update tests where appropriate.
4. If the database changes, add a new migration.
5. Run:

```bash
npm run check
bash -n deploy.sh
```

6. Open a pull request.
7. Wait for CI to pass.
8. Review production-impacting changes carefully before merging.

Do not commit generated build output, local databases, `.env` files, or secrets.

---

## 📄 License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).

---

## 👤 Maintainer

**Lakmal2078**

Repository: [Lakmal2078/Tele-bot-cloudflared-main](https://github.com/Lakmal2078/Tele-bot-cloudflared-main)

---

<p align="center">
  <strong>🇱🇰 Built for reliable Telegram-based operations</strong><br>
  TypeScript · grammY · Cloudflare Workers · D1 · R2 · GitHub Actions
</p>
