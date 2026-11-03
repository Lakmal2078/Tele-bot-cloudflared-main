import { describe, it, expect } from "vitest";
import worker, { validateWorkerStartupEnv } from "../src/worker";
import type { Env, D1Database } from "../src/types";

const mockDb = {
  prepare: () => ({
    bind: () => ({
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({ success: true }),
    }),
  }),
  batch: async () => [],
} as unknown as D1Database;

const validEnv: Partial<Env> = {
  BOT_TOKEN: "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567",
  BOT_USERNAME: "test_bot",
  BOT_MODE: "production",
  WEBHOOK_SECRET: "super_secret_webhook_token_123456",
  ADMIN_IDS: "7990858914,12345678",
  ADMIN_CHANNEL_ID: "-1001234567890",
  PUBLIC_BASE_URL: "https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev",
  CHANNEL_USERNAME: "@fast_xbet_official_tips",
  CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
  MIN_TRANSACTION_LKR: "1000",
  MAX_TRANSACTION_LKR: "500000",
  EZCASH_NUMBER: "0765865387",
  DB: mockDb,
};

describe("Worker Startup Validation Check", () => {
  it("passes when all mandatory environment variables and bindings are present", () => {
    expect(() => validateWorkerStartupEnv(validEnv)).not.toThrow();
  });

  it("throws clear error when BOT_TOKEN is missing", () => {
    expect(() => validateWorkerStartupEnv({ ...validEnv, BOT_TOKEN: "" })).toThrowError(
      /BOT_TOKEN is missing or empty/
    );
  });

  it("throws clear error when WEBHOOK_SECRET is missing or too short", () => {
    expect(() => validateWorkerStartupEnv({ ...validEnv, WEBHOOK_SECRET: "" })).toThrowError(
      /WEBHOOK_SECRET is missing or empty/
    );
    expect(() => validateWorkerStartupEnv({ ...validEnv, WEBHOOK_SECRET: "short" })).toThrowError(
      /WEBHOOK_SECRET must be at least 16 characters/
    );
  });

  it("throws clear error when ADMIN_IDS is missing", () => {
    expect(() => validateWorkerStartupEnv({ ...validEnv, ADMIN_IDS: "" })).toThrowError(
      /ADMIN_IDS is missing or empty/
    );
  });

  it("throws clear error when DB binding is missing", () => {
    expect(() => validateWorkerStartupEnv({ ...validEnv, DB: undefined })).toThrowError(
      /DB \(Cloudflare D1 Database binding\) is missing/
    );
  });

  it("fails fast in fetch handler before processing requests when environment is invalid", async () => {
    const invalidEnv = { ...validEnv, BOT_TOKEN: undefined } as unknown as Env;
    const req = new Request("https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev/api/status");
    const response = await worker.fetch(req, invalidEnv);

    expect(response.status).toBe(503);
    const body = (await response.json()) as any;
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Worker Startup Configuration Error");
    expect(body.message).toContain("BOT_TOKEN is missing or empty");
  });
});
