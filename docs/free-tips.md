# Automated Free Tips

The Worker publishes one market-data-based free tip at **08:00, 12:00 and 18:00 Sri Lanka time (UTC+05:30)**.

## Architecture

`Cloudflare Cron → The Odds API v4 → deterministic market selection → D1 idempotency record → Telegram channel`

The Odds API supplies live/upcoming events and bookmaker odds. The bot does **not** claim that any selection is guaranteed to win.

## Required production configuration

Set these in `wrangler.toml` (non-secret configuration):

- `TIPS_CHANNEL_ID` — target channel username such as `@my_channel`, or numeric `-100...` chat id.
- `TIPS_CHANNEL_URL` — public channel URL used by the Join button.
- `TIPS_SPORTS` — comma-separated Odds API sport keys, tried in order.
- `TIPS_ODDS_REGIONS` — bookmaker regions, for example `uk,eu`.
- `TIPS_MIN_ODDS` / `TIPS_MAX_ODDS` — acceptable decimal-odds range.
- `TIPS_HOURS_AHEAD` — maximum event look-ahead window.

Set the API key as a Cloudflare secret; never commit it:

```bash
npx wrangler secret put ODDS_API_KEY
```

The Telegram bot must be an administrator of the target channel with permission to post messages.

## Selection policy

The publisher requests the featured `h2h` market in decimal odds. It ignores started events, requires multiple bookmaker observations, filters the configured odds range, then ranks candidates by average market-implied probability and bookmaker coverage.

This is a deterministic market-data selection rule, not an AI prediction engine.

## Schedule

Cloudflare Cron uses UTC:

| Sri Lanka | UTC | Cron |
|---|---:|---|
| 08:00 | 02:30 | `30 2 * * *` |
| 12:00 | 06:30 | `30 6 * * *` |
| 18:00 | 12:30 | `30 12 * * *` |

The existing R2 log retention cleanup remains at `02:00 UTC`.

## Idempotency and audit trail

Migration `0002_tip_posts.sql` adds a unique `scheduled_key` per Sri Lankan date/slot. A post is recorded as `PROCESSING`, `POSTED`, or `FAILED`, including the selected event, odds, Telegram message id and error details.

## Channel membership

Telegram bots should not be used to force-add users. The tip post includes an opt-in channel link so users can join themselves. For private channels, use a bot-created invite link or a configured invite URL and ensure the bot has the required administrator permissions.

## Operational checklist

1. Add the bot as a channel administrator with **Post Messages** permission.
2. Set `TIPS_CHANNEL_ID` and `TIPS_CHANNEL_URL`.
3. Set `ODDS_API_KEY` with Wrangler as a secret.
4. Deploy the Worker and D1 migration.
5. Confirm the Worker health endpoint reports `tipsConfigured: true`.
6. Check D1 `tip_posts` after each scheduled run.
7. If The Odds API has no suitable event, the slot is recorded as failed rather than publishing fabricated data.
