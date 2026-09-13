-- XBet Telegram Bot — D1 migration 0005
-- Operational dashboard, support tickets, official channel scheduler, and safety preferences.
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('GENERAL','DEPOSIT','WITHDRAWAL','ACCOUNT','SAFETY')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','PENDING','CLOSED')),
  admin_reply TEXT,
  assigned_admin_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id, created_at);

CREATE TABLE IF NOT EXISTS channel_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  media_url TEXT,
  cta_text TEXT,
  cta_url TEXT,
  language TEXT NOT NULL DEFAULT 'all' CHECK(language IN ('all','si','en','ta')),
  scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SCHEDULED','POSTED','FAILED','CANCELLED')),
  error TEXT,
  created_by INTEGER NOT NULL,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_channel_schedule_queue ON channel_schedule(status, scheduled_for);

CREATE TABLE IF NOT EXISTS user_safety_preferences (
  user_id INTEGER PRIMARY KEY,
  age_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(age_confirmed IN (0,1)),
  promotional_messages INTEGER NOT NULL DEFAULT 1 CHECK(promotional_messages IN (0,1)),
  self_excluded INTEGER NOT NULL DEFAULT 0 CHECK(self_excluded IN (0,1)),
  deposit_limit_lkr INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS operational_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK(severity IN ('INFO','WARNING','CRITICAL')),
  message TEXT NOT NULL,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_operational_alerts_open ON operational_alerts(acknowledged_at, created_at);
