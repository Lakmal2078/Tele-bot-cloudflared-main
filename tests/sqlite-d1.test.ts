import { describe, expect, it } from "vitest";
import { createD1Database } from "../src/sqlite-d1";
import * as db from "../src/db";

describe("Node SQLite D1 Implementation", () => {
  it("initializes and runs migrations in memory", async () => {
    const d1 = createD1Database(":memory:");
    expect(d1).toBeDefined();

    // Verify tables exist by inserting and querying a user
    await db.saveUser(d1, 12345, "testuser", "Test", null, "si");
    const user = await db.getUser(d1, 12345);
    expect(user).not.toBeNull();
    expect(user?.user_id).toBe(12345);
    expect(user?.username).toBe("testuser");
    expect(user?.language).toBe("si");
  });

  it("handles deposit creation and status transitions correctly with race-safety", async () => {
    const d1 = createD1Database(":memory:");
    await db.saveUser(d1, 999, "depositor", "Dep", null, "en");

    const depId = await db.addDeposit(d1, 999, "depositor", "player_123", 5000, "file_abc", "ezcash", "https://r2.test/rec.jpg");
    expect(depId).toBeGreaterThan(0);

    const dep = await db.getDepositById(d1, depId);
    expect(dep).not.toBeNull();
    expect(dep?.player_id).toBe("player_123");
    expect(dep?.amount).toBe(5000);
    expect(dep?.status).toBe("PENDING");

    // Approve deposit
    const approved = await db.updateDepositStatus(d1, depId, "APPROVED");
    expect(approved).toBe(true);

    // Second approval should return false (race condition check)
    const approvedAgain = await db.updateDepositStatus(d1, depId, "APPROVED");
    expect(approvedAgain).toBe(false);

    const updatedDep = await db.getDepositById(d1, depId);
    expect(updatedDep?.status).toBe("APPROVED");
  });

  it("handles batch transactions cleanly", async () => {
    const d1 = createD1Database(":memory:");
    const stmt1 = d1.prepare("INSERT INTO users (user_id, username, first_name) VALUES (?, ?, ?)").bind(101, "u1", "U1");
    const stmt2 = d1.prepare("INSERT INTO users (user_id, username, first_name) VALUES (?, ?, ?)").bind(102, "u2", "U2");

    const batchRes = await d1.batch!([stmt1, stmt2]);
    expect(batchRes).toHaveLength(2);

    const countRow = await d1.prepare("SELECT COUNT(*) as count FROM users").first<{ count: number }>();
    expect(countRow?.count).toBe(2);
  });

  it("applies migrations idempotently without duplicate column errors on re-initialization", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const os = await import("node:os");

    const tmpDbPath = path.join(os.tmpdir(), `test-idempotent-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);

    try {
      // First initialization: executes all migrations
      const d1First = createD1Database(tmpDbPath, true);
      expect(d1First).toBeDefined();

      // Second initialization: runs against existing database with existing columns
      // Must not throw "duplicate column name: lease_token" or error
      const d1Second = createD1Database(tmpDbPath, true);
      expect(d1Second).toBeDefined();

      // Verify table and columns exist
      const row = await d1Second.prepare("SELECT id, scheduled_key, lease_token FROM tip_posts LIMIT 1").first();
      expect(row === null || typeof row === "object").toBe(true);

      // Verify migration tracking table
      const applied = await d1Second.prepare("SELECT COUNT(*) as cnt FROM d1_migrations").first<{ cnt: number }>();
      expect(applied?.cnt).toBeGreaterThanOrEqual(7);
    } finally {
      try {
        fs.unlinkSync(tmpDbPath);
      } catch {}
    }
  });
});
