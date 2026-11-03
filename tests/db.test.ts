import { describe, expect, it } from "vitest";
import { toCents, toPositiveCents } from "../src/db";

describe("financial amount validation", () => {
  it("converts positive LKR to integer cents", () => {
    expect(toPositiveCents(1000)).toBe(100000);
    expect(toPositiveCents(1000.5)).toBe(100050);
  });

  it("rejects zero", () => {
    expect(() => toPositiveCents(0)).toThrow("Amount must be greater than zero");
  });

  it("rejects negative amounts", () => {
    expect(() => toPositiveCents(-100)).toThrow("Amount must be greater than zero");
  });

  it("rejects NaN and Infinity", () => {
    expect(() => toPositiveCents(Number.NaN)).toThrow("Amount must be greater than zero");
    expect(() => toPositiveCents(Number.POSITIVE_INFINITY)).toThrow("Amount must be greater than zero");
  });

  it("keeps generic toCents behavior unchanged", () => {
    expect(toCents(0)).toBe(0);
    expect(toCents(1000)).toBe(100000);
  });
});

describe("optimized database queries", () => {
  it("getStats runs in parallel and computes accurate system stats", async () => {
    const { createD1Database } = await import("../src/sqlite-d1");
    const db = await import("../src/db");
    const d1 = createD1Database(":memory:");

    await db.saveUser(d1, 101, "user1", "First", null, "si");
    await db.saveUser(d1, 102, "user2", "Second", null, "en");

    const depId = await db.addDeposit(d1, 101, "user1", "p1", 5000, "rec1", "BANK", null);
    await db.updateDepositStatus(d1, depId, "APPROVED");

    const wdId = await db.addWithdrawal(d1, 102, "user2", "p2", 2000, "COMMERCIAL", "12345");
    await db.updateWithdrawalStatus(d1, wdId, "APPROVED");

    const stats = await db.getStats(d1);
    expect(stats.totalUsers).toBe(2);
    expect(stats.todayUsers).toBe(2);
    expect(stats.approvedDepositsCount).toBe(1);
    expect(stats.approvedDepositsVolume).toBe(5000);
    expect(stats.approvedWithdrawalsCount).toBe(1);
    expect(stats.approvedWithdrawalsVolume).toBe(2000);
  });

  it("getUserIdsPaged supports keyset pagination using afterUserId", async () => {
    const { createD1Database } = await import("../src/sqlite-d1");
    const db = await import("../src/db");
    const d1 = createD1Database(":memory:");

    for (let id = 1; id <= 5; id++) {
      await db.saveUser(d1, id * 10, `user${id}`, `Name${id}`, null, "si");
    }

    // Page 1 using limit 2
    const page1 = await db.getUserIdsPaged(d1, 2, 0);
    expect(page1).toEqual([10, 20]);

    // Page 2 using keyset pagination (afterUserId = 20)
    const page2 = await db.getUserIdsPaged(d1, 2, 0, 20);
    expect(page2).toEqual([30, 40]);

    // Page 3 using keyset pagination (afterUserId = 40)
    const page3 = await db.getUserIdsPaged(d1, 2, 0, 40);
    expect(page3).toEqual([50]);
  });
});
