# Landing page P0 patch

Apply the P0 polish (disclaimer, soft metrics, tips empty/error fallback, remove unused import).

```bash
cd Tele-bot-cloudflared-main
git pull origin main
git apply docs/patches/landing-p0.patch
# or: patch -p1 < docs/patches/landing-p0.patch

git add src/landingPage.ts
git commit -m "fix(landing): P0 polish — disclaimer, soft metrics, tips fallback"
git push origin main
```

## Changes

1. Remove unused `BRAND_LOGO_SVG_COMPACT` import
2. Metrics: `2–5 Mins` → `After verify`; `0% Fee` → `No service fee`; `Configured/Bot flow` → `Available/via Telegram`
3. Stronger 18+ / informational disclaimer on tips + responsible-gaming box
4. Tips API empty/error: keep sample cards, show status message in `#tipLiveSummary`

**Do not merge** branch `fix/landing-p0-disclaimer-metrics` — it was corrupted by a truncated upload. Delete it:

```bash
git push origin --delete fix/landing-p0-disclaimer-metrics
```
