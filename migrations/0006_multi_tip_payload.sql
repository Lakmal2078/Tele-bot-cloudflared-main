-- XBet Telegram Bot — D1 migration 0006
-- Stores the full multi-tip payload for each scheduled slot.
-- Keep migrations immutable after production deployment.

ALTER TABLE tip_posts ADD COLUMN tips_json TEXT;
