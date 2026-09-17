# Production Operations

## Deploy

Production deployment is performed by GitHub Actions after quality gates. The canonical deployment command is `npm run deploy:cf:ci`.

## Pre-deploy checks

```bash
npm ci
npm run lint
npm test
npm run validate:migrations
bash -n deploy.sh
npm audit --omit=dev --audit-level=high
```

## Health checks

- `/health` — configuration-oriented health response.
- `/api/status` — lightweight public reachability status.
- `/og-image.jpg` — canonical static OpenGraph asset.

## Incident response

1. Check the latest GitHub Actions run.
2. Check Worker logs using the request ID returned in `X-Request-ID`.
3. Inspect `/health` for configuration problems without exposing secret values.
4. For secret exposure, revoke/rotate the affected credential immediately.
5. For database changes, stop further deployment and inspect the migration history before rollback decisions.

## Scheduled jobs

The production Worker has five cron triggers:

- `0 2 * * *` — R2 cleanup.
- `30 2 * * *` — 08:00 Sri Lanka free tips.
- `30 6 * * *` — 12:00 Sri Lanka free tips.
- `30 12 * * *` — 18:00 Sri Lanka free tips.
- `15 * * * *` — hourly tip settlement.

All schedules are expressed in UTC in `wrangler.toml`.

## Rollback

Do not manually edit production state to compensate for a failed deployment. Identify the last known-good commit, verify migration compatibility, and use the repository's controlled deployment path. Database migrations are forward-only; application rollback must therefore remain compatible with the current schema.
