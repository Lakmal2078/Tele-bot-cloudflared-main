import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
});
