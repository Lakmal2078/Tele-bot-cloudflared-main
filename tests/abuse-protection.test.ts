import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "migrations/0004_abuse_protection.sql"), "utf8");
const botSource = readFileSync(resolve(process.cwd(), "src/bot.ts"), "utf8");
const fraudSource = readFileSync(resolve(process.cwd(), "src/fraud.ts"), "utf8");

describe("Phase 4 abuse protection", () => {
  it("enforces cross-user duplicate receipt protection before INSERT", () => {
    expect(migration).toContain("CREATE TRIGGER IF NOT EXISTS prevent_cross_user_duplicate_receipt");
    expect(migration).toContain("BEFORE INSERT ON deposits");
    expect(migration).toContain("user_id <> NEW.user_id");
    expect(migration).toContain("RAISE(ABORT, 'DUPLICATE_RECEIPT')");
  });

  it("allows historical/soft-deleted receipts to stop blocking legitimate submissions", () => {
    expect(migration).toContain("deleted_at IS NULL");
    expect(migration).toContain("idx_deposits_active_receipt");
  });

  it("blocks exact duplicate pending withdrawals at the database boundary", () => {
    expect(migration).toContain("CREATE TRIGGER IF NOT EXISTS prevent_duplicate_pending_withdrawal");
    expect(migration).toContain("BEFORE INSERT ON withdrawals");
    expect(migration).toContain("status = 'PENDING'");
    expect(migration).toContain("RAISE(ABORT, 'DUPLICATE_WITHDRAWAL')");
  });

  it("keeps callback admin authorization and atomic state transitions", () => {
    expect(botSource).toContain('if (!adminIds.has(user.id))');
    expect(botSource).toContain('data.startsWith("dep:")');
    expect(botSource).toContain('data.startsWith("wd:")');
    expect(botSource).toContain("await db.updateDepositStatus(env.DB, id, status)");
    expect(botSource).toContain("await db.updateWithdrawalStatus(env.DB, id, status)");
  });

  it("keeps Telegram transaction rate limits and fraud review checks enabled", () => {
    expect(fraudSource).toContain("checkRateLimit");
    expect(fraudSource).toContain("checkDepositFraud");
    expect(fraudSource).toContain("checkWithdrawalFraud");
    expect(fraudSource).toContain("DEPOSIT_RATE_LIMIT");
    expect(fraudSource).toContain("WITHDRAWAL_RATE_LIMIT");
  });
});
