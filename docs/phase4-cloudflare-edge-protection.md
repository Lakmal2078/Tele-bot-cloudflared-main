# Phase 4 — Cloudflare Edge Protection Runbook

This document defines the production edge controls that complement the application-level security added in Phase 4.

## Why this is separate from Worker code

The Worker rate limiter is intentionally lightweight and in-memory. Cloudflare Workers can run in multiple isolates, so an in-memory counter is **not a globally distributed security boundary**. Edge rate limiting should therefore be enforced before requests reach the Worker.

## Recommended rules

Create Cloudflare WAF / Rate Limiting rules for the Worker hostname.

### 1. Admin API protection

Paths:

- `/api/admin/*`
- `/api/cleanup/*`

Recommended baseline:

- Method scope: all methods
- Rate: **10 requests / 60 seconds / IP**
- Action: Managed Challenge or Block
- Use a longer ban period for repeated violations if your Cloudflare plan supports it.

Application authentication remains mandatory. Rate limiting is only an additional layer.

### 2. Webhook flood protection

Path:

- the public Telegram webhook endpoint configured for this Worker

Recommended baseline:

- Method: `POST`
- Rate: **120 requests / 60 seconds / IP** as an initial ceiling
- Action: Managed Challenge / Block depending on observed traffic

Do not use a very low fixed limit here: Telegram can legitimately retry webhook delivery after transient failures.

The application still requires:

- `POST`
- `Content-Type: application/json`
- body <= 512 KiB
- exact `X-Telegram-Bot-Api-Secret-Token`

### 3. Generic API flood protection

For unexpected API paths, use a conservative rule such as:

- `/api/*`
- 60 requests / 60 seconds / IP
- Managed Challenge

Keep the public `/health` endpoint available to monitoring systems. If a health-check provider has a stable source, create an explicit allow rule before a generic block rule.

## Rule ordering

Recommended order:

1. Explicit trusted monitoring allow rules (only when justified)
2. Admin/cleanup rate limit
3. Webhook flood limit
4. Generic `/api/*` protection
5. Cloudflare managed WAF rules

Never add an allow rule that bypasses authentication for `/api/admin/*` or `/api/cleanup/*`.

## Telegram IP allowlisting

Do **not** hard-code a permanent Telegram IP allowlist in application code. Telegram infrastructure can change. The secret-token check is the authoritative webhook authentication mechanism.

If an edge allowlist is introduced later, maintain it as an operational Cloudflare rule with a documented update procedure and keep the Telegram secret check enabled.

## Verification checklist

After creating the rules:

- [ ] Normal Telegram webhook delivery succeeds.
- [ ] Invalid webhook secret returns `401`.
- [ ] Non-POST webhook requests are rejected.
- [ ] Non-JSON webhook requests are rejected.
- [ ] Oversized webhook bodies are rejected.
- [ ] Repeated admin authentication failures are throttled at the edge and application layer.
- [ ] Authenticated admin endpoints remain reachable.
- [ ] `/health` remains available to monitoring.
- [ ] No rule bypasses `ADMIN_API_SECRET` authentication.

## Important limitation

Cloudflare edge rate limiting is the distributed protection layer. `src/rateLimit.ts` and `src/security.ts` remain useful as defense-in-depth, but they must not be treated as globally consistent counters.
