-- D1 integrity hardening: settlement idempotency and financial amount guards.
PRAGMA foreign_keys = ON;

DELETE FROM tip_results
WHERE id NOT IN (
  SELECT MAX(id)
  FROM tip_results
  GROUP BY tip_post_id, event_id
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tip_results_post_event
ON tip_results(tip_post_id, event_id);

CREATE TRIGGER IF NOT EXISTS trg_deposits_amount_positive_insert
BEFORE INSERT ON deposits
WHEN NEW.amount IS NULL OR NEW.amount <= 0
BEGIN
  SELECT RAISE(ABORT, 'deposit amount must be greater than zero');
END;

CREATE TRIGGER IF NOT EXISTS trg_deposits_amount_positive_update
BEFORE UPDATE OF amount ON deposits
WHEN NEW.amount IS NULL OR NEW.amount <= 0
BEGIN
  SELECT RAISE(ABORT, 'deposit amount must be greater than zero');
END;

CREATE TRIGGER IF NOT EXISTS trg_withdrawals_amount_positive_insert
BEFORE INSERT ON withdrawals
WHEN NEW.amount IS NULL OR NEW.amount <= 0
BEGIN
  SELECT RAISE(ABORT, 'withdrawal amount must be greater than zero');
END;

CREATE TRIGGER IF NOT EXISTS trg_withdrawals_amount_positive_update
BEFORE UPDATE OF amount ON withdrawals
WHEN NEW.amount IS NULL OR NEW.amount <= 0
BEGIN
  SELECT RAISE(ABORT, 'withdrawal amount must be greater than zero');
END;

CREATE INDEX IF NOT EXISTS idx_tip_posts_pending_settlement
ON tip_posts(status, result, commence_time);

CREATE INDEX IF NOT EXISTS idx_tip_results_settled_at
ON tip_results(settled_at, result);
