-- XBet Telegram Bot — D1 migration 0008
-- Optional grammY session middleware table (D1-backed, Workers-safe).
-- Used by src/sessionStorage.ts when migrating from custom user_state FSM.

CREATE TABLE IF NOT EXISTS bot_sessions (
  session_key TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_updated_at ON bot_sessions (updated_at);
