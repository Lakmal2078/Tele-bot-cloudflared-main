import { describe, expect, it } from "vitest";
import { adminAuthorized, handleApiRequest, hashClientIp } from "../src/apiRoutes";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "../src/adminSession";
import { SECURITY_LIMITS } from "../src/security";
import type { Env } from "../src/types";

function createMockD1(): any {
  const createStmt = () => {
    const stmt: any = {
      bind: (..._args: any[]) => stmt,
      first: async () => ({ c: 0 }),
      all: async () => ({ results: [] }),
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

const SECRET = "super_secret_admin_token_12345";

const baseEnv: Env = {
  DB: createMockD1(),
  BOT_TOKEN: "mock_token",
  ADMIN_IDS: "123456789",
  ADMIN_CHANNEL_ID: "-100123456789",
  WEBHOOK_SECRET: "mock_secret_webhook",
  ADMIN_API_SECRET: SECRET,
  CHANNEL_USERNAME: "xbet_test",
  CHANNEL_URL: "https://t.me/xbet_test",
  TIPS_CHANNEL_ID: "-100987654321",
  TIPS_CHANNEL_URL: "https://t.me/tips_test",
  ODDS_API_KEY: "mock_odds_key",
  XBET_LINK: "https://example.com",
  XBET_PROMO_CODE: "TEST",
  MIN_TRANSACTION_LKR: "100",
  MAX_TRANSACTION_LKR: "100000",
  DEPOSIT_INSTRUCTIONS: "Instructions",
};

function req(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

describe("admin secret transport (M1)", () => {
  it("ignores a secret supplied in the query string", () => {
    expect(adminAuthorized(req(`http://localhost/admin?secret=${SECRET}`), baseEnv)).toBe(false);
  });

  it("accepts the secret from headers only", () => {
    expect(adminAuthorized(req("http://localhost/admin", { headers: { "x-admin-secret": SECRET } }), baseEnv)).toBe(true);
    expect(adminAuthorized(req("http://localhost/admin", { headers: { Authorization: `Bearer ${SECRET}` } }), baseEnv)).toBe(true);
  });
});

describe("admin session cookie login", () => {
  it("exchanges a POSTed secret for a signed HttpOnly cookie", async () => {
    const body = new URLSearchParams({ secret: SECRET });
    const res = await handleApiRequest(
      req("https://localhost/admin/login", { method: "POST", body }),
      baseEnv
    );
    expect(res?.status).toBe(303);
    const cookie = res?.headers.get("Set-Cookie") || "";
    expect(cookie).toContain(ADMIN_SESSION_COOKIE);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain(SECRET);
  });

  it("rejects a wrong secret with 401", async () => {
    const body = new URLSearchParams({ secret: "wrong" });
    const res = await handleApiRequest(
      req("https://localhost/admin/login", { method: "POST", body }),
      baseEnv
    );
    expect(res?.status).toBe(401);
    expect(res?.headers.get("Set-Cookie")).toBeNull();
  });

  it("clears the cookie on logout", async () => {
    const res = await handleApiRequest(
      req("https://localhost/admin/logout", { method: "POST" }),
      baseEnv
    );
    expect(res?.status).toBe(303);
    expect(res?.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("verifies only unexpired, correctly signed tokens", async () => {
    const token = await createAdminSessionToken(SECRET);
    expect(await verifyAdminSessionToken(token, SECRET)).toBe(true);
    expect(await verifyAdminSessionToken(token, "other-secret")).toBe(false);
    const expired = await createAdminSessionToken(SECRET, Date.now() - 10_000, 1_000);
    expect(await verifyAdminSessionToken(expired, SECRET)).toBe(false);
  });

  it("authorizes an admin API call with a valid session cookie", async () => {
    const token = await createAdminSessionToken(SECRET);
    const res = await handleApiRequest(
      req("https://localhost/api/admin/status", {
        headers: { Cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
      }),
      baseEnv
    );
    expect(res?.status).toBe(200);
  });
});

describe("admin panel fails closed (M3)", () => {
  it("does not authorize when no secrets are configured", async () => {
    const env = { ...baseEnv, ADMIN_API_SECRET: undefined, WEBHOOK_SECRET: undefined } as unknown as Env;
    const res = await handleApiRequest(req("https://localhost/admin"), env);
    expect(res?.status).toBe(200);
    const html = (await res?.text()) || "";
    expect(html).toContain("Admin Login");
    expect(html).not.toContain("Total Users");
  });
});

describe("admin brute-force protection (M2)", () => {
  it("returns 429 after repeated failed logins from the same client", async () => {
    const headers = { "CF-Connecting-IP": "203.0.113.77" };
    let last: Response | null = null;
    for (let i = 0; i < SECURITY_LIMITS.ADMIN_FAILURE_LIMIT + 2; i += 1) {
      last = await handleApiRequest(
        req("https://localhost/api/admin/status", {
          headers: { ...headers, "x-admin-secret": "wrong-secret" },
        }),
        baseEnv
      );
    }
    expect(last?.status).toBe(429);
  });
});

describe("tip click IP hashing (L4)", () => {
  it("produces a stable salted hash, not a random value", async () => {
    const a = await hashClientIp("198.51.100.4", baseEnv);
    const b = await hashClientIp("198.51.100.4", baseEnv);
    const c = await hashClientIp("198.51.100.5", baseEnv);
    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
