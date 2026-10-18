# Deep Audit Report

Date: 2026-10-18
Scope: whole repository (`src/`, `migrations/`, `public/`, `wrangler.toml`, docs, tests)
Method: source review of every runtime/security-critical module, static analysis, targeted greps,
HTTP sweep of the running app, live browser verification of the public page, and the full test suite.

## 1. Baseline — what is healthy

Measured on the running stack (Node preview runtime, `tsx watch src/index.ts`):

| Check | Result |
|---|---|
| `npm test` (vitest) | **222 passed / 222**, 25 files |
| `npx eslint .` | clean |
| `npx tsc --noEmit` | clean |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `GET /` | 200, landing page renders |
| `GET /api/status` | 200 `{status:"online"}` |
| `GET /admin` (no session) | 200 login form only, no business data |
| `GET /api/admin/*` (no secret) | 401 |
| `POST /admin/login` (bad secret) | 401 |
| `GET /privacy`, `/robots.txt`, `/sitemap.xml` | 200 |
| unknown path / unknown `/api/*` | real 404 (not the homepage) |

Security primitives that are genuinely in place: constant-time secret comparison (`config.ts`),
HMAC-signed admin session cookie instead of secrets in URLs (`adminSession.ts`), `ADMIN_IDS`
allowlisting for admin identity, CSP nonces on every rendered page, webhook secret-token
validation + body-size/`Content-Type` gate, admin failure throttling, soft deletes plus a durable
`admin_actions` trail, receipts stored privately and served only through the authenticated proxy,
security codes stored only as HMAC with a pepper, and fail-closed handling when the admin secret is
absent.

The findings below are the gaps on top of that baseline. Runtime note: production is the
Cloudflare Worker (`wrangler.toml` → `src/worker.ts`); the Node server (`src/index.ts`) is the
local/self-hosted runtime and is what the preview uses. Findings marked **[Node runtime]** do not
affect the deployed Worker but are real for the preview and for any Node/VPS deployment.

## 2. P0 — high impact

### P0-1 The documented cashier/compliance gate (`CASHIER_ENABLED`) is not implemented
- **Evidence:** `wrangler.toml` sets `CASHIER_ENABLED = "false"` ("Safety gate: keep cashier
  functionality disabled until legal, partner, and payment-provider approvals are verified") and
  `docs/COMPLIANCE_GATE.md` / `docs/ENVIRONMENT_AUDIT.md` state the gate is enforced and that
  "missing payment destinations must fail closed". `grep -rn "CASHIER_ENABLED" src/` returns **0
  hits** — no code reads it. Deposit and withdrawal flows are therefore active regardless of the
  setting.
- **Why it matters:** the repository's own go/no-go gate (Sri Lanka Gambling Regulatory Authority
  Act, partner authorization, payment-rail legality) depends on this switch. A documented control
  that does not exist is worse than an undocumented one: it reads as verified.
- **Fix (smallest):** read the flag in the bot's deposit/withdraw entry points and reply with a
  compliance notice when it is not exactly `"true"` (fail closed on unset), or drop the claim from
  `wrangler.toml` + docs if the intent changed. Add a unit test that the entry point refuses when
  the flag is unset/false.
- **Verification:** code fact confirmed by grep; the bot flow itself was **not** exercised here
  (no `BOT_TOKEN` in this environment) — needs a unit test or a live bot check.

### P0-2 [Node runtime] Static assets are never served → landing-page images 404
- **Evidence:** the landing page references `/assets/telegram/01-hero-telegram-bot.jpg`,
  `02-free-tips-sports.jpg`, `04-telegram-bot-ui.jpg`, `03-deposit-withdraw.jpg`,
  `06-security-support.jpg`. `curl -o /dev/null -w '%{http_code}' http://localhost:3000/assets/telegram/01-hero-telegram-bot.jpg`
  → **404** (`text/plain`). In the browser the page reports
  `/assets/telegram/01-hero-telegram-bot.jpg -> 404`, `…02… -> 404`, `…04… -> 404`, 3 broken
  `<img>`s (`naturalWidth === 0`), and 3 console errors "Failed to load img assets/telegram/…".
- **Cause:** `src/index.ts` falls through to a hard 404 for every non-root GET; only the paths that
  `apiRoutes.ts` special-cases (favicon, logo, `manifest.json`, `og-image.*`, `bot-description…`)
  are reachable. `env.ASSETS` exists in the Node runtime but is only consulted for a couple of
  routes, never as the general static fallback the Worker uses.
