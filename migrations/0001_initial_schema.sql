-- XBet Telegram Bot — D1 migration 0001
-- Initial schema migrated from the legacy schema.sql.
-- Keep migrations immutable after they have been applied to production.

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  referred_by INTEGER,
  language TEXT DEFAULT 'si',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referred_by) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT,
  player_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'BANK',
  photo_file_id TEXT,
  r2_url TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT,
  player_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'BANK',
  destination_account TEXT,
  security_code TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_id) REFERENCES users(user_id),
  FOREIGN KEY (referred_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS user_state (
  user_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,
  data TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  admin_username TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('DEPOSIT', 'WITHDRAWAL')),
  target_id INTEGER NOT NULL,
  target_user_id INTEGER,
  amount INTEGER,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_deleted ON deposits(deleted_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_deleted ON withdrawals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_state_updated ON user_state(updated_at);
CREATE INDEX IF NOT EXISTS idx_deposits_photo ON deposits(photo_file_id);
CREATE INDEX IF NOT EXISTS idx_deposits_player ON deposits(player_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_player ON withdrawals(player_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created ON deposits(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at);
