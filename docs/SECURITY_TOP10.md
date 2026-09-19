# Top 10 security hardening checklist

Status for `Tele-bot-cloudflared-main` (Worker + D1 + R2 Telegram bot).

| # | Item | Status | Where |
|---|------|--------|-------|
| 1 | Strict `.gitignore` for DB + env secrets | Done | `.gitignore` (`*.db*`, `.env*`, `.dev.vars`, keys) |
| 2 | Sanitize dynamic input in Telegram Markdown | Done (helpers) | `escapeMarkdown` / `escapeCode` / `escapeMarkdownV2` in `src/utils.ts`; use on every user/external string in Markdown replies |
| 3 | R2 receipts never publicly readable | Done | `src/r2.ts` stores proxy URLs only (`/api/admin/receipts?key=`); serve via `requireAdmin` |
| 4 | D1 parameterized queries only | Done | `src/db.ts` uses `prepare(...).bind(...)`; no user input in SQL string concat |
| 5 | Worker / bot rate limiting | Done | `src/rateLimit.ts` (bot); admin brute-force gate in `src/security.ts` + `requireAdmin` |
| 6 | Webhook secret constant-time compare | Done | `constantTimeEqual` in `src/config.ts`; used in `src/worker.ts` for `X-Telegram-Bot-Api-Secret-Token` |
| 7 | Rotate `ADMIN_API_SECRET` + `WEBHOOK_SECRET` | Ops runbook | See below — secrets are Cloudflare secrets, not in Git |
| 8 | CSP on landing / static responses | Done | `landingPageSecurityHeaders` + `securityHeaders` in `src/security.ts` |
| 9 | Optional admin IP allowlist | Done | Set `ADMIN_IP_ALLOWLIST` (comma-separated). Enforced in `requireAdmin` via `isAdminIpAllowed` |
| 10 | Periodic `npm audit` | Done | CI job `Production dependency audit` (`npm run audit:deps`) + Dependabot |

## Secret rotation (item 7)

1. Generate new values (32+ random bytes, base64/hex).
2. `wrangler secret put WEBHOOK_SECRET` and `wrangler secret put ADMIN_API_SECRET`.
3. Update Telegram webhook with the new secret:
   `https://api.telegram.org/bot<token>/setWebhook?url=<worker>&secret_token=<WEBHOOK_SECRET>`
4. Redeploy if needed; invalidate old admin browser sessions (they use HMAC of `ADMIN_API_SECRET`).
5. Rotate at least every 90 days, or immediately after any leak suspicion.

## Recommended production settings

```bash
# Optional: lock admin API to office/VPN egress IPs (Cloudflare CF-Connecting-IP)
# Set as plain text var or secret: "1.2.3.4,5.6.7.8"

# Never set R2_PUBLIC_DOMAIN for the receipts bucket.
# Keep the R2 bucket private; only the Worker binding can read objects.
```

## Deploy after this checklist

```bash
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
npm run deploy
```
