import { describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { hasValidAdminSession } from "../src/adminSession";
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

  it("does not publicly cache a landing page that carries a CSP nonce", () => {
    const withNonce = landingPageSecurityHeaders("abcdef1234567890");
    expect(withNonce["Cache-Control"]).toContain("no-store");
    expect(withNonce["Cache-Control"]).not.toContain("s-maxage");

    const withoutNonce = landingPageSecurityHeaders();
    expect(withoutNonce["Cache-Control"]).toContain("s-maxage=86400");
  });

  it("treats a malformed admin session cookie as unauthenticated", async () => {
    const request = new Request("https://example.test/admin", {
      headers: { Cookie: "admin_session=%" },
    });
    await expect(hasValidAdminSession(request, { ADMIN_API_SECRET: "x".repeat(32) })).resolves.toBe(false);
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


describe("deployment health gate failure paths", () => {
  function runHealthGate(options: {
    workerUrl?: string;
    ci?: boolean;
    curlExit?: number;
    httpCode?: string;
    body?: string;
  }) {
    const script = readFileSync("deploy.sh", "utf8");
    const start = script.indexOf("# ── Post-deployment health check");
    const end = script.indexOf("# ── Auto-register Telegram webhook", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const healthBlock = script.slice(start, end);

    const temp = mkdtempSync(join(tmpdir(), "deploy-health-test-"));
    const bin = join(temp, "bin");
    mkdirSync(bin);
    const fakeCurl = join(bin, "curl");
    writeFileSync(fakeCurl, `#!/usr/bin/env bash
out=""
while [[ $# -gt 0 ]]; do
  if [[ "$1" == "--output" ]]; then out="$2"; shift 2; else shift; fi
done
printf '%s' "\\${BODY:-}" > "$out"
printf '%s' "\\${HTTP_CODE:-200}"
exit "\\${CURL_EXIT:-0}"
`);
    chmodSync(fakeCurl, 0o755);

    const harness = `set -Eeuo pipefail
CI_MODE="\\${CI:-false}"
IS_CI=false
if [[ "$CI_MODE" == "true" || "$CI_MODE" == "1" ]]; then IS_CI=true; fi
HEALTH_CHECK_PATH="\\${HEALTH_CHECK_PATH:-/health}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
WORKER_URL="\\${WORKER_URL:-}"
info() { :; }
success() { :; }
warn() { :; }
die() { printf '%s\\n' "$*" >&2; exit 1; }
${healthBlock}`;
    try {
      return spawnSync("bash", ["-c", harness], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH || ""}`,
          WORKER_URL: options.workerUrl ?? "",
          CI: options.ci === false ? "false" : "true",
          CURL_EXIT: String(options.curlExit ?? 0),
          HTTP_CODE: options.httpCode ?? "200",
          BODY: options.body ?? "",
        },
      });
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  }

  it("fails CI when the deployed Worker URL is missing", () => {
    const result = runHealthGate({});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Worker URL could not be detected");
  });

  it("fails CI when curl reports a network or timeout error", () => {
    const result = runHealthGate({ workerUrl: "https://worker.example", curlExit: 28 });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("curl exit 28");
  });

  it("fails CI when the health endpoint returns a non-200 status", () => {
    const result = runHealthGate({ workerUrl: "https://worker.example", httpCode: "503" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("HTTP 503");
  });

  it("fails CI for invalid, unhealthy, or empty health responses", () => {
    const invalid = runHealthGate({ workerUrl: "https://worker.example", body: "{invalid" });
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain("status=ok");

    const unhealthy = runHealthGate({
      workerUrl: "https://worker.example",
      body: '{"status":"ok","configuration":{"healthy":false}}',
    });
    expect(unhealthy.status).toBe(1);
    expect(unhealthy.stderr).toContain("healthy=false");

    const empty = runHealthGate({ workerUrl: "https://worker.example", body: "" });
    expect(empty.status).toBe(1);
    expect(empty.stderr).toContain("empty response body");
  });

  it("passes CI only for HTTP 200 with status=ok and configuration.healthy=true", () => {
    const result = runHealthGate({
      workerUrl: "https://worker.example",
      body: '{"status":"ok","configuration":{"healthy":true}}',
    });
    expect(result.status).toBe(0);
  });
});