- **Impact:** the hero and three section background graphics are missing in the preview (visible in
  the current home page), and any self-hosted Node deployment ships the same broken page. `/assets/**`
  is also not covered by the MIME map (see P0-4).
- **Fix:** mirror `worker.ts` — before the 404 branch, try `env.ASSETS.fetch(request)` for
  `GET`/`HEAD` and serve a 200 response; keep the existing 404 otherwise.
- **Status:** fixed in `src/index.ts`. All five `/assets/telegram/*.jpg` now return `200 image/jpeg`
  and load in the browser; unknown paths still return a real 404.

### P0-3 [Node runtime] `/api/tips/preview` returns 404 → the live tips feed never loads
- **Evidence:** `curl http://localhost:3000/api/tips/preview` → **404**
  `{"ok":false,"error":"Not found"}`. In the browser the tips badge stays **"Sample preview"** and
  the feed falls into its error branch.
- **Cause:** the route is implemented only in `src/worker.ts`
  (`if (path === "/api/tips/preview") …`) and not in the shared `handleApiRequest()`, so the Node
  runtime has no such endpoint while the landing page always fetches it.
- **Fix:** move the `/api/tips/preview` (and, for parity, the other Worker-only read routes) into
  `handleApiRequest()` so both runtimes serve it from one implementation.
- **Status:** fixed in `src/index.ts` (route handled next to `/api/status`, mirroring `worker.ts`;
  the remaining Worker-only read routes still need the shared-handler move). The landing page's own
  fetch now gets `200 application/json`.

### P0-4 [Node runtime] Wrong `Content-Type` for `.json`/manifest (and non-png/ico/svg assets)
- **Evidence:** `curl -I http://localhost:3000/manifest.json` → `200 application/octet-stream`
  (should be `application/manifest+json` / `application/json`). `localAssetsFetcher` in
  `src/index.ts` maps only `.png`, `.ico`, `.svg` and defaults everything else — including `.jpg`,
  `.webp`, `.json`, `.css`, `.js`, `.txt`, `.xml`, `.html` — to `application/octet-stream`.
- **Impact:** browsers/installers reject the PWA manifest served with that type, and any non-png
  asset would be mishandled on the Node runtime.
- **Fix:** a small extension→MIME map (json/webmanifest, jpg/jpeg, webp, css, js, txt, xml, html,
  svg, ico, png) in the same helper that P0-2 routes through.
- **Status:** fixed in `src/index.ts` (`CONTENT_TYPES`); `/manifest.json` is now
  `200 application/json; charset=utf-8` and `.jpg` is `image/jpeg`.

## 3. P1 — medium

### P1-5 [Node runtime] The `Env` object is a hand-maintained subset of `process.env`
- **Evidence:** `src/index.ts` builds `env` from an explicit list. Variables read elsewhere in
  `src/` but never copied into it: `SECURITY_CODE_PEPPER`, `PUBLIC_BASE_URL`, `BOT_MODE`,
  `BOT_USERNAME`, `ADMIN_IP_ALLOWLIST`, `COMMERCIAL_DETAILS`, `SAMPATH_DETAILS`, `HNB_DETAILS`,
  `BOC_DETAILS`, `PEOPLES_DETAILS`, `LOLC_DETAILS`, `BINANCE_PAY_ID`, `USDT_TRC20_ADDRESS`,
  `USDT_BEP20_ADDRESS`, `CHAT_MEDIA`, `CASHIER_ENABLED`. Counts: 7 uses of `env.PUBLIC_BASE_URL`,
  6 of `env.BOT_USERNAME`, 2 of `env.SECURITY_CODE_PEPPER`, 0 wired.
- **Concrete consequences on the Node runtime:**
  - `bot.ts:1162` refuses every withdrawal ("SECURITY_CODE_PEPPER is missing or too short") even
    when the operator configured it in the environment — the pepper never reaches `env`.
  - `/api/telegram/webhook` `setWebhook` always fails with `PUBLIC_BASE_URL is required to register
    a webhook`, so a self-hosted Node deployment cannot register its webhook.
  - 5 of 7 bank options render "temporarily unavailable" (`COMMERCIAL/SAMPATH/HNB/BOC/PEOPLES`)
    because `env.*_DETAILS` is undefined.
  - `ADMIN_IP_ALLOWLIST` is silently ignored (the IP gate cannot be enabled on Node).
  - `BOT_USERNAME`, `BOT_MODE` and `CHAT_MEDIA` are absent → OG image handles fall back to
    hardcoded defaults and the native R2 binding is never used.
