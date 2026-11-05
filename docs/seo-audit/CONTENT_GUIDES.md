# SEO Content Guides

This implementation adds three server-rendered, indexable guide pages in Sinhala, English and Tamil.

## Canonical routes

| Guide | Sinhala | English | Tamil |
|---|---|---|---|
| Deposit | `/deposit-guide` | `/en/deposit-guide` | `/ta/deposit-guide` |
| Withdrawal | `/withdrawal-guide` | `/en/withdrawal-guide` | `/ta/withdrawal-guide` |
| Free sports tips | `/free-sports-tips` | `/en/free-sports-tips` | `/ta/free-sports-tips` |

The canonical form omits a trailing slash; slash variants receive a permanent redirect. Each localized version emits a self-canonical URL, reciprocal `hreflang` alternates (`si`, `en`, `ta`, `x-default`), Open Graph/Twitter metadata, and Article, BreadcrumbList and FAQPage JSON-LD. The nine guide URLs are included in both sitemap response paths.

## Editorial and safety rules

- Deposit and withdrawal instructions are based on the current Telegram bot flow. Available payment methods and transaction limits are configuration-dependent; the pages direct users to the live bot instructions instead of hard-coding recipient details.
- The withdrawal guide warns users not to share login passwords, OTPs, bank or wallet PINs, or card CVVs. If a withdrawal security code is requested, users are told to verify its meaning with the official account provider first.
- Sports tips content explains odds and markets without publishing fabricated picks, promising returns, or implying that historical results predict future outcomes.
- All guides display 18+ and responsible-gambling notices and advise users to follow applicable local laws.

## Validation

`tests/seoContentPages.test.ts` covers all nine routes, metadata, hreflang, transaction-limit rendering, trailing-slash redirects, Worker delivery and sitemap inclusion. Existing sitemap assertions in `tests/landingPage.test.ts` are updated to expect 13 URLs (three localized home pages, privacy, and nine guide pages).
