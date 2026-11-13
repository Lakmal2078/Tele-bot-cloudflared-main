# Production Operations

## Deploy

Production deployment is performed by GitHub Actions after quality gates. A push to `main` (including a merge) triggers the production workflow. The workflow uses `npm run deploy:cf:ci`; do not run that production deployment command as a local validation step.

For local secret provisioning, use `npm run secrets:cf`. The script prompts without echoing entered values and can generate secure secrets. Alternatively, provision an individual value with `npx wrangler secret put SECRET_NAME`. Never place secret values in source control, command-line arguments, or issue comments.

## Pre-deploy checks

Run these checks on the feature branch:

```bash
npm ci
npm run lint
npm test
npm run validate:migrations
bash -n deploy.sh
npm run audit:deps
```

The CI deployment workflow performs the quality gates and migration validation before deployment. Review its result and the deployment health-check result after merging; a successful merge alone is not evidence that production operations were manually verified.

## Health checks

- `/health` (also `/api/health`) — readiness/configuration check. Returns a non-success response when required Worker configuration is invalid; it does not prove that every downstream integration is healthy.
- `/api/status` — lightweight public reachability/status response; not a full dependency or readiness check.
- `/og-image.jpg` — canonical static OpenGraph asset.

The deployment script uses `/health` by default for its post-deploy check. Do not paste health response bodies containing operational details into public tickets; never expose secret values.

## R2 analytics

The admin R2 analytics endpoint processes at most **10 pages per request**, with each R2 listing page limited to **1,000 objects** (maximum 10,000 objects per request). It alternates between the `receipts/` and `logs/` prefixes so a large receipts prefix cannot starve log totals. Only one page at a time is retained in memory.

When a scan spans multiple requests, the endpoint returns cumulative counts and byte totals plus a signed continuation token. The admin dashboard carries that token in the `X-R2-Analytics-Continuation` request header on its next poll. Tokens are HMAC-signed with the admin API secret (or webhook secret fallback) and bound to the configured bucket; they must not be copied into public tickets or logs. The dashboard labels totals as scanning until both prefixes are complete. A new scan begins after completion.

A transient R2 listing failure returns an unavailable response rather than a misleading zero total. Retry the same continuation token to resume from the last successfully returned batch. Repeated, missing, malformed, or stale continuation state should be treated as a scan failure and restarted from the dashboard.

Worker logs record page/object counts and per-prefix completion state only; object keys and raw continuation cursors are not logged.

## Admin settlement override

The historical tip settlement override route is `POST /api/admin/tips/settlement/override`. It requires an authenticated admin session or the shared `ADMIN_API_SECRET` credential in `Authorization: Bearer <secret>` or `X-Admin-Secret`. A caller-supplied `X-Admin-Id` is not an identity assertion and must not be used as proof of the actor. The audit record attributes shared-secret requests to the sentinel actor `shared-admin-secret`.

The request body must include `tipPostId`, `eventId`, `outcome` (`WON`, `LOST`, or `VOID`), and a non-empty audit `note`. Treat this operation as a privileged, audited correction.

## Incident response

1. Check the latest GitHub Actions run and identify whether the failure occurred in quality gates, migration application, deployment, or the post-deploy health check.
2. Check Worker logs using the request ID returned in the `X-Request-ID` response header.
3. Inspect `/health` for configuration problems without exposing secret values.
4. For secret exposure, revoke/rotate the affected credential immediately.
5. For database changes, stop further deployment and inspect the migration history before rollback decisions.

## Scheduled jobs

The five cron triggers are declared in `wrangler.toml` (UTC) and dispatched by `src/worker.ts`:

| Cron (UTC) | Sri Lanka time (UTC+05:30) | Behavior |
|---|---:|---|
| `0 2 * * *` | 07:30 daily | R2 log cleanup and expired rate-limit record cleanup |
| `30 2 * * *` | 08:00 daily | Free tips slot 1 |
| `30 6 * * *` | 12:00 daily | Free tips slot 2 |
| `30 12 * * *` | 18:00 daily | Free tips slot 3 |
| `*/5,7,22,37,52 * * * *` | Every five minutes, plus minutes 07, 22, 37, 52 | Pending-tip settlement every five minutes; Odds API health checks additionally at minutes 07, 22, 37, and 52 |

The free-tip slot values are defined by `TIPS_CRONS` in `src/tips.ts`; the combined maintenance trigger is defined by `WORKER_CRONS` in `src/worker.ts`. Keep this table synchronized with both files and `wrangler.toml`. Scheduled handlers must be safe to retry.

## Rollback

Do not manually edit production state to compensate for a failed deployment. Identify the last known-good commit, verify migration compatibility, and use the repository's controlled deployment path. Database migrations are forward-only; application rollback must therefore remain compatible with the current schema.
