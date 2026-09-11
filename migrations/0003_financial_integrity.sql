-- XBet Telegram Bot — D1 migration 0003
-- Durable financial state-transition audit trail and scheduled-tip lease recovery.
-- Keep migrations immutable after production deployment.

-- Durable database-side audit trail. This is intentionally separate from R2 logs
-- because R2 logs have a retention policy while financial state history must persist.
CREATE TABLE IF NOT EXISTS financial_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('DEPOSIT', 'WITHDRAWAL')),
  entity_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('CREATED', 'STATUS_CHANGED', 'SOFT_DELETED')),
  from_status TEXT,
  to_status TEXT,
  amount INTEGER NOT NULL CHECK(amount > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_entity
  ON financial_audit(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_financial_audit_user
  ON financial_audit(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created
  ON financial_audit(created_at);

-- Backfill the durable audit trail for transactions that already existed before
-- migration 0003. Existing rows are represented by their current state.
INSERT INTO financial_audit (
  entity_type, entity_id, user_id, event_type, from_status, to_status, amount, created_at
)
SELECT
  'DEPOSIT', id, user_id, 'CREATED', NULL, status, amount, COALESCE(created_at, datetime('now'))
FROM deposits
WHERE amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM financial_audit a
    WHERE a.entity_type = 'DEPOSIT' AND a.entity_id = deposits.id AND a.event_type = 'CREATED'
  );

INSERT INTO financial_audit (
  entity_type, entity_id, user_id, event_type, from_status, to_status, amount, created_at
)
SELECT
  'WITHDRAWAL', id, user_id, 'CREATED', NULL, status, amount, COALESCE(created_at, datetime('now'))
FROM withdrawals
WHERE amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM financial_audit a
    WHERE a.entity_type = 'WITHDRAWAL' AND a.entity_id = withdrawals.id AND a.event_type = 'CREATED'
  );

-- Database-side guards: every future financial state transition is recorded even
-- if application code changes or a second code path is introduced later.
CREATE TRIGGER IF NOT EXISTS trg_deposits_financial_audit_status
AFTER UPDATE OF status ON deposits
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO financial_audit (
    entity_type, entity_id, user_id, event_type, from_status, to_status, amount
  ) VALUES (
    'DEPOSIT', NEW.id, NEW.user_id, 'STATUS_CHANGED', OLD.status, NEW.status, NEW.amount
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_withdrawals_financial_audit_status
AFTER UPDATE OF status ON withdrawals
WHEN OLD.status IS NOT NEW.status
BEGIN
  INSERT INTO financial_audit (
    entity_type, entity_id, user_id, event_type, from_status, to_status, amount
  ) VALUES (
    'WITHDRAWAL', NEW.id, NEW.user_id, 'STATUS_CHANGED', OLD.status, NEW.status, NEW.amount
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_deposits_financial_audit_delete
AFTER UPDATE OF deleted_at ON deposits
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
  INSERT INTO financial_audit (
    entity_type, entity_id, user_id, event_type, from_status, to_status, amount
  ) VALUES (
    'DEPOSIT', NEW.id, NEW.user_id, 'SOFT_DELETED', NEW.status, NEW.status, NEW.amount
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_withdrawals_financial_audit_delete
AFTER UPDATE OF deleted_at ON withdrawals
WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
BEGIN
  INSERT INTO financial_audit (
    entity_type, entity_id, user_id, event_type, from_status, to_status, amount
  ) VALUES (
    'WITHDRAWAL', NEW.id, NEW.user_id, 'SOFT_DELETED', NEW.status, NEW.status, NEW.amount
  );
END;

-- Scheduled tips use a lease so two overlapping cron invocations cannot both own
-- the same slot. A stale lease can be safely reclaimed after the expiry time.
ALTER TABLE tip_posts ADD COLUMN lease_token TEXT;
ALTER TABLE tip_posts ADD COLUMN lease_expires_at TEXT;
ALTER TABLE tip_posts ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tip_posts_lease
  ON tip_posts(status, lease_expires_at);
