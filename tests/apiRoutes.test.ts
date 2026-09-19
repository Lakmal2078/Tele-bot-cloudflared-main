import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../src/apiRoutes";
import type { Env } from "../src/types";

function createMockD1(): any {
  const createStmt = () => {
    const stmt: any = {
      bind: (..._args: any[]) => stmt,
      first: async <T = unknown>(): Promise<T | null> => ({ c: 0 } as any),
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
  BOT_TOKEN: "mock_token",
  ADMIN_IDS: "123456789,987654321",
  ADMIN_CHANNEL_ID: "-100123456789",
  WEBHOOK_SECRET: "mock_secret_webhook",
  ADMIN_API_SECRET: "super_secret_admin_token_12345",
  CHANNEL_USERNAME: "xbet_test",
  CHANNEL_URL: "https://t.me/xbet_test",
  TIPS_CHANNEL_ID: "-100987654321",
  TIPS_CHANNEL_URL: "https://t.me/tips_test",
  ODDS_API_KEY: "mock_odds_key",
  // Required when automated tips are enabled (TIPS_CHANNEL_ID + ODDS_API_KEY).
  TIPS_SPORTS: "soccer_epl",
  TIPS_ODDS_REGIONS: "eu",
  TIPS_MIN_ODDS: "1.30",
  TIPS_MAX_ODDS: "3.00",
  TIPS_HOURS_AHEAD: "72",
  TIPS_PER_SLOT: "3",
  PUBLIC_BASE_URL: "https://example.workers.dev",
  XBET_LINK: "https://example.com",
  XBET_PROMO_CODE: "TEST",
  MIN_TRANSACTION_LKR: "100",
  MAX_TRANSACTION_LKR: "100000",
  DEPOSIT_INSTRUCTIONS: "Instructions",
};

describe("handleApiRequest", () => {
  it("responds to /health with 200 ok", async () => {
    const req = new Request("http://localhost/health");
    const res = await handleApiRequest(req, mockEnv);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    const data = (await res?.json()) as any;
    expect(data.status).toBe("ok");
    expect(data.service).toBe("telegram-bot");
    expect(data.configuration?.healthy).toBe(true);
  });

  it("responds to /api/health with HEAD 200", async () => {
    const req = new Request("http://localhost/api/health", { method: "HEAD" });
    const res = await handleApiRequest(req, mockEnv);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
  });

  it("responds to /health with 503 when configuration is invalid", async () => {
    const brokenEnv = { ...mockEnv, BOT_TOKEN: "" };
    const req = new Request("http://localhost/health");
    const res = await handleApiRequest(req, brokenEnv);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(503);
    const data = (await res?.json()) as any;
    expect(data.status).toBe("error");
    expect(data.configuration?.healthy).toBe(false);
    expect(Array.isArray(data.configuration?.issues)).toBe(true);
    expect(data.configuration.issues.length).toBeGreaterThan(0);
  });

  it("responds to /api/health with HEAD 503 when configuration is invalid", async () => {
    const brokenEnv = { ...mockEnv, WEBHOOK_SECRET: "" };
    const req = new Request("http://localhost/api/health", { method: "HEAD" });
    const res = await handleApiRequest(req, brokenEnv);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(503);
  });

  it("rejects unauthenticated access to webhook management endpoints", async () => {
    for (const path of ["/api/setup-webhook", "/api/telegram/webhook"]) {
      const getRes = await handleApiRequest(new Request(`http://localhost${path}`), mockEnv);
      expect(getRes?.status).toBe(401);

      const setRes = await handleApiRequest(
        new Request(`http://localhost${path}?action=set`, { method: "POST" }),
        mockEnv
      );
      expect(setRes?.status).toBe(401);
    }
  });

  it("rejects unauthorized access to /api/admin/status", async () => {
    const req = new Request("http://localhost/api/admin/status");
    const res = await handleApiRequest(req, mockEnv);
    expect(res?.status).toBe(401);
  });

  it("authorizes valid secret on /api/admin/status via Bearer token", async () => {
    const req = new Request("http://localhost/api/admin/status", {
      headers: { Authorization: `Bearer ${mockEnv.ADMIN_API_SECRET}` },
    });
    const res = await handleApiRequest(req, mockEnv, { runtime: "cf-worker" });
    expect(res?.status).toBe(200);
    const data = (await res?.json()) as any;
    expect(data.status).toBe("ok");
    expect(data.runtime).toBe("cf-worker");
  });

  it("authorizes valid secret on /api/admin/status via x-admin-secret header", async () => {
    const req = new Request("http://localhost/api/admin/status", {
      headers: { "x-admin-secret": mockEnv.ADMIN_API_SECRET },
    });
    const res = await handleApiRequest(req, mockEnv, { runtime: "node", isPolling: true });
    expect(res?.status).toBe(200);
    const data = (await res?.json()) as any;
    expect(data.status).toBe("ok");
    expect(data.mode).toBe("polling");
  });

  it("protects /api/receipts/get from unauthorized requests", async () => {
    const req = new Request("http://localhost/api/receipts/get?key=receipts/2026-09/test.jpg");
    const res = await handleApiRequest(req, mockEnv);
    expect(res?.status).toBe(401);
  });

  it("validates safe storage key for /api/receipts/get", async () => {
    const req = new Request("http://localhost/api/receipts/get?key=../etc/passwd", {
      headers: { Authorization: `Bearer ${mockEnv.ADMIN_API_SECRET}` },
    });
    const res = await handleApiRequest(req, mockEnv);
    expect(res?.status).toBe(400);
    const data = (await res?.json()) as any;
    expect(data.error).toContain("Invalid or unsafe storage key");
  });

  it("rejects non-admin actor on /api/admin/schedule", async () => {
    const req = new Request("http://localhost/api/admin/schedule", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockEnv.ADMIN_API_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Test",
        body: "Test body",
        scheduledFor: "2026-09-15T12:00:00Z",
        createdBy: 999999999, // not an admin ID
      }),
    });
    const res = await handleApiRequest(req, mockEnv);
    expect(res?.status).toBe(403);
    const data = (await res?.json()) as any;
    expect(data.error).toContain("createdBy must be a registered ID");
  });

  it("rejects non-admin actor on /api/admin/tickets PATCH", async () => {
    const req = new Request("http://localhost/api/admin/tickets", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${mockEnv.ADMIN_API_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        status: "CLOSED",
        adminId: 999999999, // not in ADMIN_IDS
      }),
    });
    const res = await handleApiRequest(req, mockEnv);
    expect(res?.status).toBe(403);
    const data = (await res?.json()) as any;
    expect(data.error).toContain("adminId must be a registered ID");
  });
});
