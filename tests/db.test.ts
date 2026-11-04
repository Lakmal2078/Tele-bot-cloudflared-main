import { describe, expect, it } from "vitest";
import { addDeposit, addWithdrawal, toCents, toPositiveCents, consumeRateLimitBuckets, getRateLimitBucket, recordRateLimitFailure, clearRateLimitBucket, cleanupExpiredRateLimitBuckets } from "../src/db";

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


type TransactionDatabase = Parameters<typeof addDeposit>[0];

function racingDatabase(winnerId: number, table: "deposits" | "withdrawals") {
  const state = { selects: 0, inserts: 0 };
  const fake = {
    prepare(sql: string) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes(`SELECT id FROM ${table}`)) {
            state.selects += 1;
            return state.selects >= 3 && winnerId > 0 ? { id: winnerId } : null;
          }
          return null;
        },
        async run() { return { success: true, meta: { changes: 1 } }; },
      };
    },
    async batch() {
      state.inserts += 1;
      throw new Error(`UNIQUE constraint failed: ${table}.idempotency_key`);
    },
  };
  return { db: fake as unknown as TransactionDatabase, state };
}

describe("financial transaction integrity", () => {
  it("recovers a concurrent deposit insert by returning the row that won the idempotency race", async () => {
    const { db, state } = racingDatabase(4242, "deposits");
    const id = await addDeposit(db, 555, "player", "PLAY-1", 1500, "receipt-1", "BANK", null, "dep-key-1");
    expect(id).toBe(4242);
    expect(state.inserts).toBe(1);
  });

  it("recovers a concurrent withdrawal insert by returning the row that won the idempotency race", async () => {
    const { db, state } = racingDatabase(777, "withdrawals");
    const id = await addWithdrawal(db, 555, "player", "PLAY-1", 1500, null, "BANK", "acct-1", "wd-key-1");
    expect(id).toBe(777);
    expect(state.inserts).toBe(1);
  });

  it("does not hide an insert failure when no idempotent transaction exists", async () => {
    const { db } = racingDatabase(0, "deposits");
    await expect(addDeposit(db, 555, "player", "PLAY-1", 1500, "receipt-1", "BANK", null, "missing-key"))
      .rejects.toThrow(/UNIQUE constraint failed/);
  });

  it("rejects zero and negative withdrawals at the database boundary", async () => {
    const unused = {} as TransactionDatabase;
    await expect(addWithdrawal(unused, 555, "player", "PLAY-1", 0, null)).rejects.toThrow("Amount must be greater than zero");
    await expect(addWithdrawal(unused, 555, "player", "PLAY-1", -1, null)).rejects.toThrow("Amount must be greater than zero");
  });
});


describe("shared D1 rate-limit storage", () => {
  it("atomically increments and caps shared request buckets", async () => {
    const { createD1Database } = await import("../src/sqlite-d1");
    const db = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    const spec = [{ key: "test:user:1", limit: 2, windowMs: 60_000 }];

    const [first] = await consumeRateLimitBuckets(db, spec, now);
    const [second] = await consumeRateLimitBuckets(db, spec, now);
    const [blocked] = await consumeRateLimitBuckets(db, spec, now);
    const [stillBlocked] = await consumeRateLimitBuckets(db, spec, now);

    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(blocked.count).toBe(2);
    expect(blocked.consumed).toBe(false);
    expect(stillBlocked.count).toBe(2);
    expect(stillBlocked.consumed).toBe(false);
  });

  it("does not consume the global bucket when the per-user bucket is already full", async () => {
    const { createD1Database } = await import("../src/sqlite-d1");
    const db = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    const buckets = [
      { key: "global", limit: 10, windowMs: 60_000 },
      { key: "user:1", limit: 1, windowMs: 60_000 },
    ];

    const first = await consumeRateLimitBuckets(db, buckets, now);
    const blocked = await consumeRateLimitBuckets(db, buckets, now);
    expect(first.every((bucket) => bucket.consumed)).toBe(true);
    expect(blocked.every((bucket) => !bucket.consumed)).toBe(true);
    expect(blocked.find((bucket) => bucket.bucket_key === "global")?.count).toBe(1);
    expect(blocked.find((bucket) => bucket.bucket_key === "user:1")?.count).toBe(1);
  });

  it("stores admin failure counters without persisting client IP addresses", async () => {
    const { createD1Database } = await import("../src/sqlite-d1");
    const db = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    await recordRateLimitFailure(db, "admin:failed:hashed-client", 10, 60_000, now);
    await recordRateLimitFailure(db, "admin:failed:hashed-client", 10, 60_000, now);

    const bucket = await getRateLimitBucket(db, "admin:failed:hashed-client");
    expect(bucket?.count).toBe(2);
    expect(bucket?.bucket_key).not.toContain("203.0.113.1");

    await clearRateLimitBucket(db, "admin:failed:hashed-client");
    expect(await getRateLimitBucket(db, "admin:failed:hashed-client")).toBeNull();
  });

  it("cleans expired shared rate-limit buckets", async () => {
    const { createD1Database } = await import("../src/sqlite-d1");
    const db = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    await consumeRateLimitBuckets(db, [{ key: "expired:1", limit: 2, windowMs: 1000 }], now);
    const deleted = await cleanupExpiredRateLimitBuckets(db, now + 1001);
    expect(deleted).toBe(1);
    expect(await getRateLimitBucket(db, "expired:1")).toBeNull();
  });
});
