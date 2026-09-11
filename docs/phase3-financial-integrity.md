# Phase 3 — Database & Financial Integrity

Phase 3 hardens the parts of the bot that can affect financial records and scheduled tip delivery without inventing a local wallet balance that the current application does not maintain.

## What was implemented

### 1. Durable database-side financial audit trail

Migration `0003_financial_integrity.sql` adds `financial_audit` and database triggers for:

- deposit creation
- withdrawal creation
- `PENDING -> APPROVED`
- `PENDING -> REJECTED`
- soft deletion

The audit trail lives in D1 and is not subject to the R2 30-day log cleanup.

Existing deposit/withdrawal rows are backfilled as `CREATED` events with their current status.

### 2. Atomic financial state transitions

The existing application transitions remain conditional:

```sql
UPDATE deposits
SET status = ?
WHERE id = ?
  AND status = 'PENDING'
  AND deleted_at IS NULL;
```

and the equivalent withdrawal update. Only the first concurrent admin action can change a pending record. A second approval/rejection receives `false` and cannot apply a second transition.

### 3. Scheduled-tip lease / concurrency protection

`tip_posts` now has:

- `lease_token`
- `lease_expires_at`
- `attempt_count`

The scheduler uses `INSERT OR IGNORE` followed by an ownership lease. This prevents two overlapping cron executions from both publishing the same slot and, importantly, prevents a unique-key race from incorrectly marking the winning worker's row as `FAILED`.

Stale `PROCESSING` work can be reclaimed after the lease expires.

### 4. Odds API resilience

The Odds API client now retries `429` and `5xx` responses with bounded backoff and honors a numeric `Retry-After` value when available.

### 5. Tip send ambiguity is handled safely

Telegram delivery and D1 state updates are two separate systems, so literal exactly-once external delivery cannot be guaranteed by a single transaction. If Telegram confirms a message but the lease ownership is lost before D1 can record `POSTED`, the worker returns `sent_unconfirmed` and does not mark the row `FAILED` for blind retry.

This is intentionally safer than retrying a confirmed Telegram send and potentially publishing a duplicate.

## Important architecture note

The current schema does **not** maintain a bot-side monetary balance for users. Deposits and withdrawals are request records whose approval status is tracked; the user's actual 1xBet account balance is external to this D1 database.

Therefore Phase 3 does not add a fabricated `users.balance` column or implement a wallet ledger that would not represent the real source of funds. If a real internal wallet is introduced later, it must use atomic balance mutations, an immutable ledger, idempotency keys, and concurrency tests before being enabled in production.

## Validation

New tests cover:

- Sri Lanka scheduled cron slots
- candidate selection rules
- migration safeguards and database-side audit triggers
- tip lease schema requirements

Run locally:

```bash
npm ci
npm run lint
npm test
npm run validate:migrations
```

Production deployment continues to apply D1 migrations before the Worker deployment and refuses migration bypass flags in CI.
