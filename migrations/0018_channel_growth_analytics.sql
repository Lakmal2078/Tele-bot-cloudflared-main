-- Telegram channel membership events and campaign invite attribution.
CREATE TABLE IF NOT EXISTS channel_member_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_id INTEGER NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('join', 'leave')),
  source TEXT,
  campaign TEXT,
  invite_link TEXT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_channel_member_events_time ON channel_member_events(occurred_at, event_type);
CREATE INDEX IF NOT EXISTS idx_channel_member_events_source ON channel_member_events(source, campaign);

CREATE TABLE IF NOT EXISTS channel_member_state (
  chat_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  username TEXT,
  is_member INTEGER NOT NULL CHECK (is_member IN (0, 1)),
  joined_at TEXT,
  left_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS tracked_channel_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  invite_link TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  campaign TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
