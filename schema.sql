-- Users
CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  referred_by INTEGER,
  language TEXT DEFAULT 'si',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referred_by) REFERENCES users(user_id)
);

-- Deposits
-- amount stored as INTEGER LKR cents (e.g. 1000.50 LKR => 100050) to avoid floating-point precision loss
CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT,
  player_id TEXT NOT NULL,
  amount INTEGER NOT NULL,  -- LKR cents
  payment_method TEXT DEFAULT 'BANK',
  photo_file_id TEXT,
  r2_url TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT,  -- soft delete
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Withdrawals
-- amount stored as INTEGER LKR cents
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT,
  player_id TEXT NOT NULL,
  amount INTEGER NOT NULL,  -- LKR cents
  payment_method TEXT DEFAULT 'BANK',
  destination_account TEXT,
  security_code TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT,  -- soft delete
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_id) REFERENCES users(user_id),
  FOREIGN KEY (referred_id) REFERENCES users(user_id)
);

-- Simple user state for multi-step flows (deposit / withdraw)
CREATE TABLE IF NOT EXISTS user_state (
  user_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,          -- e.g. 'deposit_photo', 'deposit_player_id', 'deposit_amount'
  data TEXT,                   -- JSON string for temporary data
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Admin Actions Audit Trail
-- Permanent record of every approve/reject decision, separate from the 30-day R2 log retention.
CREATE TABLE IF NOT EXISTS admin_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  admin_username TEXT,
  action TEXT NOT NULL,           -- e.g. 'DEPOSIT_APPROVED', 'WITHDRAWAL_REJECTED'
  target_type TEXT NOT NULL CHECK(target_type IN ('DEPOSIT', 'WITHDRAWAL')),
  target_id INTEGER NOT NULL,
  target_user_id INTEGER,
  amount INTEGER,                 -- LKR cents, snapshot for quick reference
  details TEXT,                   -- JSON string (fraud flags present at time of decision, etc.)
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_deleted ON deposits(deleted_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_deleted ON withdrawals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_state_updated ON user_state(updated_at);
-- Fraud-prevention lookups: duplicate receipts & shared player IDs
CREATE INDEX IF NOT EXISTS idx_deposits_photo ON deposits(photo_file_id);
CREATE INDEX IF NOT EXISTS idx_deposits_player ON deposits(player_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_player ON withdrawals(player_id);
CREATE INDEX IF NOT EXISTS idx_deposits_created ON deposits(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawals(created_at);
-- Admin audit trail lookups
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at);

