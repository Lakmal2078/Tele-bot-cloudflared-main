-- Shared rate-limit buckets for Worker isolates and Node runtime instances.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  reset_at INTEGER NOT NULL,
  max_count INTEGER NOT NULL DEFAULT 0 CHECK (max_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset_at
ON rate_limit_buckets(reset_at);
