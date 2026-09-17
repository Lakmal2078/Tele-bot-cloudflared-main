# Security Policy

## Scope

This project is a production-oriented Cloudflare Workers application. Security-sensitive areas include Telegram webhook authentication, administrator APIs, payment/financial workflows, D1 persistence, R2 object storage, scheduled jobs, and external sports-data integrations.

## Supported version

The `main` branch is the actively maintained production branch.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for a suspected vulnerability.

Report security issues privately through the repository owner's GitHub security contact or GitHub's private vulnerability reporting mechanism when enabled for the repository. Include:

- affected endpoint, workflow, or component;
- reproduction steps or a minimal proof of concept;
- expected versus actual behavior;
- potential impact;
- relevant logs with tokens, secrets, personal data, and payment details removed.

Do not include Telegram bot tokens, Cloudflare API tokens, database credentials, R2 credentials, webhook secrets, admin secrets, or real customer/payment information in a report.

## Security expectations

- Secrets belong in Cloudflare Secrets or GitHub Actions secrets, never in source control.
- Telegram webhook requests must use the configured secret validation path.
- Administrative HTTP endpoints must remain authenticated.
- Financial state transitions must remain atomic and idempotent.
- D1 access must use parameterized/prepared statements.
- R2 objects containing sensitive media must not be exposed through unrestricted public paths.
- Rate limits and abuse/fraud controls must not be bypassed for convenience.
- Production deployments must pass the repository quality gates.
- D1 schema changes must be forward-only versioned migrations and must pass migration validation.

## Before merging security-sensitive changes

Run:

```bash
npm ci
npm run lint
npm test
npm run validate:migrations
bash -n deploy.sh
npm audit --omit=dev --audit-level=high
```

Also review the diff for accidental secrets, debug endpoints, authentication bypasses, unsafe SQL, unrestricted storage access, and changes to cron-triggered financial or publishing workflows.

## Disclosure

Please allow reasonable time for investigation and remediation before publicly disclosing a vulnerability. Security fixes should be released with enough operational documentation for safe deployment and rollback.