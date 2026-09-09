PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  referred_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referred_by) REFERENCES users(user_id)
);
INSERT INTO "users" ("user_id","username","first_name","referred_by","created_at") VALUES(5385645192,'Lakmalvidanagamage','Lakmal',NULL,'2026-09-08 02:37:26');
INSERT INTO "users" ("user_id","username","first_name","referred_by","created_at") VALUES(8658733173,'lakmalvgs','Vgs',NULL,'2026-09-08 02:37:06');
CREATE TABLE deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT,
  player_id TEXT NOT NULL,
  amount REAL NOT NULL,
  photo_file_id TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT, deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE TABLE withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT,
  player_id TEXT NOT NULL,
  amount REAL NOT NULL,
  security_code TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT, deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE TABLE referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (referrer_id) REFERENCES users(user_id),
  FOREIGN KEY (referred_id) REFERENCES users(user_id)
);
CREATE TABLE user_state (
  user_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,          -- e.g. 'deposit_photo', 'deposit_player_id', 'deposit_amount'
  data TEXT,                   -- JSON string for temporary data
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO "user_state" ("user_id","state","data","updated_at") VALUES(8658733173,'deposit_photo','{}','2026-09-08 03:12:25');
CREATE TABLE media_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  file_type TEXT NOT NULL,
  telegram_file_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_deposits_user ON deposits(user_id);
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_deposits_deleted ON deposits(deleted_at);
CREATE INDEX idx_withdrawals_deleted ON withdrawals(deleted_at);
CREATE INDEX idx_user_state_updated ON user_state(updated_at);
