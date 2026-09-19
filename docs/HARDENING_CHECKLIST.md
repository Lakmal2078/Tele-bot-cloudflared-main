# Production hardening checklist (items 1–10)

Status of the requested hardening work for `Tele-bot-cloudflared-main`.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Local DB files out of Git + `.gitignore` | Done | Patterns cover `*.db`, WAL/SHM/journal, `data/**`; keep `data/.gitkeep` |
| 2 | Escape all user input for Telegram Markdown | Improved | `escapeMarkdown` / `escapeCode` / `escapeMarkdownV2` in `src/utils.ts`; use on every user/external string in Markdown replies |
| 3 | R2 log cleanup via Cron Triggers | Already present | `wrangler.toml` cron `0 2 * * *` → `cleanupOldR2Logs` |
| 4 | `user_state` FSM TTL | Done | Request-time TTL in `getUserState` (24h) + cron purge via `cleanupStaleUserStates` |
| 5 | Secure R2 receipt photos | Done | Receipts served only via authenticated `/api/admin/receipts?key=...`; `r2Url` points at Worker proxy |
| 6 | i18n strings → external JSON/YAML | Partial | `src/locales/payment_methods.json` + loader; full `si/en/ta.json` migration documented in `src/locales/README.md` |
| 7 | `adminIds` from environment | Already present | `ADMIN_IDS` via `getAdminIdSet` / `isConfiguredAdminId` in `config.ts` |
| 8 | Structured logging | Improved | `observability.logEvent` with levels + `meta`; R2 audit logs in `logger.ts` |
| 9 | grammY session middleware (long-term) | Scaffolded | `src/sessionStorage.ts` + migration `0008_bot_sessions.sql`; wire with `session()` when migrating handlers |
| 10 | Dependabot vulnerability scans | Already present | `.github/dependabot.yml` (npm + GitHub Actions, weekly) |

## Deploy notes

1. Apply migration: `npx wrangler d1 migrations apply fastxbetcash_bot-db --remote`
2. Ensure `PUBLIC_BASE_URL` is set so receipt proxy URLs are absolute.
3. Do not make the R2 bucket publicly readable; admins use the proxy endpoint only.
