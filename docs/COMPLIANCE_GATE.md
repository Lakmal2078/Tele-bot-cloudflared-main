# Compliance Gate — Sri Lanka Cashier / Affiliate

**Status: BLOCKED pending legal and partner verification**

This repository may contain technical building blocks for affiliate tracking and cashier workflows, but the production cashier and gambling-promotion paths must remain disabled until the operator's Sri Lanka authorization, partner authorization, and payment-flow legality are independently verified.

## Required approvals

1. Verify the exact gambling operator, domain, product, and activity are permitted for Sri Lankan users under the Gambling Regulatory Authority Act, No. 17 of 2025 and current regulator directions.
2. Obtain written partner/affiliate authorization for the exact acquisition channels, domains, creatives, promo claims, and SubID tracking configuration.
3. Verify whether the planned deposit/withdrawal service is itself a regulated or otherwise authorized money/value transfer service and use only approved payment rails and accounts.
4. Complete KYC/age-gate, responsible-gaming, complaint handling, privacy, record-retention, fraud, sanctions/AML and incident procedures appropriate to the service.
5. Approve every public marketing claim. Do not publish guaranteed winnings, guaranteed approval times, unverified bonus percentages, or instructions that conceal or misrepresent transaction purpose.
6. Confirm the destination domain(s) and payment credentials through a controlled production configuration process. Never use placeholder wallets, numbers, or account details.

## Engineering controls

- `CASHIER_ENABLED` is set to `false` in `wrangler.toml`.
- Cashier payment details must come from runtime configuration/secrets.
- Missing payment destinations must fail closed.
- Affiliate URLs must be explicitly configured; no hard-coded partner fallback is allowed.
- User-facing transfer instructions must require truthful transaction information.
- Production enablement should require a documented approval record and a rollback path.

## Go / No-Go

**NO-GO:** any launch, public promotion, or Sri Lanka-specific cashier activation before the approval checklist is complete.

**GO:** only after legal/partner/payment approvals are recorded and production configuration has been verified.

> This document is an engineering gate, not legal advice. A Sri Lankan-qualified lawyer/regulatory advisor should confirm the final position.