# Phase 2 — CI/CD and deployment safety

## Production deployment model

There is now exactly one GitHub Actions workflow capable of deploying production:

- `.github/workflows/ci-cd.yml`
- Pull requests: quality gates only.
- Pushes to `main`: quality gates, then one production deployment.
- `workflow_dispatch`: uses the same workflow; the deploy job still requires the `main` push condition, so manual runs do not create a second deployment path.
- Production concurrency is serialized with `production-deploy` and `cancel-in-progress: false`.

The old duplicate workflows were removed:

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

## Wrangler pinning

Wrangler is pinned to the exact version already present in the lockfile:

```text
4.131.0
```

Do not change this to `latest` in CI. A dependency update should intentionally update both `package.json` and `package-lock.json`, then pass all quality gates.

## D1 migration ordering

Production deployment follows this order:

1. `npm ci`
2. validate migration filenames/numbers and migration safety
3. TypeScript checks
4. unit tests
5. verify the pinned Wrangler version
6. verify Cloudflare authentication
7. inspect remote D1 migration state
8. apply pending D1 migrations
9. deploy the Worker
10. run `/health`

Migrations are applied before the new Worker is deployed because the Worker may require the new schema immediately after rollout.

To avoid breaking the currently deployed Worker while the migration is being applied, `scripts/validate-migrations.mjs` blocks these potentially destructive operations by default:

- `DROP TABLE`
- `DROP COLUMN`
- `DROP INDEX`
- `DROP VIEW`
- `DROP TRIGGER`
- `ALTER TABLE ... DROP COLUMN`
- `ALTER TABLE ... RENAME ...`

For a real breaking schema change, use a multi-release expand/contract migration strategy rather than bypassing the guard. `ALLOW_BREAKING_MIGRATIONS=1` is intentionally forbidden in CI.

## CI safety gates

Production CI refuses to run when any of these bypass flags are set:

- `SKIP_LINT=1`
- `SKIP_TESTS=1`
- `SKIP_MIGRATION=1`
- `SKIP_HEALTHCHECK=1`
- `ALLOW_BREAKING_MIGRATIONS=1`

This keeps the local deployment escape hatches from becoming production deployment shortcuts.

## Local deployment

For a normal local deployment:

```bash
npm ci
npm run validate:migrations
npm run lint
npm test
npm run deploy:cf
```

The deployment script asks for confirmation before changing production. `ALLOW_DIRTY=1` is available only for intentional local deployments with uncommitted changes.
