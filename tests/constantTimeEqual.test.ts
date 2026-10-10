import { describe, it, expect } from "vitest";
import { constantTimeEqual } from "../src/config";

describe("constantTimeEqual", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEqual("my-secret-token", "my-secret-token")).toBe(true);
    expect(constantTimeEqual("", "")).toBe(true);
    expect(constantTimeEqual("a".repeat(100), "a".repeat(100))).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(constantTimeEqual("my-secret-token-1", "my-secret-token-2")).toBe(false);
    expect(constantTimeEqual("a", "b")).toBe(false);
  });

  it("returns false for different strings of different length without throwing", () => {
    expect(constantTimeEqual("short", "much-longer-secret-token")).toBe(false);
    expect(constantTimeEqual("", "non-empty")).toBe(false);
    expect(constantTimeEqual("non-empty", "")).toBe(false);
  });

  it("handles unicode and special characters", () => {
    expect(constantTimeEqual("පැස්වර්ඩ්123!", "පැස්වර්ඩ්123!")).toBe(true);
    expect(constantTimeEqual("පැස්වර්ඩ්123!", "පැස්වර්ඩ්123?")).toBe(false);
  });
});
