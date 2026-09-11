# Phase 4 — Security & Abuse Protection

## Implemented

- Webhook accepts only `POST` requests with `Content-Type: application/json`.
- Webhook bodies are rejected when `Content-Length` exceeds 512 KiB.
- Telegram webhook secret remains fail-closed.
- Public health endpoints expose liveness only.
- `/api/admin/status` is restored as an authenticated private endpoint.
- Admin diagnostic endpoints accept only their intended HTTP methods.
- Invalid admin credentials are throttled per client within each Worker isolate.
- Security headers are applied to Worker responses, including JSON and HTML responses.
- Telegram updates are protected by global/per-user bot rate limits.
- Deposit and withdrawal submissions have stricter D1-backed rate limits (3 submissions per 10 minutes).
- Duplicate receipt protection is enforced at the D1 `BEFORE INSERT` boundary for different Telegram users.
- Exact duplicate pending withdrawals are rejected at the D1 `BEFORE INSERT` boundary.
- Active-receipt and pending-withdrawal indexes support the fraud guards without changing historical/soft-deleted records.
- Admin approve/reject callbacks require an allow-listed admin Telegram ID and use conditional database state transitions, so replayed/stale buttons cannot approve or reject an already-processed transaction.
- Fraud checks remain available for admin review, while high-confidence duplicate submission controls are enforced before a new transaction can be accepted.
- Security tests cover webhook validation, oversized requests, admin throttling, headers, duplicate transaction guards, fraud controls, and callback authorization/state-transition safeguards.

## Important deployment note

The admin credential throttle is defense-in-depth and is **not a globally distributed rate limit**. Cloudflare Workers may execute requests in different isolates/locations. For stronger production protection, configure Cloudflare WAF/Rate Limiting in front of admin endpoints and keep `ADMIN_API_SECRET` long and random.

The database duplicate guards are deliberately stricter than the lower-confidence shared-player-ID fraud flag. A shared player ID alone is not treated as proof of fraud, avoiding false-positive blocking for legitimate cases.

## Recommended secret generation

```bash
openssl rand -base64 32
```

Set it as a Cloudflare secret and never commit the value:

```bash
npx wrangler secret put ADMIN_API_SECRET
```

## Verification

After deployment, verify:

1. `GET /health` returns only service liveness.
2. `POST /` without the Telegram secret returns `401`.
3. `POST /` with a non-JSON content type returns `400`.
4. `GET /api/admin/status` without the admin secret returns `401`.
5. `GET /api/admin/status` with the admin secret returns `200`.
6. `POST /api/cleanup/logs/status` returns `405`.
7. Repeated invalid admin credentials are throttled.
8. Submitting the same receipt from another Telegram account is rejected by D1 before a transaction row is created.
9. Re-submitting the same receipt from the same Telegram account remains allowed for legitimate correction/retry behavior.
10. An exact duplicate pending withdrawal is rejected, while a different withdrawal remains allowed.
11. Replayed admin approve/reject callbacks cannot change a non-`PENDING` transaction.
12. CI runs TypeScript checks, migration validation, and all security tests before deployment.
