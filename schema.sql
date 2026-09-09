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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_deleted ON deposits(deleted_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_deleted ON withdrawals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_state_updated ON user_state(updated_at);
