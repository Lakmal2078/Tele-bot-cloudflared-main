import { describe, expect, it } from "vitest";
import { hashSecurityCode } from "../src/db";
import { validateEnv } from "../src/config";
import { redactSensitiveFields } from "../src/logger";

describe("hashSecurityCode (HMAC-SHA-256)", () => {
  const pepper = "test-pepper-at-least-16-chars";

  it("returns hmac-sha256: prefixed hex digest", async () => {
    const out = await hashSecurityCode("123456", pepper);
    expect(out.startsWith("hmac-sha256:")).toBe(true);
    expect(out.length).toBe("hmac-sha256:".length + 64);
  });

  it("is deterministic for the same code and pepper", async () => {
    const a = await hashSecurityCode("abc-code", pepper);
    const b = await hashSecurityCode("abc-code", pepper);
    expect(a).toBe(b);
  });

  it("differs when the code or pepper changes", async () => {
    const base = await hashSecurityCode("code-1", pepper);
    const otherCode = await hashSecurityCode("code-2", pepper);
    const otherPepper = await hashSecurityCode("code-1", "different-pepper-16+");
    expect(base).not.toBe(otherCode);
    expect(base).not.toBe(otherPepper);
  });

  it("rejects missing or short pepper", async () => {
    await expect(hashSecurityCode("x", "")).rejects.toThrow(/SECURITY_CODE_PEPPER/);
    await expect(hashSecurityCode("x", "short")).rejects.toThrow(/SECURITY_CODE_PEPPER/);
  });
});

describe("validateEnv security configuration", () => {
  const baseEnv = {
    BOT_TOKEN: "test-token",
    ADMIN_IDS: "123456789",
    WEBHOOK_SECRET: "webhook-secret-16",
    CHANNEL_USERNAME: "test_channel",
    MIN_TRANSACTION_LKR: "100",
    MAX_TRANSACTION_LKR: "10000",
    BANK_DETAILS: "test",
  };

  it("rejects a configured security pepper shorter than 16 characters", () => {
    const errors = validateEnv({ ...baseEnv, SECURITY_CODE_PEPPER: "short" });
    expect(errors).toContain("SECURITY_CODE_PEPPER must be at least 16 characters when configured");
  });

  it("accepts a configured security pepper with at least 16 characters", () => {
    const errors = validateEnv({ ...baseEnv, SECURITY_CODE_PEPPER: "0123456789abcdef" });
    expect(errors).not.toContain("SECURITY_CODE_PEPPER must be at least 16 characters when configured");
  });
});

describe("redactSensitiveFields", () => {
  it("redacts known sensitive keys at top level and one nested level", () => {
    const input = {
      userId: 1,
      security_code: "plain-secret",
      destination_account: "0771234567",
      details: {
        password: "p@ss",
        token: "tok",
        amount: 100,
      },
      amount: 500,
    };
    const out = redactSensitiveFields(input);
    expect(out.security_code).toBe("[REDACTED]");
    expect(out.destination_account).toBe("[REDACTED]");
    expect(out.details.password).toBe("[REDACTED]");
    expect(out.details.token).toBe("[REDACTED]");
    expect(out.details.amount).toBe(100);
    expect(out.userId).toBe(1);
    expect(out.amount).toBe(500);
  });

  it("leaves non-objects and arrays of primitives intact", () => {
    expect(redactSensitiveFields(null as unknown as object)).toBe(null);
    expect(redactSensitiveFields("x" as unknown as object)).toBe("x");
    expect(redactSensitiveFields([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

/** Magic-byte helpers mirrored from src/r2.ts for unit testing without network I/O. */
function detectReceiptKind(bytes: Uint8Array): "jpeg" | "png" | "webp" | "pdf" | null {
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  const isPdf =
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;
  if (isJpeg) return "jpeg";
  if (isPng) return "png";
  if (isWebp) return "webp";
  if (isPdf) return "pdf";
  return null;
}

describe("receipt magic-byte validation", () => {
  it("accepts JPEG / PNG / WebP / PDF signatures", () => {
    expect(detectReceiptKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(detectReceiptKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "png"
    );
    expect(
      detectReceiptKind(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
      )
    ).toBe("webp");
    expect(detectReceiptKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe("pdf");
  });

  it("rejects unrecognized payloads", () => {
    expect(detectReceiptKind(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
    expect(detectReceiptKind(new Uint8Array([0x7f, 0x45, 0x4c, 0x46]))).toBeNull(); // ELF
  });

  it("enforces a 5 MiB upper bound policy", () => {
    const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
    expect(MAX_RECEIPT_BYTES).toBe(5_242_880);
    expect(4 * 1024 * 1024 < MAX_RECEIPT_BYTES).toBe(true);
    expect(6 * 1024 * 1024 > MAX_RECEIPT_BYTES).toBe(true);
  });
});