- **Fix:** build `env` from one explicit key list (or spread `process.env`) so a variable can never
  be added to `types.ts` and forgotten here.

### P1-6 [Node runtime] Admin brute-force protection is bypassable / globally shared
- **Evidence:** `src/security.ts` keys the failure bucket on `CF-Connecting-IP`
  (`clientKey`, `clientKeyFromNodeHeaders`). In the Node runtime that header is client-supplied —
  `nodeToWebRequest()` copies request headers verbatim and the sandbox proxy does not set it. So an
  attacker can send a different `cf-connecting-ip` per attempt and never hit the 10-failures/minute
  limit; conversely, if no client sends it, every visitor shares the `"unknown-client"` bucket and
  10 bad attempts a minute lock the real admin out.
- **Fix:** derive the client identity from the transport/proxy chain on the Node runtime (e.g. the
  socket address, or a single explicitly configured proxy header) and ignore a client-supplied
  `CF-Connecting-IP` outside Cloudflare. The Worker path is unaffected (Cloudflare sets the header).

### P1-7 Unauthenticated `/api/bot/status` makes an outbound Telegram call
- **Evidence:** `curl http://localhost:3000/api/bot/status` → **200** with no credentials. With
  `BOT_TOKEN` present, `checkTelegramBotConnection()` calls `https://api.telegram.org/bot<token>/getMe`
  on every request (`timeout` is caller-controlled up to 10 s), with no rate limiting and without
  admin auth.
- **Impact:** anonymous callers can use the endpoint as an amplifier against the Telegram API and
  disclose the bot's username/ID; each call holds a request while waiting on the upstream API.
- **Fix:** require admin (or drop to the config-only `getPublicStatus`) for the public path, and
  cache a successful result for a short TTL.

### P1-8 Public `/api/tips/stats` exposes performance and click metrics
- **Evidence:** `curl http://localhost:3000/api/tips/stats` → 200 with no credentials, running DB
  aggregations (`getTipsPerformanceStats` + a `tip_clicks` count) per call, unbounded in frequency.
- **Fix:** gate behind `requireAdmin` (the sanitized public surface is `/api/tips/preview`), or
  cache it. Intentional public exposure is defensible only if it is a deliberate product decision.

### P1-9 Live tips summary inflates the published record
- **Evidence:** the landing page's feed renderer floors and hardcodes statistics before displaying
  them as live: `var wRate = Math.max(78, Number(data.summary.winRate) || 84);`,
  `var wWon = Math.max(15, Number(data.summary.won) || 23);`, and the average-odds figure is the
  literal `1.88` in all four summary variants. When the feed reports a 40 % 7-day strike rate, the
  page shows **78 %** and at least **15** wins, under a badge that has just switched to
  "● Live feed (n)".
- **Why it matters:** this is exactly the class of claim `docs/COMPLIANCE_GATE.md` forbids
  ("Do not publish guaranteed winnings … unverified bonus percentages"); the numbers are presented
  as live data while being floored at a marketing minimum.
- **Fix:** display the real values, or label genuinely illustrative figures as illustrative (the
  static sample cards already do this via the "Sample preview" badge).

### P1-10 Landing-page live tips are rendered into `innerHTML` unescaped
- **Evidence:** in `src/landingPage.ts` the live-feed renderer concatenates `t.sportTitle`,
  `t.homeTeam`, `t.awayTeam`, `t.selection`, `t.market`, `t.sport`, `t.commenceTime` straight into
  `tipGrid.innerHTML` with no escaping, while the same data is escaped (`esc(...)`) in the sibling
  renderer `src/publicTips.ts` (`publicTipsClientScript`). The values originate from The Odds API
  and are persisted in `tip_posts.tips_json`.
- **Impact:** any `<`, `"` or `&` in upstream team/league/selection text becomes markup on the
  public page (HTML injection; script injection only if combined with a CSP gap). CSP nonces limit
  the damage but do not remove the injection.
