# Business Development Plan — 2026-10

## Executive objective

Build a measurable, compliant, reliable acquisition + support platform around the existing Telegram/Cloudflare stack, while optimizing for **profitable active customers and verified conversions**, not raw deposit volume.

The immediate strategy is to stabilize measurement, resolve attribution discrepancies, harden the cashier module, and only then scale acquisition or activate transactional features subject to the Compliance Gate.

## 1. Report findings (01 Jan 2026 onward)

| Source / Website ID | Direct links | Registrations | Depositing accounts | Total deposit amount | Company profit | Assessment |
|---|---:|---:|---:|---:|---:|---|
| Website 2481353 | 26 | 3 | 21 | $75,594.09 | **-$2,861.29** | High volume, negative economics |
| Facebook 4213686 | 4 | 2 | 1 | $186.29 | **+$164.19** | Small volume, positive economics |
| Facebook 3634819 | 31 | 0 | 0 | $0 | $0 | Traffic/click quality or landing conversion problem |
| Worker landing 5994805 | 0 | 0 | 0 | $0 | $0 | Essentially no distribution |

### Important reconciliation issue

The Marketing Tools report and Full report do not reconcile for Website 2481353. The Marketing Tools report shows $59,303.81 of deposits and +$9,942.93 company profit, while the Full report shows $75,594.09 of deposits and **-$2,861.29** company profit.

Treat this as a data-quality / attribution problem until proven otherwise. Do not use either number as the sole source for marketing decisions.

## 2. Business priorities

### P0 — Compliance and authorization

Before Sri Lanka-facing gambling promotion or a cashier goes live:
- verify the operator/domain's current Sri Lanka authorization;
- verify affiliate promotional permissions;
- verify payment-rail and money-transfer requirements;
- approve age/responsible-gaming, privacy, complaint and AML procedures;
- remove or rewrite any unverified advertising claims.

The system must support a hard production disable switch.

### P1 — Measurement and attribution

Create a single funnel that connects:
`source → campaign/SubID → landing CTA → Telegram start → registration → first deposit → active player → net revenue/commission`.

Persist web CTA events instead of returning only `{ok:true}` from the analytics beacon.

Minimum event fields:
- event name
- timestamp
- session/anonymous ID
- source / campaign / SubID
- landing path
- language
- Telegram deep-link payload where available
- consent/privacy state where applicable

### P2 — Transaction orchestration

The repository already has deposit/withdrawal workflows in `src/bot.ts`, while PR #39 adds a separate `src/cashier.ts`. Avoid two competing implementations.

Refactor toward:
`bot UI → transaction service → fraud/idempotency → D1 transaction record → admin queue → status notification → reconciliation`.

Required controls:
- unique transaction IDs / idempotency keys;
- duplicate receipt detection;
- immutable audit trail;
- strict status transition rules;
- amount and player-ID validation;
- admin authorization + action logging;
- retry-safe Telegram notifications;
- reconciliation job for stuck/aged transactions.

### P3 — Admin operations

Evolve the dashboard into an operations console:
- pending deposits
- pending withdrawals
- aging/SLA
- approval/rejection reason
- operator/customer lookup
- daily net flow
- fraud flags
- failed external calls
- audit trail
- source/SubID performance

### P4 — Acquisition optimization

Use **net economics** as the primary optimization metric.

For every source/campaign:
- registrations
- first-time depositors
- active players
- net revenue
- commission
- bonus cost
- payout/withdrawal cost
- fraud/chargebacks
- retention

Actions suggested by the current data:
- investigate/segment Website 2481353 before spending more;
- audit Facebook 3634819 because 31 direct links produced 0 registrations;
- investigate why Facebook 4213686 produces positive economics despite very small volume;
- restore measurable distribution to Worker landing 5994805 only after attribution and compliance are ready.

## 3. 4-week execution roadmap

### Week 1 — Foundation
- Freeze new public acquisition claims.
- Finish compliance checklist.
- Reconcile the two affiliate reports by source, date range, tool ID, website ID and SubID.
- Define canonical KPI formulas.
- Keep cashier disabled.

**Acceptance:** one source-of-truth KPI sheet with reconciled definitions and explicit unresolved discrepancies.

