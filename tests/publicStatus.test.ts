import { describe, expect, it } from "vitest";
import { getPublicStatus } from "../src/publicStatus";
import type { Env } from "../src/types";

const env = (overrides: Partial<Env> = {}): Env => ({
  DB: {} as any,
  BOT_TOKEN: "",
  ADMIN_IDS: "",
  WEBHOOK_SECRET: "",
  ADMIN_API_SECRET: "",
  CHANNEL_USERNAME: "",
  CHANNEL_URL: "",
  XBET_LINK: "",
  XBET_PROMO_CODE: "",
  MIN_TRANSACTION_LKR: "1000",
  MAX_TRANSACTION_LKR: "500000",
  DEPOSIT_INSTRUCTIONS: "",
  ...overrides,
});

describe("public status contract", () => {
  it("reports worker online but Telegram configuration unavailable when credentials are absent", () => {
    const result = getPublicStatus(env(), "cf-worker");

    expect(result).toMatchObject({
      status: "online",
      service: "telegram-bot",
      runtime: "cf-worker",
      availability: "degraded",
      telegramConfiguration: "not_configured",
    });
    expect(result).not.toHaveProperty("BOT_TOKEN");
    expect(result).not.toHaveProperty("WEBHOOK_SECRET");
    expect(result.checkedAt).toMatch(/Z$/);
  });

  it("reports configuration ready only when both bot token and webhook secret exist", () => {
    const result = getPublicStatus(env({
      BOT_TOKEN: "test-bot-token",
      WEBHOOK_SECRET: "test-webhook-secret",
    }), "cf-worker");

    expect(result).toMatchObject({
      status: "online",
      availability: "available",
      telegramConfiguration: "ready",
    });
  });

  it("uses the same contract for the node runtime", () => {
    const result = getPublicStatus(env({
      BOT_TOKEN: "test-bot-token",
      WEBHOOK_SECRET: "test-webhook-secret",
    }), "node");

    expect(result.runtime).toBe("node");
    expect(result.status).toBe("online");
    expect(result.availability).toBe("available");
  });
});
