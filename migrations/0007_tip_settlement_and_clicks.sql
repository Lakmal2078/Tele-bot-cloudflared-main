-- XBet Telegram Bot — D1 migration 0007
-- Tip outcomes settlement, individual pick results, and affiliate link click tracking.
-- Keep migrations immutable after production deployment.

-- Add outcome and settlement tracking columns to tip_posts
ALTER TABLE tip_posts ADD COLUMN result TEXT DEFAULT 'PENDING' CHECK(result IN ('PENDING', 'WON', 'LOST', 'VOID', 'PARTIAL'));
ALTER TABLE tip_posts ADD COLUMN settled_at TEXT;

-- Table for individual pick results in each tip post
CREATE TABLE IF NOT EXISTS tip_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tip_post_id INTEGER NOT NULL REFERENCES tip_posts(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  sport_key TEXT NOT NULL,
  sport_title TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  commence_time TEXT,
  selection TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'h2h',
  odds REAL NOT NULL,
  result TEXT NOT NULL DEFAULT 'PENDING' CHECK(result IN ('PENDING', 'WON', 'LOST', 'VOID')),
  score_home TEXT,
  score_away TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  settled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tip_results_post ON tip_results(tip_post_id);
CREATE INDEX IF NOT EXISTS idx_tip_results_event ON tip_results(event_id);
CREATE INDEX IF NOT EXISTS idx_tip_results_status ON tip_results(result, completed);

-- Table for tracking outbound clicks on tip picks / affiliate redirect links
CREATE TABLE IF NOT EXISTS tip_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tip_post_id INTEGER,
  event_id TEXT,
  selection TEXT,
  target_url TEXT NOT NULL,
  user_agent TEXT,
  referer TEXT,
  ip_hash TEXT,
  clicked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tip_clicks_tip ON tip_clicks(tip_post_id, event_id);
CREATE INDEX IF NOT EXISTS idx_tip_clicks_time ON tip_clicks(clicked_at);
