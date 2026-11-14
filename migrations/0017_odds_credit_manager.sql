-- Centralized Odds API monthly credit manager, shared odds/score caches, and value alert deduplication.

CREATE TABLE IF NOT EXISTS odds_credit_monthly (
  month_utc TEXT NOT NULL,
  key_slot INTEGER NOT NULL,
  account_limit INTEGER NOT NULL DEFAULT 500 CHECK (account_limit > 0),
  requests_used INTEGER NOT NULL DEFAULT 0 CHECK (requests_used >= 0),
  requests_remaining INTEGER,
  last_request_cost INTEGER NOT NULL DEFAULT 0 CHECK (last_request_cost >= 0),
  total_calls INTEGER NOT NULL DEFAULT 0 CHECK (total_calls >= 0),
  failed_calls INTEGER NOT NULL DEFAULT 0 CHECK (failed_calls >= 0),
  last_status INTEGER,
  last_endpoint TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (month_utc, key_slot)
);

CREATE TABLE IF NOT EXISTS odds_credit_buckets (
  month_utc TEXT NOT NULL,
  bucket TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  call_count INTEGER NOT NULL DEFAULT 0 CHECK (call_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (month_utc, bucket)
);

CREATE TABLE IF NOT EXISTS odds_credit_guard_state (
  month_utc TEXT PRIMARY KEY,
  total_budget INTEGER NOT NULL DEFAULT 1000 CHECK (total_budget > 0),
  warned_800 INTEGER NOT NULL DEFAULT 0 CHECK (warned_800 IN (0, 1)),
  warned_900 INTEGER NOT NULL DEFAULT 0 CHECK (warned_900 IN (0, 1)),
  warned_950 INTEGER NOT NULL DEFAULT 0 CHECK (warned_950 IN (0, 1)),
  hard_stopped_1000 INTEGER NOT NULL DEFAULT 0 CHECK (hard_stopped_1000 IN (0, 1)),
  daily_recap_date TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS odds_snapshots (
  event_id TEXT PRIMARY KEY,
  sport_key TEXT NOT NULL,
  sport_title TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  commence_time TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'h2h',
  best_home_odds REAL,
  best_home_bookmaker TEXT,
  best_draw_odds REAL,
  best_draw_bookmaker TEXT,
  best_away_odds REAL,
  best_away_bookmaker TEXT,
  prev_best_home_odds REAL,
  prev_best_away_odds REAL,
  best_selection TEXT,
  best_value_score REAL,
  best_consensus_prob REAL,
  bookmakers_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_odds_snapshots_commence
  ON odds_snapshots(commence_time, fetched_at);

CREATE TABLE IF NOT EXISTS live_score_cache (
  event_id TEXT PRIMARY KEY,
  sport_key TEXT NOT NULL,
  sport_title TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  commence_time TEXT,
  score_home TEXT,
  score_away TEXT,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  status_text TEXT,
  is_live INTEGER NOT NULL DEFAULT 0 CHECK (is_live IN (0, 1)),
  last_notified_score TEXT,
  last_update TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_live_score_cache_fetched
  ON live_score_cache(completed, is_live, fetched_at);

CREATE TABLE IF NOT EXISTS value_odds_alerts (
  dedup_key TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  sport_key TEXT NOT NULL,
  sport_title TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  commence_time TEXT,
  selection TEXT NOT NULL,
  best_odds REAL NOT NULL,
  bookmaker TEXT,
  consensus_prob REAL NOT NULL,
  value_score REAL NOT NULL,
  telegram_message_id INTEGER,
  alerted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_value_odds_alerts_time
  ON value_odds_alerts(alerted_at, sport_key);
