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
});
