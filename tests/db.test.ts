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
