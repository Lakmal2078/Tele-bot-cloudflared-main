-- Phase 4: database-level duplicate/fraud submission protection.
-- These guards run before a transaction row is created, so concurrent Telegram
-- updates cannot bypass the application-level fraud checks.

-- A receipt screenshot may be re-submitted by the same Telegram account, but
-- the same active receipt must never be accepted for a different account.
-- Historical/soft-deleted rows remain untouched.
CREATE TRIGGER IF NOT EXISTS prevent_cross_user_duplicate_receipt
BEFORE INSERT ON deposits
WHEN NEW.photo_file_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM deposits
    WHERE photo_file_id = NEW.photo_file_id
      AND deleted_at IS NULL
      AND user_id <> NEW.user_id
  )
BEGIN
  SELECT RAISE(ABORT, 'DUPLICATE_RECEIPT');
END;

-- Prevent an accidental double-submit of the exact same withdrawal while the
-- first request is still pending. Different amounts/destinations remain valid.
CREATE TRIGGER IF NOT EXISTS prevent_duplicate_pending_withdrawal
BEFORE INSERT ON withdrawals
WHEN EXISTS (
  SELECT 1
  FROM withdrawals
  WHERE user_id = NEW.user_id
    AND player_id = NEW.player_id
    AND amount = NEW.amount
    AND payment_method = NEW.payment_method
    AND IFNULL(destination_account, '') = IFNULL(NEW.destination_account, '')
    AND status = 'PENDING'
    AND deleted_at IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'DUPLICATE_WITHDRAWAL');
END;

-- Indexes support the trigger predicates and normal fraud-review queries.
CREATE INDEX IF NOT EXISTS idx_deposits_active_receipt
  ON deposits(photo_file_id)
  WHERE photo_file_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawals_pending_dedupe
  ON withdrawals(user_id, player_id, amount, payment_method, destination_account)
  WHERE status = 'PENDING' AND deleted_at IS NULL;
