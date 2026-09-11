# Phase 1 Security Hardening

## Required secrets

Production now fails closed unless these secrets are configured:

- `BOT_TOKEN`
- `ADMIN_IDS`
- `WEBHOOK_SECRET` (minimum 16 characters)
- `ADMIN_API_SECRET` (minimum 24 characters; dedicated to private HTTP operations)
- `ODDS_API_KEY` when automated tips are enabled

Set them with Wrangler, for example:

```bash
npx wrangler secret put ADMIN_API_SECRET
```

Do not put secret values in `wrangler.toml` or commit them to Git.

## Private operational endpoints

The following endpoints require `Authorization: Bearer <ADMIN_API_SECRET>` or `X-Admin-Secret`:

- `GET /api/cleanup/logs/status`
- `POST /api/cleanup/logs`
- `GET /api/admin/status`

The public `/health` and `/api/health` endpoints intentionally expose only service liveness.

## Telegram webhook

Cloudflare Worker webhook requests must include the exact `X-Telegram-Bot-Api-Secret-Token` value configured as `WEBHOOK_SECRET`. Missing or incorrect values are rejected with HTTP 401.

## Financial state transitions

Deposit and withdrawal approval/rejection use conditional updates that only transition records from `PENDING`:

```sql
UPDATE deposits
SET status = ?, updated_at = datetime('now')
WHERE id = ? AND status = 'PENDING' AND deleted_at IS NULL;
```

and the equivalent withdrawal statement.

The database helpers return `false` when no row was changed. Admin handlers treat that result as a concurrent/already-processed transaction and do not perform a second approval/rejection action.
