import { afterEach, describe, expect, it, vi } from "vitest";
import { checkTelegramBotConnection } from "../src/telegramStatus";
import { handleApiRequest } from "../src/apiRoutes";
import { renderLandingPage } from "../src/landingPage";
import type { Env } from "../src/types";

const mockEnv: Env = {
  DB: {} as any,
  BOT_TOKEN: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
  BOT_USERNAME: "@fast_1xbetcash_bot",
  PUBLIC_BASE_URL: "https://fast-xbet.lk",
  ADMIN_IDS: "123456789",
  ADMIN_CHANNEL_ID: "-100123456789",
  CHANNEL_USERNAME: "@fast_xbet_official_tips",
  CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
  TIPS_CHANNEL_ID: "-100987654321",
  TIPS_CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
  WEBHOOK_SECRET: "mock_webhook_secret",
  ADMIN_API_SECRET: "mock_admin_secret",
  ODDS_API_KEY: "mock_key",
  XBET_LINK: "https://refpa.top/L?tag=d_mock&p=/registration/",
  XBET_PROMO_CODE: "VGSL",
  MIN_TRANSACTION_LKR: "1000",
  MAX_TRANSACTION_LKR: "500000",
  DEPOSIT_INSTRUCTIONS: "Instructions",
};

describe("Telegram Bot API Status & Ping Indicator", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns not_configured when BOT_TOKEN is empty or missing", async () => {
    const emptyEnv = { ...mockEnv, BOT_TOKEN: "" };
    const res = await checkTelegramBotConnection(emptyEnv);

    expect(res.ok).toBe(false);
    expect(res.status).toBe("not_configured");
    expect(res.message).toContain("BOT_TOKEN is not configured");
    expect(res.checkedAt).toBeDefined();
  });

  it("successfully pings Telegram API when BOT_TOKEN is valid", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          id: 123456789,
          is_bot: true,
          first_name: "Fast xBet Cash Bot",
          username: "fast_1xbetcash_bot",
          can_join_groups: true,
        },
      }),
    });

    const res = await checkTelegramBotConnection(mockEnv);

    expect(res.ok).toBe(true);
    expect(res.status).toBe("connected");
    expect(res.bot?.username).toBe("fast_1xbetcash_bot");
    expect(res.bot?.firstName).toBe("Fast xBet Cash Bot");
    expect(res.pingMs).toBeGreaterThanOrEqual(0);
    expect(res.message).toContain("Connected to @fast_1xbetcash_bot");
  });

  it("handles Telegram API rejection / 401 Unauthorized gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        ok: false,
        error_code: 401,
        description: "Unauthorized",
      }),
    });

    const res = await checkTelegramBotConnection(mockEnv);

    expect(res.ok).toBe(false);
    expect(res.status).toBe("disconnected");
    expect(res.message).toContain("Unauthorized");
  });

  it("handles network failure when Telegram API is unreachable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network connection error"));

    const res = await checkTelegramBotConnection(mockEnv);

    expect(res.ok).toBe(false);
    expect(res.status).toBe("unreachable");
    expect(res.message).toContain("Could not reach Telegram API servers");
  });

  it("serves GET /api/bot/status with fresh status and no-cache headers", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        result: {
          id: 123456789,
          is_bot: true,
          first_name: "Fast xBet Cash Bot",
          username: "fast_1xbetcash_bot",
        },
      }),
    });

    const req = new Request("https://fast-xbet.lk/api/bot/status");
    const res = await handleApiRequest(req, mockEnv);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    expect(res?.headers.get("Cache-Control")).toContain("no-store");
    const json = (await res?.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.status).toBe("connected");
    expect(json.bot.username).toBe("fast_1xbetcash_bot");
  });

  it("serves HEAD /api/bot/status with 200 status", async () => {
    const req = new Request("https://fast-xbet.lk/api/bot/status", { method: "HEAD" });
    const res = await handleApiRequest(req, mockEnv);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
  });

  it("renders live bot status indicator elements in landing page HTML", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('id="botStatusWidget"');
    expect(html).toContain('id="botStatusDot"');
    expect(html).toContain('id="botStatusText"');
    expect(html).toContain('id="botStatusPing"');
    expect(html).toContain('id="heroBotStatusPill"');
    expect(html).toContain('id="phoneBotStatus"');
    expect(html).toContain('id="footerBotStatus"');
    expect(html).toContain('/api/bot/status');
  });
});
