# Remediation Plan

## PHASE 1 — CRITICAL SECURITY

### Task SEC-01: Finalize admin security review and secret rotation policy
- Affected files: `src/config.ts`, `src/adminSession.ts`, `src/security.ts`, `scripts/setup-cf-secrets.sh`
- Problem: Critical admin and webhook secrets are production-sensitive and require disciplined rotation and safe handling.
- Proposed fix: Review all runtime secret usage, rotate secrets if any suspicion exists, and make secret handling policy explicit in deployment docs.
- Risk: High if production secrets are exposed or stale.
- Testing required: Check admin login flow, webhook validation flow, and session invalidation after rotation.
- Rollback consideration: Revert secret values only after verifying zero-downtime redeploy processes.

## PHASE 2 — HIGH SECURITY

### Task SEC-02: Restrict broad CORS exposure
- Affected files: `src/apiRoutes.ts`, `src/security.ts`
- Problem: Some public endpoints use wildcard CORS.
- Proposed fix: Restrict CORS to only the resources that require cross-origin access.
- Risk: Medium
- Testing required: Validate browser access and API behavior for all public endpoints.
- Rollback consideration: Minimal; can be reverted by narrowing allowed origins.

### Task SEC-03: Legal/compliance review for betting marketing claims
- Affected files: `src/landingPage.ts`, `src/apiRoutes.ts`, `public/*`, `README.md`
- Problem: Gambling-related operations need legal/regulatory review for promotional claims and age/responsible-gambling messaging.
- Proposed fix: Add explicit responsible-gambling disclosures and review marketing text in a legal context.
- Risk: High in regulated markets
- Testing required: Content review and legal sign-off.
- Rollback consideration: Content changes are reversible if the review rejects the wording.

## PHASE 3 — TRANSACTION / DATA INTEGRITY

### Task TX-01: Add formal idempotency and reconciliation guards
- Affected files: `src/db.ts`, `src/fraud.ts`, `src/tipsSettlement.ts`, `src/bot.ts`
- Problem: Financial and transaction workflows need strong idempotency and reconciliation checks.
- Proposed fix: Introduce transaction IDs and dedupe checks on deposit/withdrawal and tip settlement paths.
- Risk: High
- Testing required: Duplicate request tests, race-condition tests, and settlement reconciliation tests.
- Rollback consideration: Safe if implemented behind feature flags or additive schema changes.

## PHASE 4 — PERFORMANCE

### Task PERF-01: Document and harden public asset and API caching strategy
- Affected files: `src/apiRoutes.ts`, `src/worker.ts`, `wrangler.toml`
- Problem: Public-facing resources may need stronger cache hygiene and rate validation.
- Proposed fix: Review asset cache TTL and optimize for bot/public route behavior.
- Risk: Medium
- Testing required: Route latency checks and content validation.
- Rollback consideration: Low-risk, mostly header-only changes.

## PHASE 5 — UX / ACCESSIBILITY

### Task UX-01: Review landing-page accessibility and responsive behavior
- Affected files: `src/landingPage.ts`, `public/*`
- Problem: Marketing-heavy pages need keyboard accessibility and responsive design validation.
- Proposed fix: Verify focus states, ARIA labeling, and viewport layouts at common breakpoints.
- Risk: Medium
- Testing required: Manual/browser testing on mobile and desktop views.
- Rollback consideration: Low-risk visual-only changes.

## PHASE 6 — CODE QUALITY

### Task CQ-01: Consolidate and document business logic boundaries
- Affected files: `src/worker.ts`, `src/bot.ts`, `src/db.ts`, `src/tips.ts`, `src/tipsSettlement.ts`
- Problem: Business logic spans many modules, making maintenance harder.
- Proposed fix: Split flow orchestration into clearer service boundaries.
- Risk: Medium
- Testing required: Focused integration tests for bot actions and scheduled jobs.
- Rollback consideration: Low if done incrementally.

## PHASE 7 — TESTING

### Task TEST-01: Expand integration coverage
- Affected files: `tests/*.test.ts`
- Problem: Validated tests exist, but critical finance and bot edge cases need coverage.
- Proposed fix: Add tests for duplicate submissions, webhook replay, admin authorization, and wrong-status transitions.
- Risk: Medium
- Testing required: Full test suite and targeted negative-path tests.
- Rollback consideration: Low; tests are additive.

## PHASE 8 — DOCUMENTATION

### Task DOC-01: Publish formal deployment and incident runbooks
- Affected files: `README.md`, `docs/*.md`, `SECURITY.md`
- Problem: Operational details are partly documented but not always production-specific.
- Proposed fix: Create a runbook for deployment, rotate secrets, cron failures, and incident response.
- Risk: Low to Medium
- Testing required: Review by operator and maintainer.
- Rollback consideration: Documentation-only, low risk.

## PHASE 9 — PRODUCTION HARDENING

### Task PROD-01: Formalize monitoring and alerting
- Affected files: `src/observability.ts`, `src/logger.ts`, `src/worker.ts`
- Problem: Operational logging is present, but formal alerting and health checks are still weakly defined.
- Proposed fix: Add health endpoints, alert thresholds, and error dashboards.
- Risk: Medium
- Testing required: Simulate failures and verify alerts.
- Rollback consideration: Safe if implemented non-blockingly.