- **Fix:** route the same fields through an escaping helper in that renderer (reuse the pattern in
  `publicTipsClientScript`).

## 4. P2 — low / hygiene

- **P2-11 Analytics IP "privacy hash" uses a hardcoded salt** (`hashIpForPrivacy`:
  `salt_${today}_${ip}`). It is not a secret, so the hash is reversible by enumerating the IPv4
  space for a given day — the privacy claim on that field is weaker than documented. Use an HMAC
  with a configured secret.
- **P2-12 `Math.random()` generates the analytics session id** (`landingPage.ts:2627`,
  `"s_" + Math.random().toString(36)`); `crypto.randomUUID()` is already used everywhere else.
- **P2-13 [Node runtime] Landing page ships without clickjacking protection.**
  `src/index.ts` deletes `X-Frame-Options` and strips `frame-ancestors 'none'` from the CSP for `/`
  unconditionally, so a self-hosted Node deployment serves a framable page. It exists to let the
  preview iframe embed the page, which belongs behind a preview-only condition
  (`BASE44_PREVIEW_MODE === "1"`).
- **P2-14 Reporting day boundaries are UTC, not Colombo.** `getStats` uses `date('now')` and
  `getDailyFinancialTrends` buckets/labels with `getUTC*`, while the UI renders Colombo time — so
  "today" rolls over at 05:30 SLT. Operator-facing numbers can disagree with the displayed
  timestamps.
- **P2-15 Documentation drift.** `docs/HARDENING_CHECKLIST.md` item 9 points at
  `src/sessionStorage.ts`, which does not exist, and no code references the `bot_sessions` table
  from migration `0008`. The `CASHIER_ENABLED` claim (P0-1) is the second doc-vs-code mismatch.

## 5. Environment notes (not defects)

- `GET /health` returns **503** in this environment by design: it is a configuration gate and this
  preview intentionally has no credentials. `/api/status` (200) is the reachability probe; the
  compose healthcheck uses it accordingly. Do not point external monitors at `/health` here.
- `node scripts/scan-env.mjs --check` fails with 5 missing mandatory keys (payment rails, affiliate
  links). Expected without operator credentials; it means the `env:check` gate cannot pass in this
  environment as-is.
- Telegram polling is deliberately off in this environment (`USE_POLLING=false`, no `BOT_TOKEN`),
  so the bot, cashier, and admin-callback flows cannot be exercised here. Findings that live in
  those flows (P0-1, P1-5 withdrawal path) are code-verified only and need unit coverage or a live
  bot check.

## 6. Suggested remediation order

1. **P0-1** cashier gate (or correct the docs) — compliance-critical.
2. **P0-2 + P0-4** static-asset fallback + MIME map — visible breakage in the preview.
3. **P0-3** `/api/tips/preview` into the shared dispatcher — the landing feed is dead on Node.
4. **P1-5** build `Env` from a single key list — unblocks withdrawals, webhook registration and
   bank details on Node in one change.
5. **P1-6, P1-7, P1-8** client-identity handling, bot-status auth/caching, tips-stats auth.
6. **P1-9, P1-10** truthful stats + escaping on the public page, then **P2‑14** Colombo day
   boundaries for operator reporting.
7. **P2-11…P2-13, P2-15** hygiene and doc fixes.

## 7. How to verify each fix

- P0-1: unit test on the deposit/withdraw entry point with the flag unset → refusal; with
  `"true"` → proceeds.
- P0-2/P0-4: `curl -o /dev/null -w '%{http_code} %{content_type}'` for the 5 `/assets/telegram/*.jpg`
  and `/manifest.json`; in the browser assert zero broken images and zero 404s on the home page.
- P0-3: `curl /api/tips/preview` → `{ok:true,…}` and the tips badge reads "● Live feed".
- P1-5: start the Node server with `SECURITY_CODE_PEPPER`/`PUBLIC_BASE_URL`/`SAMPATH_DETAILS` set and
  assert the withdrawal path reaches the DB instead of the "Service configuration error" branch.
- P1-6: 11 sequential bad `POST /admin/login` from one client → 429, and a spoofed
  `cf-connecting-ip` no longer resets the bucket.
- P1-7/P1-8: unauthenticated request → 401.
- P1-9: feed with a known low win rate → the page must show that value.
- P1-10: feed a tip whose `homeTeam`/`selection` contains `<img src=x onerror=…>` → must render as
  text.
