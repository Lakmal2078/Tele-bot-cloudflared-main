import { describe, expect, it } from "vitest";
import {
  adminAttemptAllowed,
  recordAdminFailure,
  securityHeaders,
  webhookRequestAllowed,
  SECURITY_LIMITS,
} from "../src/security";

describe("webhook security", () => {
  it("requires POST application/json requests", () => {
    expect(webhookRequestAllowed(new Request("https://example.test", { method: "GET" }))).toBe(false);
    expect(
      webhookRequestAllowed(
        new Request("https://example.test", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
        })
      )
    ).toBe(false);
    expect(
      webhookRequestAllowed(
        new Request("https://example.test", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": "10" },
        })
      )
    ).toBe(true);
  });

  it("rejects oversized webhook bodies", () => {
    expect(
      webhookRequestAllowed(
        new Request("https://example.test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(SECURITY_LIMITS.MAX_WEBHOOK_BODY_BYTES + 1),
          },
        })
      )
    ).toBe(false);
  });
});

describe("admin abuse protection", () => {
  it("blocks repeated failures within the window", () => {
    const request = new Request("https://example.test/admin", {
      headers: { "CF-Connecting-IP": "198.51.100.10" },
    });
    const now = 1_000_000;

    for (let i = 0; i < SECURITY_LIMITS.ADMIN_FAILURE_LIMIT; i += 1) {
      expect(adminAttemptAllowed(request, now)).toBe(true);
      recordAdminFailure(request, now);
    }

    expect(adminAttemptAllowed(request, now)).toBe(false);
    expect(adminAttemptAllowed(request, now + SECURITY_LIMITS.ADMIN_FAILURE_WINDOW_MS + 1)).toBe(true);
  });
});

describe("security headers", () => {
  it("returns browser hardening headers", () => {
    const headers = securityHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'none'");
  });
});