### Week 2 — Product reliability
- Finish cashier safety hardening.
- Consolidate cashier/payment logic with existing bot flows.
- Add idempotent transaction service boundaries.
- Add negative-path tests for duplicate requests, stale states, unauthorized admin actions and replayed updates.
- Add transaction aging and reconciliation queries.

**Acceptance:** no transaction path can be processed twice without an explicit, auditable state transition.

### Week 3 — Analytics and funnel
- Persist landing-page CTA events.
- Add source/SubID fields to Telegram deep links where permitted.
- Build registration → first deposit funnel.
- Add source profitability dashboard.
- Track marketing-tool vs full-report reconciliation.

**Acceptance:** every production marketing click can be tied to a measurable downstream outcome or explicitly marked unattributed.

### Week 4 — Controlled growth
- Run a small, approved acquisition test on the best verified source.
- Compare CAC/CPA, first-deposit rate, active-player retention and net revenue.
- Retire or redesign sources with zero/negative quality.
- Review support SLAs and fraud incidents.
- Produce a weekly management report.

**Acceptance:** scaling decision based on positive unit economics and verified compliance status.

## 4. Product roadmap

### Customer
- Sinhala / English / Tamil
- one-tap start/menu
- transparent fee/limit display
- transaction status tracking
- receipt upload with verification state
- help/ticket flow
- responsible-gaming controls
- clear legal/privacy pages

### Cashier
- payment-method catalog from verified configuration
- no fake/default payment credentials
- deposit request → receipt → verification → approved/rejected
- withdrawal request → risk checks → admin approval → payout confirmation
- status notifications
- immutable audit log
- reconciliation

### Admin
- operations queue
- customer profile + transaction history
- source/SubID performance
- fraud/risk queue
- transaction aging
- audit log
- system health / external dependency status

### Marketing
- source/campaign/SubID taxonomy
- Telegram deep-link attribution
- landing CTA event persistence
- SEO and social previews
- content approval workflow
- A/B testing only after legal approval

## 5. KPI scorecard

Primary:
- First-time depositor conversion rate
- Active players
- Net revenue per active player
- Commission after bonus/costs
- Contribution margin
- 7/30-day retention

Operational:
- Deposit approval median time
- Withdrawal approval median time
- Failed transaction rate
- Duplicate/replayed request rate
- Reconciliation exceptions
- Support first-response time

Acquisition:
- Click → registration
- Registration → first deposit
- Cost per first-time depositor
- Net revenue per source
- Positive-unit-economics source share

Avoid using **total deposit amount** as the main success KPI.

## 6. Technical target architecture

Browser / Telegram
→ Cloudflare Worker
→ API/Bot orchestration
→ domain services:
  - Acquisition / Attribution
  - Customer
  - Transaction
  - Risk / Fraud
  - Support
  - Tips / Content
→ D1
→ R2
→ external providers

Keep `src/worker.ts` thin and move business decisions into testable services.

## 7. Delivery rules

- `main` is production.
- Feature work stays on dedicated branches.
- Do not mix config drift with product features.
- Never commit production secrets.
- Never ship placeholder financial credentials.
- Every schema change is a new forward-only migration.
- Production deployment happens through CI after review.
- Every financial mutation must have a corresponding audit record.

## 8. Immediate backlog

1. Compliance gate and production disable control.
2. Reconcile Website 2481353 report discrepancy.
3. Replace non-persistent analytics beacon with durable event capture.
4. Consolidate `src/cashier.ts` with the existing bot payment flow.
5. Add transaction idempotency/reconciliation service.
6. Add source/SubID attribution to the customer funnel.
7. Expand admin dashboard with profitability and transaction-aging views.
8. Add incident, rollback and secret-rotation runbooks.
9. Re-test landing mobile/desktop accessibility and conversion flow.
10. Only after approval: controlled acquisition experiments.

## 9. Success definition

The business is considered ready to scale when:
- legal/compliance approval is documented;
- source-to-revenue attribution is measurable;
- financial states are idempotent and reconciled;
- customer support and transaction SLAs are monitored;
- no placeholder or evasive payment instructions remain;
- acquisition sources are evaluated on net economics;
- production changes are reviewed and deployed through CI.