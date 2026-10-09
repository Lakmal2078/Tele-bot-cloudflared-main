import { describe, expect, it } from "vitest";
import { createBot, executionContextStorage } from "../src/bot";
import type { Env } from "../src/types";

function createMockD1(): any {
  const createStmt = () => {
    const stmt: any = {
      bind: (..._args: any[]) => stmt,
      first: async <T = unknown>(): Promise<T | null> => null,
      all: async <T = unknown>(): Promise<{ results: T[] }> => ({ results: [] }),
      run: async () => ({ success: true, meta: { changes: 1 } }),
    };
    return stmt;
  };

  return {
    prepare: (_sql: string) => createStmt(),
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
  };
}

const mockEnv: Env = {
  DB: createMockD1(),
  BOT_TOKEN: "123456789:ABCDEF_mock_bot_token_for_tests",
  ADMIN_IDS: "123456789",
  WEBHOOK_SECRET: "mock_secret",
  ADMIN_API_SECRET: "admin_secret_token_123",
  CHANNEL_USERNAME: "@xbet_test",
  CHANNEL_URL: "https://t.me/xbet_test",
  XBET_LINK: "https://example.com",
  XBET_PROMO_CODE: "TEST",
  MIN_TRANSACTION_LKR: "1000",
  MAX_TRANSACTION_LKR: "100000",
  DEPOSIT_INSTRUCTIONS: "Instructions",
};

describe("Telegram Bot Core (createBot)", () => {
  it("initializes a valid grammY bot instance without throwing", () => {
    const bot = createBot(mockEnv);
    expect(bot).toBeDefined();
    expect(bot.api).toBeDefined();
    expect(typeof bot.use).toBe("function");
    expect(typeof bot.command).toBe("function");
    expect(typeof bot.on).toBe("function");
  });

  it("attaches dynamic env and waitUntil from executionContextStorage", async () => {
    let waitUntilCalled = false;
    const updatedEnv: Env = { ...mockEnv, BOT_USERNAME: "fresh_env_bot" };
    const mockWaitUntil = (prom: Promise<unknown>) => {
      waitUntilCalled = true;
      prom.catch(() => {});
    };

    await executionContextStorage.run(
      { env: updatedEnv, waitUntil: mockWaitUntil },
      async () => {
        const store = executionContextStorage.getStore();
        expect(store?.env?.BOT_USERNAME).toBe("fresh_env_bot");
        store?.waitUntil?.(Promise.resolve("test"));
        expect(waitUntilCalled).toBe(true);
      }
    );
  });
});
