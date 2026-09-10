import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../src/fraud";
import { toCents, fromCents } from "../src/db";
import type { D1Database } from "../src/types";

/**
 * Minimal in-memory D1 mock: returns a configurable COUNT for
 * `countRecentSubmissions` (the only query checkRateLimit makes).
 */
function mockD1(count: number): D1Database {
  return {
    prepare(_query: string) {
      return {
        bind(..._values: any[]) {
          return {
            async first<T = unknown>(): Promise<T | null> {
              return { c: count } as unknown as T;
            },
            async run() {
              return { success: true };
            },
            async all<T = unknown>() {
              return { results: [] as T[], success: true };
            },
          };
        },
        async first<T = unknown>(): Promise<T | null> {
          return null;
        },
        async run() {
          return { success: true };
        },
        async all<T = unknown>() {
          return { results: [] as T[], success: true };
        },
      };
    },
    exec() {},
    async batch() {
      return [];
    },
  };
}

describe("fraud.checkRateLimit (DB-backed deposit/withdrawal limits)", () => {
  it("allows submissions while under the per-window limit", async () => {
    const res = await checkRateLimit(mockD1(0), 42, "deposits");
    expect(res.allowed).toBe(true);
    expect(res.blockMessage).toBeUndefined();
  });

  it("allows submissions exactly at limit - 1", async () => {
    const res = await checkRateLimit(mockD1(2), 42, "withdrawals"); // limit is 3
    expect(res.allowed).toBe(true);
  });

  it("blocks deposits once 3 submissions exist in the window", async () => {
    const res = await checkRateLimit(mockD1(3), 42, "deposits");
    expect(res.allowed).toBe(false);
    expect(res.blockMessage).toContain("තැන්පතු");
    expect(res.blockMessage).toContain("deposit");
  });

  it("blocks withdrawals with a withdrawal-specific message", async () => {
    const res = await checkRateLimit(mockD1(5), 42, "withdrawals");
    expect(res.allowed).toBe(false);
    expect(res.blockMessage).toContain("withdrawal");
  });

  it("blocks far-past counts too (window is queried via SQL)", async () => {
    const res = await checkRateLimit(mockD1(99), 42, "deposits");
    expect(res.allowed).toBe(false);
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
