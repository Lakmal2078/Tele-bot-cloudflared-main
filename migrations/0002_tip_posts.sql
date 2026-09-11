-- XBet Telegram Bot — D1 migration 0002
-- Scheduled Odds API free-tip publishing audit/idempotency records.
-- Keep migrations immutable after production deployment.

CREATE TABLE IF NOT EXISTS tip_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduled_key TEXT NOT NULL UNIQUE,
  slot_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK(status IN ('PROCESSING', 'POSTED', 'FAILED')),
  event_id TEXT,
  sport_key TEXT,
  sport_title TEXT,
  home_team TEXT,
  away_team TEXT,
  commence_time TEXT,
  market TEXT,
  selection TEXT,
  odds REAL,
  message_id INTEGER,
  error TEXT,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tip_posts_status ON tip_posts(status);
CREATE INDEX IF NOT EXISTS idx_tip_posts_created ON tip_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_tip_posts_event ON tip_posts(event_id);
