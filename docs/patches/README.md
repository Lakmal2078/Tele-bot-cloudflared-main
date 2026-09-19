# Landing page P0 patch

Apply the P0 polish (disclaimer, soft metrics, tips empty/error fallback, remove unused import).

```bash
cd Tele-bot-cloudflared-main
git pull origin main

# Apply patch
git apply docs/patches/landing-p0.patch
# if that fails: patch -p1 < docs/patches/landing-p0.patch

git add src/landingPage.ts
git commit -m "fix(landing): P0 polish — disclaimer, soft metrics, tips fallback"
git push origin main
```

## Changes included

1. **Unused import** — remove `BRAND_LOGO_SVG_COMPACT`
2. **Metrics wording** — `After verify` / `No service fee` / `Available` / `via Telegram`
3. **Disclaimer** — stronger 18+ + informational language on tips + responsible-gaming box
4. **Tips fallback** — empty/error API keeps sample cards and shows a status message

## Broken branch (do not merge)

`fix/landing-p0-disclaimer-metrics` was corrupted by a truncated upload. Delete it:

```bash
git push origin --delete fix/landing-p0-disclaimer-metrics
```
