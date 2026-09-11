# D1 migrations

Database changes are managed as ordered, versioned Cloudflare D1 migrations.

## Rules

- Migration files use the format `<number>_<description>.sql`.
- Once a migration has been applied to production, **do not edit or delete it**.
- Add a new migration for every schema change.
- Keep migrations forward-only and safe to apply in CI/CD.
- Use `wrangler d1 migrations apply` for production changes.

## Migrations

- `0001_initial_schema.sql` — baseline users, deposit, withdrawal, referral, state and admin-audit schema.
- `0002_tip_posts.sql` — scheduled free-tip publishing records and slot idempotency.
- `0003_financial_integrity.sql` — durable D1 financial audit triggers plus scheduled-tip lease/recovery fields.

## Existing production databases

`0001_initial_schema.sql` is the baseline schema migrated from the legacy root `schema.sql`.

For an existing production database, bootstrap migration history deliberately before switching automated deployments to migrations. Do **not** blindly apply the initial migration to a database that already contains these tables without first confirming Wrangler/D1 migration history, because the migration file represents the baseline state rather than a delta.

## Local workflow

```bash
npx wrangler d1 migrations list fastxbetcash_bot-db --local
npx wrangler d1 migrations apply fastxbetcash_bot-db --local
```

## Remote / production workflow

```bash
npx wrangler d1 migrations list fastxbetcash_bot-db --remote
npx wrangler d1 migrations apply fastxbetcash_bot-db --remote
```

Production migrations should be reviewed as part of the pull request before they are applied.
