import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../src/fraud";
import { toCents, fromCents } from "../src/db";
import { createD1Database } from "../src/sqlite-d1";
import type { D1Database } from "../src/types";

describe("fraud.checkRateLimit (atomic rolling 10-minute cashier limits)", () => {
  it("allows three submissions and blocks the fourth", async () => {
    const database = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await checkRateLimit(database, 42, "deposits", now)).allowed).toBe(true);
    }
    const blocked = await checkRateLimit(database, 42, "deposits", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockMessage).toContain("තැන්පතු");
    expect(blocked.blockMessage).toContain("deposit");
  });

  it("keeps deposit, withdrawal, and user keys isolated", async () => {
    const database = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await checkRateLimit(database, 42, "deposits", now);
    }
    expect((await checkRateLimit(database, 42, "withdrawals", now)).allowed).toBe(true);
    expect((await checkRateLimit(database, 43, "deposits", now)).allowed).toBe(true);
  });

  it("does not reset at a fixed-window boundary while earlier attempts are still inside 10 minutes", async () => {
    const database = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await checkRateLimit(database, 42, "deposits", now + 1)).allowed).toBe(true);
    }

    expect((await checkRateLimit(database, 42, "deposits", now + 600_000)).allowed).toBe(false);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect((await checkRateLimit(database, 42, "deposits", now + 600_001)).allowed).toBe(true);
    }
    expect((await checkRateLimit(database, 42, "deposits", now + 600_001)).allowed).toBe(false);
  });

  it("expires events individually rather than resetting the entire window", async () => {
    const database = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    expect((await checkRateLimit(database, 7, "withdrawals", now)).allowed).toBe(true);
    expect((await checkRateLimit(database, 7, "withdrawals", now + 1_000)).allowed).toBe(true);
    expect((await checkRateLimit(database, 7, "withdrawals", now + 2_000)).allowed).toBe(true);

    expect((await checkRateLimit(database, 7, "withdrawals", now + 600_000)).allowed).toBe(true);
    expect((await checkRateLimit(database, 7, "withdrawals", now + 600_000)).allowed).toBe(false);

    expect((await checkRateLimit(database, 7, "withdrawals", now + 601_000)).allowed).toBe(true);
    expect((await checkRateLimit(database, 7, "withdrawals", now + 601_000)).allowed).toBe(false);
  });

  it("caps concurrent requests at three for a shared user key", async () => {
    const database = createD1Database(":memory:");
    const now = 1_800_000_000_000;
    const results = await Promise.all(
      Array.from({ length: 24 }, () => checkRateLimit(database, 99, "deposits", now))
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.filter((result) => !result.allowed)).toHaveLength(21);
  });

  it("fails closed when the shared limiter database is unavailable", async () => {
    const unavailable = {
      prepare() { throw new Error("D1 unavailable"); },
    } as unknown as D1Database;
    const result = await checkRateLimit(unavailable, 42, "withdrawals", 1_800_000_000_000);
    expect(result.allowed).toBe(false);
    expect(result.blockMessage).toContain("withdrawal");
  });
});

describe("money helpers (toCents / fromCents)", () => {
  it("converts LKR major units to integer cents without float drift", () => {
    expect(toCents(1500.5)).toBe(150050);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1000)).toBe(100000);
  });

  it("rejects invalid amounts", () => {
    expect(() => toCents(-1)).toThrow();
    expect(() => toCents(NaN)).toThrow();
    expect(() => toCents(Infinity)).toThrow();
  });

  it("round-trips cents back to major units", () => {
    expect(fromCents(150050)).toBe(1500.5);
    expect(fromCents(0)).toBe(0);
  });
});
