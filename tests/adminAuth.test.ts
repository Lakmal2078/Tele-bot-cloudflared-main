import { describe, expect, it } from "vitest";
import { adminAuthorized, handleApiRequest, hashClientIp } from "../src/apiRoutes";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "../src/adminSession";
import { SECURITY_LIMITS } from "../src/security";
import type { Env } from "../src/types";

import { createMockD1 } from "./helpers/mockD1";

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

  it("requires URL-encoded login content", async () => {
    const res = await handleApiRequest(
      req("https://localhost/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: SECRET }),
      }),
      baseEnv
    );
    expect(res?.status).toBe(415);
    expect(res?.headers.get("Set-Cookie")).toBeNull();
  });

  it("rejects login bodies larger than 4 KiB", async () => {
    const body = new URLSearchParams({ secret: SECRET, extra: "x".repeat(5 * 1024) });
    const res = await handleApiRequest(
      req("https://localhost/admin/login", { method: "POST", body }),
      baseEnv
    );
    expect(res?.status).toBe(413);
    expect(res?.headers.get("Set-Cookie")).toBeNull();
  });

  it("rejects duplicate secret form fields", async () => {
    const body = new URLSearchParams();
    body.append("secret", SECRET);
    body.append("secret", SECRET);
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

describe("admin IP allowlist enforcement", () => {
  const allowlistedEnv = { ...baseEnv, ADMIN_IP_ALLOWLIST: "203.0.113.10" };

  it("blocks valid-secret login attempts from an IP outside the allowlist", async () => {
    const body = new URLSearchParams({ secret: SECRET });
    const res = await handleApiRequest(
      req("https://localhost/admin/login", {
        method: "POST",
        headers: { "CF-Connecting-IP": "203.0.113.11" },
        body,
      }),
      allowlistedEnv
    );
    expect(res?.status).toBe(403);
    expect(res?.headers.get("Set-Cookie")).toBeNull();
  });

  it("blocks an authenticated dashboard session outside the allowlist", async () => {
    const token = await createAdminSessionToken(SECRET);
    const res = await handleApiRequest(
      req("https://localhost/admin", {
        headers: {
          "CF-Connecting-IP": "203.0.113.11",
          Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        },
      }),
      allowlistedEnv
    );
    expect(res?.status).toBe(403);
  });

  it("allows login from an IP in the allowlist", async () => {
    const body = new URLSearchParams({ secret: SECRET });
    const res = await handleApiRequest(
      req("https://localhost/admin/login", {
        method: "POST",
        headers: { "CF-Connecting-IP": "203.0.113.10" },
        body,
      }),
      allowlistedEnv
    );
    expect(res?.status).toBe(303);
  });
});

describe("tip click endpoint abuse controls", () => {
  function createClickTrackingEnv() {
    const baseDb = createMockD1();
    let clickWrites = 0;
    const DB = {
      ...baseDb,
      prepare(sql: string) {
        const statement = baseDb.prepare(sql);
        if (!sql.includes("INSERT INTO tip_clicks")) return statement;
        let proxy: any;
        proxy = new Proxy(statement, {
          get(target, property) {
            if (property === "bind") return (...args: any[]) => {
              target.bind(...args);
              return proxy;
            };
            if (property === "run") {
              return async () => {
                clickWrites += 1;
                return target.run();
              };
            }
            const value = Reflect.get(target, property);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
        return proxy;
      },
      batch: baseDb.batch.bind(baseDb),
    };
    return { env: { ...baseEnv, DB } as Env, clickWrites: () => clickWrites };
  }

  it("rejects malformed tip IDs and oversized tracking values before writing", async () => {
    const { env, clickWrites } = createClickTrackingEnv();
    const invalidId = await handleApiRequest(
      req("https://localhost/go/tip/not-a-number", {
        headers: { "CF-Connecting-IP": "198.51.100.40" },
      }),
      env
    );
    expect(invalidId?.status).toBe(400);

    const oversized = await handleApiRequest(
      req(`https://localhost/go/tip/12?event=${"e".repeat(129)}`, {
        headers: { "CF-Connecting-IP": "198.51.100.40" },
      }),
      env
    );
    expect(oversized?.status).toBe(400);
    expect(clickWrites()).toBe(0);
  });

  it("rate-limits click logging to 30 requests per IP per minute", async () => {
    const { env, clickWrites } = createClickTrackingEnv();
    const headers = { "CF-Connecting-IP": "198.51.100.41" };
    let last: Response | null = null;
    for (let index = 0; index < 31; index += 1) {
      last = await handleApiRequest(req("https://localhost/go/tip/12", { headers }), env);
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("Retry-After")).toBe("60");
    expect(clickWrites()).toBe(30);
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

describe("admin security & regression fixes", () => {
  it("does not rate-limit repeated GET /admin page loads while still blocking brute-force POST /admin/login", async () => {
    const db = createMockD1();
    const env = { ...baseEnv, DB: db };
    const headers = { "CF-Connecting-IP": "198.51.100.99" };

    for (let i = 0; i < SECURITY_LIMITS.ADMIN_FAILURE_LIMIT + 5; i += 1) {
      const getRes = await handleApiRequest(req("https://localhost/admin", { headers }), env);
      expect(getRes?.status).toBe(200);
      expect(getRes?.headers.get("X-Frame-Options")).toBe("DENY");
      expect(getRes?.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    }

    let lastLoginRes: Response | null = null;
    for (let i = 0; i < SECURITY_LIMITS.ADMIN_FAILURE_LIMIT + 1; i += 1) {
      lastLoginRes = await handleApiRequest(
        req("https://localhost/admin/login", {
          method: "POST",
          headers,
          body: new URLSearchParams({ secret: "wrong-secret" }),
        }),
        env
      );
    }
    expect(lastLoginRes?.status).toBe(429);
  });

  it("serves authenticated /admin with anti-clickjacking headers and no inline onclick handlers", async () => {
    const token = await createAdminSessionToken(SECRET);
    const res = await handleApiRequest(
      req("https://localhost/admin", {
        headers: { Cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
      }),
      baseEnv
    );
    expect(res?.status).toBe(200);
    expect(res?.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res?.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    const html = (await res?.text()) || "";
    expect(html).not.toMatch(/\sonclick=/i);
    expect(html).toContain("data-copy-target=");
  });

  it("accepts a valid configured numeric X-Admin-Id header on POST /api/admin/tips/settlement/override", async () => {
    const res = await handleApiRequest(
      req("https://localhost/api/admin/tips/settlement/override", {
        method: "POST",
        headers: {
          "x-admin-secret": SECRET,
          "x-admin-id": "123456789",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipPostId: 1,
          eventId: "evt_123",
          outcome: "WON",
          note: "Verified match score",
        }),
      }),
      baseEnv
    );
    expect(res?.status).toBe(200);
    expect(await res?.json()).toEqual({ ok: true });
  });
});

