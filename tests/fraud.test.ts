import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../src/fraud";
import { toCents, fromCents } from "../src/db";
import { createMockD1 } from "./helpers/mockD1";

describe("fraud.checkRateLimit (atomic D1 deposit/withdrawal limits)", () => {
  it("allows the first three submissions and atomically blocks the fourth", async () => {
    const database = createMockD1();
    const now = 1_800_000_000_000;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await checkRateLimit(database, 42, "deposits", now);
      expect(result.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(database, 42, "deposits", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.blockMessage).toContain("තැන්පතු");
    expect(blocked.blockMessage).toContain("deposit");
  });

  it("uses separate buckets for deposits and withdrawals", async () => {
    const database = createMockD1();
    const now = 1_800_000_000_000;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await checkRateLimit(database, 42, "deposits", now);
    }
    expect((await checkRateLimit(database, 42, "withdrawals", now)).allowed).toBe(true);
    expect((await checkRateLimit(database, 43, "deposits", now)).allowed).toBe(true);
  });

  it("resets an expired rate-limit window", async () => {
    const database = createMockD1();
    const now = 1_800_000_000_000;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await checkRateLimit(database, 42, "withdrawals", now);
    }
    expect((await checkRateLimit(database, 42, "withdrawals", now + 600_001)).allowed).toBe(true);
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
