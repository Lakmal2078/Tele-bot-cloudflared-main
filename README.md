<div align="center">
  <h1>🚀 1xBet Fast Cash - Telegram Bot</h1>
  <p><b>A highly optimized, serverless Telegram Bot for automated 1xBet affiliate cash agent operations, built on Cloudflare Workers.</b></p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
  [![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](#)
  [![Telegram API](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](#)
</div>

---

## 📌 Overview

This project is a production-ready, serverless Telegram Bot designed to handle deposits, withdrawals, support tickets, and automated sports betting tips for a 1xBet Cash Agent. 

By leveraging **Cloudflare Workers** (Edge computing), **Cloudflare D1** (Serverless SQLite), and **Cloudflare R2** (Object Storage), this bot achieves **zero-downtime**, **infinite scalability**, and operates with **virtually zero server maintenance costs**.

## ✨ Key Features

- **Serverless Architecture**: Runs entirely on Cloudflare Workers edge network. No VPS, Docker, or PM2 required.
- **Automated Webhooks**: Automatically registers and syncs Telegram Webhooks securely.
- **Robust Database (D1)**: Uses Cloudflare D1 with tracked database migrations.
- **Media Storage (R2)**: Securely stores user receipt images in Cloudflare R2.
- **Admin Dashboard**: Built-in web-based admin panel to view financial trends, ticket volumes, and system health.
- **Automated Betting Tips**: Integrates with The Odds API to automatically post high-quality betting tips to a Telegram Channel via Cron Triggers.
- **Fraud & Rate Limit Protection**: Built-in security layers to detect abuse and limit spam.

---

## 🛠️ Prerequisites

1. **Node.js** (v18 or higher) & **npm**
2. **Cloudflare Account** (Free tier is sufficient)
3. **Telegram Bot Token** (from [@BotFather](https://t.me/BotFather))
4. **Cloudflare Wrangler CLI** (`npm install -g wrangler`)

---

## ⚙️ 1. Local Setup & Environment Variables

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Lakmal2078/Tele-bot-cloudflared-main.git xbet-bot
   cd xbet-bot
   ```

2. **Install dependencies**:
   ```bash
   npm ci
   ```

3. **Configure Environment Variables**:
   We provide an interactive script to effortlessly set up your `.env` file.
   ```bash
   npm run env:fix
   ```
   *This script will scan for missing variables (Bot Token, Admin IDs, Webhook Secrets, Payment Methods) and guide you through filling them securely.*

4. **Verify Configuration**:
   ```bash
   npm run env:scan
   ```

---

## 🗄️ 2. Cloudflare D1 & R2 Setup

Before deploying, you need to provision the database and storage bucket on Cloudflare.

### Create D1 Database
```bash
npx wrangler d1 create fastxbetcash_bot-db
```
*Note the `database_name` and `database_id` output from this command.*

### Create R2 Bucket
```bash
npx wrangler r2 bucket create chat-media
```

### Update `wrangler.toml`
Open `wrangler.toml` and update the `database_id` and `bucket_name` to match the resources you just created:

```toml
[[d1_databases]]
binding = "DB"
database_name = "fastxbetcash_bot-db"
database_id = "YOUR-DATABASE-ID-HERE" # <--- Update this!

[[r2_buckets]]
binding = "CHAT_MEDIA"
bucket_name = "chat-media"            # <--- Ensure this matches
```

---

## 🗃️ 3. Database Migrations

Cloudflare D1 uses SQL migrations to construct your database schema. The migration files are located in the `migrations/` directory.

1. **Apply Migrations Locally (for testing)**:
   ```bash
   npx wrangler d1 migrations apply fastxbetcash_bot-db --local
   ```

2. **Apply Migrations to Production**:
   ```bash
   npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
   ```

*(You can validate your migrations at any time by running `npm run validate:migrations`)*

---

## 🚀 4. Deployment

### Method A: Manual Deployment (Wrangler CLI)

1. **Upload your Secrets to Cloudflare**:
   Run the included secret sync script to push your `.env` variables to Cloudflare encrypted storage:
   ```bash
   npm run secrets:cf
   ```

2. **Deploy the Worker**:
   ```bash
   npm run deploy:cf
   ```
   *This script validates migrations, runs the linter/tests, deploys the worker, and automatically registers your Telegram Webhook.*

### Method B: Automated CI/CD (GitHub Actions)

This repository includes a production-ready GitHub Actions workflow (`.github/workflows/ci-cd.yml`).

1. Go to your GitHub Repository **Settings > Secrets and variables > Actions**.
2. Add the following **Repository Secrets**:
   - `CLOUDFLARE_API_TOKEN`: Create this in your Cloudflare Dashboard (My Profile > API Tokens > Edit Cloudflare Workers template).
   - `CLOUDFLARE_ACCOUNT_ID`: Found in your Cloudflare Dashboard URL or Overview page.
3. Every push to the `main` branch will automatically run tests, apply pending D1 migrations, and deploy to Cloudflare.

---

## ⏱️ Scheduled Tasks (Cron Jobs)

Cloudflare Workers use Cron Triggers to execute scheduled tasks. These are configured in `wrangler.toml`:

```toml
[triggers]
crons = [
  "0 2 * * *",   # Daily trends update (2:00 AM UTC)
  "30 2 * * *",  # Fraud sweep (2:30 AM UTC)
  "30 6 * * *",  # Post Morning betting tips (6:30 AM UTC)
  "30 12 * * *", # Post Afternoon betting tips (12:30 PM UTC)
  "15 * * * *"   # Settlement loop (every hour at HH:15)
]
```
*No external cron services are required.*

---

## 🧪 Testing & Quality Assurance

This project strictly enforces high code quality.
- **Run Unit Tests**: `npm test` (Runs 120+ Vitest cases including D1 mocking).
- **Run Linter**: `npm run lint` (ESLint & TypeScript type checking).
- **All-in-one check**: `npm run check`

---

## 🛡️ Architecture & Security

- **Webhook Secrets**: Telegram sends a secret token header with every request. The worker verifies this against `WEBHOOK_SECRET` to prevent unauthorized payloads.
- **Edge Performance**: D1 queries are localized near the user, ensuring sub-50ms response times for database reads.
- **No Long-Polling**: Unlike legacy bots, this uses Telegram Webhooks, saving compute time and guaranteeing immediate response delivery.

---

<div align="center">
  <sub>Built with ❤️ for Cloudflare Workers & Telegram</sub>
</div>
