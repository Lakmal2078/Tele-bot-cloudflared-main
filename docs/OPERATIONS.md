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

## D1 backups

The `.github/workflows/d1-backup.yml` workflow is a **manual-only production D1 export**. It is intentionally not scheduled: Cloudflare documents that a remote D1 export can make the database unavailable to serve queries while the export runs. Trigger it only during an approved low-traffic maintenance window.

### One-time GitHub configuration

1. In GitHub repository Settings → Environments, create an environment named `production-backup`.
2. Configure required reviewers for that environment. Do not allow the backup job to run without an operator approval.
3. Add environment secrets:
   - `CLOUDFLARE_API_TOKEN`: a narrowly scoped Cloudflare API token with D1 read plus R2 object read and write permissions for the required account.
   - `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account identifier.
4. Confirm the private bucket `xbet-bot-backups-private` exists, has no public `r2.dev` domain or custom public domain, and is in the intended account.

### Run and verify

1. Open Actions → Manual D1 backup → Run workflow.
2. Review the target database and maintenance window before approving the `production-backup` environment gate.
3. The workflow exports `fastxbetcash_bot-db`, compresses the SQL dump, computes SHA-256, and uploads the archive, checksum, and JSON manifest under `backups/d1/<UTC timestamp>/`.
4. It downloads the uploaded archive from R2 and compares its SHA-256 with the source checksum. A successful job confirms upload/read-back integrity, not a full restore.
5. Treat the archive as sensitive production data. Keep the bucket private and restrict access to the smallest practical set of operators.

The workflow does not delete older backups and no retention period is configured. Define and approve a retention policy before enabling automatic cleanup. The workflow also does not back up R2 receipt/media objects; that requires a separate data-classification and retention decision.

### Restore drill

A backup is not considered recoverable until it has been restored and validated in the isolated staging D1 database. Do not restore a production dump into the production database as a test. The staging database is currently a separate empty resource; migration/schema preparation and a controlled restore validation remain outstanding.

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
