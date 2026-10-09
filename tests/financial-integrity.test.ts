import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createD1Database } from "../src/sqlite-d1";
import * as db from "../src/db";

describe("financial integrity migration", () => {
  const migration = readFileSync(resolve(process.cwd(), "migrations/0003_financial_integrity.sql"), "utf8");

  it("creates a durable financial audit trail", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS financial_audit");
    expect(migration).toContain("CHECK(event_type IN ('CREATED', 'STATUS_CHANGED', 'SOFT_DELETED'))");
    expect(migration).toContain("CHECK(amount > 0)");
  });

  it("audits deposit and withdrawal status transitions at database level", () => {
    expect(migration).toContain("trg_deposits_financial_audit_status");
    expect(migration).toContain("trg_withdrawals_financial_audit_status");
    expect(migration).toContain("OLD.status IS NOT NEW.status");
  });

  it("adds lease fields needed to recover stale scheduled-tip work safely", () => {
    expect(migration).toContain("ALTER TABLE tip_posts ADD COLUMN lease_token TEXT");
    expect(migration).toContain("ALTER TABLE tip_posts ADD COLUMN lease_expires_at TEXT");
    expect(migration).toContain("ALTER TABLE tip_posts ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0");
  });

  it("actually records financial_audit rows when transactions are created and updated", async () => {
    const d1 = createD1Database(":memory:");
    await db.saveUser(d1, 888, "trader", "Trader", null, "en");

    const depId = await db.addDeposit(d1, 888, "trader", "player_888", 10000, "file_xyz", "boc", "https://r2.test/rec888.jpg");
    expect(depId).toBeGreaterThan(0);

    // Status update triggers trg_deposits_financial_audit_status
    await db.updateDepositStatus(d1, depId, "APPROVED", 1, "Verified receipt");

    const auditAfterApprove = await d1.prepare("SELECT * FROM financial_audit WHERE entity_type = 'DEPOSIT' AND entity_id = ?").bind(depId).all();
    expect(auditAfterApprove.results.length).toBe(1);
    expect((auditAfterApprove.results[0] as any).event_type).toBe("STATUS_CHANGED");
    expect((auditAfterApprove.results[0] as any).from_status).toBe("PENDING");
    expect((auditAfterApprove.results[0] as any).to_status).toBe("APPROVED");
  });
});
