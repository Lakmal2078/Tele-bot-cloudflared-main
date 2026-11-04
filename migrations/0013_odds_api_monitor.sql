-- Persistent alert state for Odds API availability and empty-feed monitoring.
CREATE TABLE IF NOT EXISTS odds_api_monitor_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  api_failure_since TEXT,
  api_failure_count INTEGER NOT NULL DEFAULT 0 CHECK (api_failure_count >= 0),
  api_alerted INTEGER NOT NULL DEFAULT 0 CHECK (api_alerted IN (0, 1)),
  empty_since TEXT,
  empty_count INTEGER NOT NULL DEFAULT 0 CHECK (empty_count >= 0),
  empty_alerted INTEGER NOT NULL DEFAULT 0 CHECK (empty_alerted IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO odds_api_monitor_state (id) VALUES (1);
