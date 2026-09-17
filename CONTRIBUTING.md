# Contributing

## Development flow

1. Create a focused branch from `main`.
2. Make the smallest safe change that solves the problem.
3. Add or update tests for behavior changes.
4. Run `npm run lint`, `npm test`, and `npm run validate:migrations`.
5. Run `bash -n deploy.sh` for deployment-script changes.
6. Open a pull request with a clear risk/rollback note for production-impacting changes.

## Architecture rules

- Keep `src/worker.ts` as the Cloudflare Worker entry point.
- Keep Node-only local preview behavior in `src/index.ts`.
- Use D1 prepared statements and versioned migrations.
- Keep secrets out of source control and `.env` files out of commits.
- Preserve Telegram webhook authentication and admin authorization controls.
- Prefer structured logs that never contain tokens, request bodies, payment credentials, or unnecessary personal data.
- Keep scheduled jobs idempotent so retries do not duplicate financial or publishing actions.

## Pull request checklist

- [ ] Tests added/updated.
- [ ] Type-check passes.
- [ ] Migration validation passes when schema changes are included.
- [ ] No secrets or sensitive data were added.
- [ ] Security-sensitive behavior was reviewed.
- [ ] README/docs updated when operational behavior changes.
- [ ] Rollback/recovery impact considered.
