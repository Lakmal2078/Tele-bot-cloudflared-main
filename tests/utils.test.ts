import { describe, it, expect } from "vitest";
import { escapeMarkdown, escapeCode } from "../src/utils";

describe("escapeMarkdown", () => {
  it("returns empty string for null/undefined/empty input", () => {
    expect(escapeMarkdown(null)).toBe("");
    expect(escapeMarkdown(undefined)).toBe("");
    expect(escapeMarkdown("")).toBe("");
  });

  it("escapes underscores, asterisks, backticks and brackets", () => {
    expect(escapeMarkdown("a_b")).toBe("a\\_b");
    expect(escapeMarkdown("*bold*")).toBe("\\*bold\\*");
    expect(escapeMarkdown("`code`")).toBe("\\`code\\`");
    // Markdown V1: only the opening '[' starts a link entity, so only '[' is escaped
    expect(escapeMarkdown("[link]")).toBe("\\[link]");
  });

  it("leaves safe characters untouched", () => {
    expect(escapeMarkdown("LKR 1,500.50 (OK)")).toBe("LKR 1,500.50 (OK)");
  });

  it("converts non-string input to string", () => {
    expect(escapeMarkdown(12345 as unknown as string)).toBe("12345");
  });
});

describe("escapeCode", () => {
  it("returns empty string for null/undefined/empty input", () => {
    expect(escapeCode(null)).toBe("");
    expect(escapeCode(undefined)).toBe("");
    expect(escapeCode("")).toBe("");
  });

  it("replaces backticks with single quotes so code blocks stay intact", () => {
    expect(escapeCode("`injection`")).toBe("'injection'");
  });

  it("keeps normal identifiers unchanged", () => {
    expect(escapeCode("VGSL-PROMO-01")).toBe("VGSL-PROMO-01");
  });
});
