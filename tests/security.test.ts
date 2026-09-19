import { describe, expect, it } from "vitest";
import {
  adminAttemptAllowed,
  adminAttemptAllowedNode,
  landingPageSecurityHeaders,
  recordAdminFailure,
  recordAdminFailureNode,
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
          headers: { "Content-Type": "text/plain", "Content-Length": "10" },
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

  it("rejects webhook bodies without Content-Length", () => {
    expect(
      webhookRequestAllowed(
        new Request("https://example.test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      )
    ).toBe(false);
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

  it("omits upgrade-insecure-requests for HTTP landing pages", () => {
    const headers = landingPageSecurityHeaders("abcdef1234567890", { isHttps: false });
    expect(headers["Content-Security-Policy"]).not.toContain("upgrade-insecure-requests");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
  });

  it("keeps upgrade-insecure-requests for HTTPS landing pages", () => {
    const headers = landingPageSecurityHeaders("abcdef1234567890", { isHttps: true });
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
  });

});

describe("admin abuse protection", () => {
  it("blocks repeated failures within the Worker window", () => {
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

  it("applies the same limit to Node request headers", () => {
    const headers = { "cf-connecting-ip": "203.0.113.20" };
    const now = 2_000_000;

    for (let i = 0; i < SECURITY_LIMITS.ADMIN_FAILURE_LIMIT; i += 1) {
      expect(adminAttemptAllowedNode(headers, now)).toBe(true);
      recordAdminFailureNode(headers, now);
    }

    expect(adminAttemptAllowedNode(headers, now)).toBe(false);
    expect(adminAttemptAllowedNode(headers, now + SECURITY_LIMITS.ADMIN_FAILURE_WINDOW_MS + 1)).toBe(true);
  });
});

describe("security headers", () => {
  it("returns browser hardening headers", () => {
    const headers = securityHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'none'");
    expect(headers["X-DNS-Prefetch-Control"]).toBe("off");
    expect(headers["X-Permitted-Cross-Domain-Policies"]).toBe("none");
    expect(headers["Origin-Agent-Cluster"]).toBe("?1");
  });

  it("returns strict landing page CSP with frame-ancestors none and nonce support", () => {
    const headersNoNonce = landingPageSecurityHeaders();
    expect(headersNoNonce["X-Frame-Options"]).toBe("DENY");
    expect(headersNoNonce["Content-Security-Policy"]).toContain("frame-ancestors 'none'");

    const testNonce = "abcdef1234567890";
    const headersWithNonce = landingPageSecurityHeaders(testNonce);
    expect(headersWithNonce["Content-Security-Policy"]).toContain(`'nonce-${testNonce}'`);
    expect(headersWithNonce["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headersWithNonce["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
  });
});
