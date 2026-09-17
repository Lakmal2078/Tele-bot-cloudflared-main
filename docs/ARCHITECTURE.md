# Architecture

## Runtime

The production entry point is `src/worker.ts`. Cloudflare Workers handles HTTP requests and scheduled events. `src/index.ts` is the Node.js local-preview runtime.

```text
Telegram
   │ webhook + secret
   ▼
Cloudflare Worker (src/worker.ts)
   ├── API routes / health / admin
   ├── Grammy bot handlers
   ├── scheduled jobs
   │    ├── free tips 08:00 / 12:00 / 18:00 SL
   │    ├── hourly settlement
   │    └── R2 cleanup
   │
   ├── D1 ── transactional application state
   ├── R2 ── chat/media objects
   └── The Odds API ── sports discovery/odds data
```

## Data boundaries

- **D1** stores users, transactions, support state, tips, settlement state, and audit records.
- **R2** stores uploaded media and operational log objects where configured.
- **Cloudflare Secrets** store credentials and API keys.
- **GitHub Actions Secrets** are used only for CI/CD authentication.

## Request lifecycle

1. Generate a request ID.
2. Dispatch known API routes.
3. Serve static assets through Cloudflare's asset layer where configured.
4. Validate webhook method, content type, body size, and Telegram secret.
5. Initialize/reuse the bot instance for the Worker isolate.
6. Process the Telegram update.
7. Emit a structured request log and `X-Request-ID` response header.

## Reliability model

Scheduled work is written to be retry-safe. D1 migrations are versioned and validated in CI. Production deployment occurs only after quality gates pass.
