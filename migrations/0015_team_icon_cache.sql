-- Persistent server-side cache for resolved sports team crests, player portraits, and country flags.
CREATE TABLE IF NOT EXISTS team_icon_cache (
  cache_key TEXT PRIMARY KEY,
  entity_name TEXT NOT NULL,
  sport_category TEXT NOT NULL,
  image_url TEXT,
  country_code TEXT,
  source TEXT NOT NULL DEFAULT 'none',
  resolved_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_team_icon_cache_expires
  ON team_icon_cache(expires_at);
