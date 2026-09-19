-- Hardening: clear residual plaintext security codes on completed withdrawals
-- and document that new codes are stored as sha256:<hex> only.
-- Existing PENDING rows with plaintext should be treated as sensitive; operators
-- may run a one-off update to null them after verification offline.

UPDATE withdrawals
SET security_code = NULL
WHERE status IN ('APPROVED', 'REJECTED')
  AND security_code IS NOT NULL
  AND deleted_at IS NULL;

-- Optional: for PENDING rows that still hold plaintext (not starting with sha256:),
-- leave them so operators can complete processing, then they are cleared on status update.
