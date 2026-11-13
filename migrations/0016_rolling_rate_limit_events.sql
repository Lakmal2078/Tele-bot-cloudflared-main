-- Accepted cashier attempts with per-event expiry for true rolling windows.
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_key TEXT NOT NULL,
  occurred_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL CHECK (expires_at_ms > occurred_at_ms)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_bucket_expiry
ON rate_limit_events(bucket_key, expires_at_ms);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_expiry
ON rate_limit_events(expires_at_ms);
