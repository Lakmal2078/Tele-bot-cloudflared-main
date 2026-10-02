# Repository Map

## 1. Executive repository map

This repository is a Cloudflare Workers + D1 + R2 Telegram-first financial / betting-support app, centered on a public landing page and admin dashboard. The project is production-oriented and heavily uses Worker routing, D1 persistence, Telegram bot handlers, and scheduled tasks.

## 2. High-level system view

Browser / Telegram User
  ↓
Cloudflare Worker (`src/worker.ts`)
  ├─ public landing pages and SEO routes (`src/landingPage.ts`, `src/apiRoutes.ts`)
  ├─ Telegram webhook bot (`src/bot.ts`)
  ├─ admin dashboard routes (`src/apiRoutes.ts`, `src/adminPage.ts`)
  ├─ scheduled jobs (`tips.ts`, `tipsSettlement.ts`, `logCleanup.ts`)
  ├─ D1 DB access (`src/db.ts`)
  ├─ R2 upload/access (`src/storage.ts`, `src/r2.ts`)
  └─ config, security, session, telemetry (`src/config.ts`, `src/security.ts`, `src/adminSession.ts`, `src/observability.ts`)
  ↓
D1 database (`wrangler.toml` binding `DB`)
R2 bucket (`wrangler.toml` binding `CHAT_MEDIA`)
The Odds API / Telegram / external services

## 3. Important components

### Frontend / public web
- `src/landingPage.ts` — public landing page HTML and SEO metadata.
- `src/privacyPage.ts` — privacy policy page.
- `src/publicTips.ts` — sanitized public tips preview content used by landing page.
- `src/publicStatus.ts` — public status payload.
- `public/` — static assets used by the Worker asset binding.

### API layer
- `src/apiRoutes.ts` — main API router for health, bot status, webhook setup, admin APIs, tips API, and public routes.
- `src/worker.ts` — Worker fetch handler and cron dispatcher.
- `src/index.ts` — local Node preview entry point.

### Telegram bot
- `src/bot.ts` — bot logic, command handlers, flows, and messages.
- `src/rateLimit.ts` — in-memory bot rate limiting.
- `src/telegramStatus.ts` — Telegram connectivity checks.
- `src/security.ts` — request validation and admin brute-force controls.

### Database and storage
- `src/db.ts` — D1 data access layer.
- `migrations/*.sql` — schema evolution.
- `src/storage.ts` — R2 / S3 abstraction.
- `src/logCleanup.ts` — cleanup of old R2 logs.
- `src/r2.ts` — R2 analytics exports and storage metadata access.
- `src/logger.ts` — transaction/error audit logging to R2.

### Telegram / betting service business logic
- `src/tips.ts` — odds feed candidate selection and scheduled posting logic.
- `src/tipsProvider.ts` — provider and external odds interaction.
- `src/tipsSettlement.ts` — settlement / outcome evaluation.
- `src/fraud.ts` — duplicate receipt and duplicate player-ID checks.
- `src/sqlite-d1.ts` — local D1/shim utilities used in local preview.

### Auth, config, sessions
- `src/config.ts` — environment validation and secret comparison.
- `src/adminSession.ts` — signed admin session cookies.
- `src/adminPage.ts` — admin dashboard rendering.

### Assets and branding
- `src/ogImage.ts`, `src/brandLogo.ts`, `src/brandFaviconData.ts`, `src/botDescriptionImageData.ts` — embedded brand / social preview assets.

## 4. Repository inventory by category

### Frontend
- `src/landingPage.ts`
- `src/privacyPage.ts`
- `src/adminPage.ts`
- `public/`

### Backend
- `src/worker.ts`
- `src/bot.ts`
- `src/apiRoutes.ts`
- `src/db.ts`
- `src/storage.ts`
- `src/tips.ts`
- `src/tipsSettlement.ts`

### API
- `src/apiRoutes.ts`
- `src/worker.ts` fetch routing
- `/api/status`, `/api/health`, `/api/tips/*`, `/api/admin/*`, `/api/setup-webhook`, etc.

### Telegram bot
- `src/bot.ts`
- `src/telegramStatus.ts`
- `src/rateLimit.ts`
- `src/worker.ts` webhook callback registration

### Database
- D1 via `wrangler.toml` binding `DB`
- `migrations/` SQL files
- `src/db.ts`

### Cloudflare Workers / D1 / R2 / assets
- `wrangler.toml`
- `public/manifest.json`
- `public/favicon.png`
- `src/storage.ts`
- `src/r2.ts`

### Static assets
- `public/`
- `src/ogImage.ts`
- `src/brandLogo.ts`
- `src/botDescriptionImageData.ts`

### Configuration and env
- `.env.example`
- `wrangler.toml`
- `scripts/setup-cf-secrets.sh`
- `scripts/scan-env.mjs`

### CI/CD
- `.github/workflows/ci-cd.yml`
- `.github/workflows/codeql.yml`
- `.github/dependabot.yml`

### Tests
- `tests/*.test.ts`

### Documentation
- `README.md`
- `docs/*.md`
- `migrations/README.md`

## 5. Production significance

This project is operationally important because it handles:
- Telegram bot interactions
- financial deposit/withdrawal flows
- admin dashboard access
- scheduled tips publication
- storage of logs and receipts
- Cloudflare Worker deployment and D1 data persistence

That means every route and secret must be treated as production-critical.

## 6. Security relevance summary

Notable security hardening present:
- request validation in `src/security.ts`
- constant-time comparisons in `src/config.ts`
- admin API secret protection and session cookies in `src/adminSession.ts`
- D1 query binding in `src/db.ts`
- admin IP allowlist support
- webhook secret requirement in `src/worker.ts`

Notable production risks to watch:
- gambling-related marketing and financial content needs legal/regulatory review
- public CORS wildcard headers on some routes may be broader than required
- betting / transaction functionality needs repeated checks for idempotency and authorization boundaries
- large parts of logic are business-critical and should be covered by stronger integration tests

## 7. File summary

Important files reviewed:
- `src/worker.ts`
- `src/apiRoutes.ts`
- `src/bot.ts`
- `src/db.ts`
- `src/storage.ts`
- `src/config.ts`
- `src/security.ts`
- `src/adminSession.ts`
- `src/landingPage.ts`
- `src/tips.ts`
- `src/tipsSettlement.ts`
- `src/fraud.ts`
- `src/logger.ts`
- `src/rateLimit.ts`
- `wrangler.toml`
- `package.json`
- `.env.example`
- `README.md`
- `.github/workflows/ci-cd.yml`

This is a production Worker app with a clean architecture, but it still needs a disciplined security and compliance review because it deals with financial transactions and gambling-adjacent content.
