-- Cloudflared operations pages: settings, activity log, tunnel health,
-- traffic samples, connected devices, access rules and alert delivery.
-- Secret setting values are stored encrypted (AES-GCM); see
-- src/cloudflared/secrets.ts. Plaintext tokens are never persisted.

CREATE TABLE IF NOT EXISTS cloudflared_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  is_secret INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cloudflared_tunnels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  tunnel_id TEXT,
  hostname TEXT,
  service_url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_status TEXT,
  last_checked_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cloudflared_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL DEFAULT 'info',
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  message TEXT NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_cloudflared_activity_created
  ON cloudflared_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cloudflared_activity_level
  ON cloudflared_activity(level);

CREATE TABLE IF NOT EXISTS cloudflared_status_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tunnel_name TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  connections INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cloudflared_status_created
  ON cloudflared_status_checks(tunnel_name, created_at DESC);

CREATE TABLE IF NOT EXISTS cloudflared_traffic_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sampled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tunnel_name TEXT NOT NULL,
  bytes_in INTEGER NOT NULL DEFAULT 0,
  bytes_out INTEGER NOT NULL DEFAULT 0,
  requests INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cloudflared_traffic_sampled
  ON cloudflared_traffic_samples(tunnel_name, sampled_at DESC);

CREATE TABLE IF NOT EXISTS cloudflared_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tunnel_name TEXT NOT NULL,
  device_key TEXT NOT NULL,
  label TEXT,
  origin_ip TEXT,
  client_version TEXT,
  colo TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tunnel_name, device_key)
);

CREATE TABLE IF NOT EXISTS cloudflared_access_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  path_prefix TEXT NOT NULL DEFAULT '/',
  match_kind TEXT NOT NULL,
  match_value TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'allow',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cloudflared_alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  event TEXT NOT NULL,
  channel TEXT NOT NULL,
  target TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cloudflared_alert_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event TEXT NOT NULL,
  tunnel_name TEXT,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_cloudflared_deliveries_created
  ON cloudflared_alert_deliveries(created_at DESC);
