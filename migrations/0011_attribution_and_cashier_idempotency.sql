-- XBet Telegram Bot — D1 migration 0011
-- Attribution event tracking and cashier transaction idempotency.
-- Keep migrations immutable after production deployment.

-- 1. Analytics & Attribution Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  session_id TEXT,
  source TEXT,
  campaign TEXT,
  sub_id TEXT,
  landing_path TEXT,
  language TEXT DEFAULT 'si',
  telegram_payload TEXT,
  user_id INTEGER,
  details TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time ON analytics_events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_source ON analytics_events(source, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_subid ON analytics_events(sub_id);

-- 2. Transaction Idempotency & Operator Attribution Columns
ALTER TABLE deposits ADD COLUMN idempotency_key TEXT;
ALTER TABLE withdrawals ADD COLUMN idempotency_key TEXT;
ALTER TABLE deposits ADD COLUMN operator_id INTEGER;
ALTER TABLE withdrawals ADD COLUMN operator_id INTEGER;
ALTER TABLE deposits ADD COLUMN action_note TEXT;
ALTER TABLE withdrawals ADD COLUMN action_note TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_deposits_idempotency ON deposits(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_withdrawals_idempotency ON withdrawals(idempotency_key) WHERE idempotency_key IS NOT NULL;
