-- Stateful settlement scheduling and one-time Telegram notification guard.
ALTER TABLE tip_posts ADD COLUMN settlement_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tip_posts ADD COLUMN last_checked_at TEXT;
ALTER TABLE tip_posts ADD COLUMN next_retry_at TEXT;
ALTER TABLE tip_posts ADD COLUMN settlement_note TEXT;
ALTER TABLE tip_posts ADD COLUMN telegram_edited_at TEXT;

CREATE TABLE IF NOT EXISTS tip_settlement_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tip_post_id INTEGER NOT NULL REFERENCES tip_posts(id) ON DELETE CASCADE,
  event_id TEXT,
  action TEXT NOT NULL,
  outcome TEXT,
  note TEXT NOT NULL,
  admin_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tip_posts_settlement_queue
  ON tip_posts(status, result, last_checked_at, next_retry_at, commence_time);
CREATE INDEX IF NOT EXISTS idx_tip_results_post_event
  ON tip_results(tip_post_id, event_id, completed);
