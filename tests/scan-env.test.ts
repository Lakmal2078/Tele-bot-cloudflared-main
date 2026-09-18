// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  parseEnvFile,
  serializeEnvFile,
  scanEnvironment,
  KEY_DEFINITIONS,
} from "../scripts/scan-env.mjs";

describe("Environment Scanner & Validator", () => {
  it("correctly parses key-value pairs from .env text", () => {
    const raw = `
# Comment line
BOT_TOKEN="123456:ABC-DEF"
ADMIN_IDS='7990858914,123456'
EMPTY_VAL=
# Another comment
XBET_PROMO_CODE=VGSL
`;
    const parsed = parseEnvFile(raw);
    expect(parsed.BOT_TOKEN).toBe("123456:ABC-DEF");
    expect(parsed.ADMIN_IDS).toBe("7990858914,123456");
    expect(parsed.EMPTY_VAL).toBe("");
    expect(parsed.XBET_PROMO_CODE).toBe("VGSL");
  });

  it("detects missing mandatory keys when env is empty", () => {
    const results = scanEnvironment({});
    expect(results.valid).toBe(false);
    expect(results.missingMandatory.some((m: { key: string }) => m.key === "BOT_TOKEN")).toBe(true);
    expect(results.missingMandatory.some((m: { key: string }) => m.key === "ADMIN_IDS")).toBe(true);
    expect(results.missingMandatory.some((m: { key: string }) => m.key === "WEBHOOK_SECRET")).toBe(true);
    expect(results.missingMandatory.some((m: { key: string }) => m.key === "CHANNEL_URL")).toBe(true);
  });

  it("detects formatting errors for short WEBHOOK_SECRET and invalid ADMIN_IDS", () => {
    const invalidEnv = {
      BOT_TOKEN: "000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ADMIN_IDS: "not_a_number,7990858914",
      WEBHOOK_SECRET: "short", // less than 16 chars
      CHANNEL_URL: "https://t.me/test_channel",
      EZCASH_NUMBER: "0765865387",
    };

    const results = scanEnvironment(invalidEnv);
    expect(results.valid).toBe(false);
    expect(results.formatIssues.some((f: { key: string }) => f.key === "ADMIN_IDS")).toBe(true);
    expect(results.formatIssues.some((f: { key: string }) => f.key === "WEBHOOK_SECRET")).toBe(true);
  });

  it("warns when TIPS_CHANNEL_ID contains 'ID: ' prefix", () => {
    const envWithPrefix = {
      BOT_TOKEN: "000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ADMIN_IDS: "7990858914",
      WEBHOOK_SECRET: "123456789012345678",
      CHANNEL_URL: "https://t.me/test_channel",
      EZCASH_NUMBER: "0765865387",
      TIPS_CHANNEL_ID: "ID: -1004336999467",
    };

    const results = scanEnvironment(envWithPrefix);
    expect(results.valid).toBe(false);
    expect(results.formatIssues.some((f: { key: string }) => f.key === "TIPS_CHANNEL_ID")).toBe(true);
  });

  it("validates successfully when all mandatory and payment keys are valid", () => {
    const validEnv = {
      BOT_TOKEN: "000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ADMIN_IDS: "7990858914",
      WEBHOOK_SECRET: "REDACTED_WEBHOOK_SECRET_12345",
      CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
      CHANNEL_USERNAME: "@fast_xbet_official_tips",
      IPAY_NUMBER: "0740452530",
      MIN_TRANSACTION_LKR: "1000",
      MAX_TRANSACTION_LKR: "500000",
    };

    const results = scanEnvironment(validEnv);
    expect(results.valid).toBe(true);
    expect(results.missingMandatory.length).toBe(0);
    expect(results.formatIssues.length).toBe(0);
    expect(results.paymentCheckPassed).toBe(true);
  });

  it("generates structured .env serialization including headers", () => {
    const testEnv = {
      BOT_TOKEN: "123:test",
      ADMIN_IDS: "999",
      CUSTOM_EXTRA_VAR: "custom_value",
    };

    const serialized = serializeEnvFile(testEnv);
    expect(serialized).toContain("BOT_TOKEN=123:test");
    expect(serialized).toContain("ADMIN_IDS=999");
    expect(serialized).toContain("CUSTOM_EXTRA_VAR=custom_value");
    expect(serialized).toContain("1xBet Fast Cash Telegram Bot Environment Configuration");
  });

  it("provides default secret generators for security keys", () => {
    const webhookDef = KEY_DEFINITIONS.find((k: { key: string }) => k.key === "WEBHOOK_SECRET");
    const adminApiDef = KEY_DEFINITIONS.find((k: { key: string }) => k.key === "ADMIN_API_SECRET");

    expect(webhookDef?.defaultGenerator).toBeDefined();
    expect(adminApiDef?.defaultGenerator).toBeDefined();

    const genWebhook = webhookDef?.defaultGenerator?.();
    const genAdmin = adminApiDef?.defaultGenerator?.();

    expect(genWebhook?.length).toBeGreaterThanOrEqual(32);
    expect(genAdmin?.length).toBeGreaterThanOrEqual(32);
  });
});
