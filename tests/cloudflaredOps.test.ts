import { beforeEach, describe, expect, it } from "vitest";
import { createD1Database } from "../src/sqlite-d1";
import type { Env } from "../src/types";
import { handleOpsRequest, type OpsHandlerDeps } from "../src/opsRoutes";
import { isSealedSecret, openSecret, sealSecret, secretHint } from "../src/cloudflared/secrets";
import {
  createAlertRule,
  evaluateAccess,
  listAccessRules,
  listDeliveries,
  listEvents,
  listStoredSettings,
  recordTrafficSample,
  resolveOpsConfig,
  saveSettings,
  trafficTotals,
  uptimeSummary,
  type AccessRule,
} from "../src/cloudflared/store";
import {
  parseMetrics,
  redact,
  UnsupportedTunnelControl,
  type ControlResult,
  type ControlState,
  type TunnelControl,
} from "../src/cloudflared/supervisor";
import { runMonitorCycle, TrafficSampler } from "../src/cloudflared/runtime";
import { OPS_PAGE_PATHS } from "../src/ops/types";

const ADMIN_SECRET = "test-admin-secret-1234567890";
const PEPPER = "test-pepper-value-1234567890";

function createEnv(db: any): Env {
  return {
    DB: db,
    BOT_TOKEN: "",
    ADMIN_IDS: "",
    WEBHOOK_SECRET: "",
    ADMIN_API_SECRET: ADMIN_SECRET,
    SECURITY_CODE_PEPPER: PEPPER,
    CHANNEL_USERNAME: "xbet_test",
    CHANNEL_URL: "https://t.me/xbet_test",
    XBET_LINK: "https://example.com",
    XBET_PROMO_CODE: "TEST",
    MIN_TRANSACTION_LKR: "100",
    MAX_TRANSACTION_LKR: "100000",
    DEPOSIT_INSTRUCTIONS: "Instructions",
  };
}

function adminDeps(control: TunnelControl, overrides: Partial<OpsHandlerDeps> = {}): OpsHandlerDeps {
  return {
    control,
    keyMaterial: PEPPER,
    isAdmin: async (request: Request) => (request.headers.get("X-Admin-Secret") || "") === ADMIN_SECRET,
    prepareControl: () => {},
    refresh: async () => "Health check completed.",
    lastMonitorMessage: () => null,
    ...overrides,
  };
}

function formRequest(path: string, fields: Record<string, string>, authorized: boolean): Request {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (authorized) headers["X-Admin-Secret"] = ADMIN_SECRET;
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields).toString(),
  });
}

class StubControl implements TunnelControl {
  private running = false;
  state(): ControlState {
    return {
      supported: true,
      running: this.running,
      pid: this.running ? 4242 : null,
      startedAt: this.running ? new Date().toISOString() : null,
      binary: "cloudflared",
      binAvailable: true,
      lastExitCode: null,
      lastExitAt: null,
      message: this.running ? "running" : "stopped",
    };
  }
  recentLog(): string[] {
    return [];
  }
  async start(): Promise<ControlResult> {
    this.running = true;
    return { ok: true, message: "Connector started with PID 4242." };
  }
  async stop(): Promise<ControlResult> {
    this.running = false;
    return { ok: true, message: "Connector stopped." };
  }
  async restart(): Promise<ControlResult> {
    return this.start();
  }
}

describe("cloudflared credential encryption", () => {
  it("seals credentials so the plaintext is never stored", async () => {
    const sealed = await sealSecret("tunnel-token-plaintext", PEPPER);
    expect(sealed).not.toContain("tunnel-token-plaintext");
    expect(isSealedSecret(sealed)).toBe(true);
    await expect(openSecret(sealed, PEPPER)).resolves.toBe("tunnel-token-plaintext");
    expect(secretHint(sealed)).not.toContain("tunnel");
  });

  it("fails to open a credential with the wrong key", async () => {
    const sealed = await sealSecret("api-token-value", PEPPER);
    await expect(openSecret(sealed, "another-pepper-value-1234")).rejects.toBeTruthy();
  });
});

describe("settings storage", () => {
  let db: any;
  let env: Env;

  beforeEach(() => {
    db = createD1Database(":memory:");
    env = createEnv(db);
  });

  it("stores credentials encrypted and keeps them out of page markup", async () => {
    const deps = adminDeps(new UnsupportedTunnelControl());
    const response = await handleOpsRequest(
      formRequest("/api/ops/settings", {
        account_id: "acct-123",
        tunnel_name: "xbet-tunnel",
        api_token: "super-secret-api-token",
        tunnel_token: "super-secret-tunnel-token",
      }, true),
      env,
      deps
    );

    expect(response?.status).toBe(303);
    const settings = await listStoredSettings(db);
    const apiTokenRow = settings.find((item) => item.key === "api_token");
    expect(apiTokenRow?.value).toBe("");
    expect(apiTokenRow?.hint).toContain("encrypted");

    const page = await handleOpsRequest(new Request("http://localhost/settings"), env, deps);
    const html = await page!.text();
    expect(html).not.toContain("super-secret-api-token");
    expect(html).not.toContain("super-secret-tunnel-token");
    expect(html).toContain("xbet-tunnel");
    expect(html).toContain("acct-123");
  });

  it("rejects unauthenticated saves and records the denial", async () => {
    const deps = adminDeps(new UnsupportedTunnelControl());
    const response = await handleOpsRequest(
      formRequest("/api/ops/settings", { account_id: "should-not-save" }, false),
      env,
      deps
    );

    expect(response?.status).toBe(401);
    const settings = await listStoredSettings(db);
    expect(settings.some((item) => item.key === "account_id")).toBe(false);
    const events = await listEvents(db, { action: "ops_action_denied" });
    expect(events.length).toBe(1);
  });

  it("resolves saved credentials over environment values", async () => {
    await saveSettings(db, PEPPER, { account_id: "saved-account" }, "admin");
    const config = await resolveOpsConfig(db, PEPPER, { CLOUDFLARE_ACCOUNT_ID: "env-account" });
    expect(config.accountId).toBe("saved-account");
  });

  it("keeps a saved credential when the field is left blank", async () => {
    await saveSettings(db, PEPPER, { api_token: "first-token-value" }, "admin");
    const result = await saveSettings(db, PEPPER, { api_token: "" }, "admin");
    expect(result.saved).toEqual([]);
    expect(result.skipped).toContain("api_token");
    const config = await resolveOpsConfig(db, PEPPER, {});
    expect(config.apiToken).toBe("first-token-value");
  });
});

describe("tunnel control", () => {
  let db: any;
  let env: Env;

  beforeEach(() => {
    db = createD1Database(":memory:");
    env = createEnv(db);
  });

  it("does not report success when the runtime cannot run a connector", async () => {
    const response = await handleOpsRequest(
      formRequest("/api/ops/tunnels/start", {}, true),
      env,
      adminDeps(new UnsupportedTunnelControl())
    );

    expect(response?.status).toBe(303);
    const location = decodeURIComponent(response!.headers.get("Location") || "");
    expect(location).toContain("error=");
    expect(decodeURIComponent(location.replace(/\+/g, " "))).toContain("not supported");

    const events = await listEvents(db, { action: "tunnel_start" });
    expect(events[0]?.level).toBe("error");
  });

  it("records a successful start from the supervisor", async () => {
    const control = new StubControl();
    const response = await handleOpsRequest(
      formRequest("/api/ops/tunnels/start", {}, true),
      env,
      adminDeps(control)
    );

    expect(response?.status).toBe(303);
    expect(decodeURIComponent(response!.headers.get("Location") || "")).toContain("ok=");
    const events = await listEvents(db, { action: "tunnel_start" });
    expect(events[0]?.level).toBe("info");
    expect(control.state().running).toBe(true);
  });

  it("parses cloudflared prometheus metrics", () => {
    const metrics = parseMetrics(
      [
        "# HELP cloudflared_tunnel_total_requests Total requests",
        "cloudflared_tunnel_total_requests 120",
        "cloudflared_tunnel_request_errors 3",
        "cloudflared_tunnel_rx_bytes 4096",
        "cloudflared_tunnel_tx_bytes 2048",
        "cloudflared_tunnel_ha_connections 1",
      ].join("\n")
    );
    expect(metrics).toEqual({ requests: 120, errors: 3, bytesIn: 4096, bytesOut: 2048, haConnections: 1 });
  });

  it("redacts the tunnel token from captured output", () => {
    const output = "starting with token super-secret-tunnel-token now";
    expect(redact(output, ["super-secret-tunnel-token"])).toContain("[redacted]");
    expect(redact(output, ["super-secret-tunnel-token"])).not.toContain("super-secret-tunnel-token");
  });
});

describe("access rules", () => {
  let db: any;
  let env: Env;

  beforeEach(() => {
    db = createD1Database(":memory:");
    env = createEnv(db);
  });

  const rule = (overrides: Partial<AccessRule>): AccessRule => ({
    id: 1,
    name: "rule",
    path_prefix: "/",
    match_kind: "ip",
    match_value: "203.0.113.5",
    action: "deny",
    enabled: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  });

  it("leaves paths outside every rule scope alone", () => {
    const decision = evaluateAccess([rule({ path_prefix: "/api/" })], { ip: "198.51.100.9", email: "", path: "/" });
    expect(decision.allowed).toBe(true);
    expect(decision.enforced).toBe(false);
  });

  it("lets an explicit deny win and requires allow rules to match", () => {
    const denied = evaluateAccess([rule({ action: "deny", match_value: "198.51.100.*", path_prefix: "/settings" })], {
      ip: "198.51.100.7",
      email: "",
      path: "/settings",
    });
    expect(denied.allowed).toBe(false);

    const notListed = evaluateAccess([rule({ action: "allow", match_value: "203.0.113.5", path_prefix: "/api/" })], {
      ip: "198.51.100.7",
      email: "",
      path: "/api/status",
    });
    expect(notListed.allowed).toBe(false);

    const listed = evaluateAccess([rule({ action: "allow", match_value: "203.0.113.5", path_prefix: "/api/" })], {
      ip: "203.0.113.5",
      email: "",
      path: "/api/status",
    });
    expect(listed.allowed).toBe(true);
  });

  it("creates rules through the admin action and logs them", async () => {
    const response = await handleOpsRequest(
      formRequest(
        "/api/ops/access/rules",
        { name: "Office only", path_prefix: "/api/", match_kind: "ip", match_value: "203.0.113.*", action: "deny" },
        true
      ),
      env,
      adminDeps(new UnsupportedTunnelControl())
    );
    expect(response?.status).toBe(303);

    const rules = await listAccessRules(db);
    expect(rules).toHaveLength(1);
    expect(rules[0].match_value).toBe("203.0.113.*");
    const events = await listEvents(db, { action: "access_rule_created" });
    expect(events).toHaveLength(1);
  });

  it("rejects an invalid rule without auth", async () => {
    const response = await handleOpsRequest(
      formRequest("/api/ops/access/rules", { name: "x", match_kind: "ip", match_value: "1.1.1.1" }, false),
      env,
      adminDeps(new UnsupportedTunnelControl())
    );
    expect(response?.status).toBe(401);
  });
});

describe("alerts", () => {
  let db: any;
  let env: Env;

  beforeEach(() => {
    db = createD1Database(":memory:");
    env = createEnv(db);
  });

  it("records a failed webhook delivery honestly", async () => {
    const ruleId = await createAlertRule(
      db,
      { name: "Down", event: "tunnel_down", channel: "webhook", target: "https://hooks.invalid/tunnel" },
      "admin"
    );
    const deps = adminDeps(new UnsupportedTunnelControl(), {
      fetcher: (async () => new Response("nope", { status: 500 })) as typeof fetch,
    });

    const response = await handleOpsRequest(
      formRequest("/api/ops/alerts/test", { id: String(ruleId) }, true),
      env,
      deps
    );

    expect(response?.status).toBe(303);
    expect(decodeURIComponent(response!.headers.get("Location") || "")).toContain("error=");
    const deliveries = await listDeliveries(db);
    expect(deliveries[0].status).toBe("failed");
  });

  it("marks a delivered webhook as sent", async () => {
    const ruleId = await createAlertRule(
      db,
      { name: "Down", event: "tunnel_down", channel: "webhook", target: "https://hooks.example.com/tunnel" },
      "admin"
    );
    const deps = adminDeps(new UnsupportedTunnelControl(), {
      fetcher: (async () => new Response("ok", { status: 200 })) as typeof fetch,
    });
    await handleOpsRequest(formRequest("/api/ops/alerts/test", { id: String(ruleId) }, true), env, deps);
    const deliveries = await listDeliveries(db);
    expect(deliveries[0].status).toBe("sent");
  });

  it("alerts once on a real status transition reported by the Cloudflare API", async () => {
    await createAlertRule(
      db,
      { name: "Down", event: "tunnel_down", channel: "webhook", target: "https://hooks.example.com/tunnel" },
      "admin"
    );

    const calls: string[] = [];
    const fetcher = (async (input: any) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/cfd_tunnel?") || url.includes("/cfd_tunnel/")) {
        if (url.endsWith("/connections")) {
          return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
        }
        return new Response(
          JSON.stringify({ success: true, result: [{ id: "tunnel-1", name: "xbet-tunnel", status: "inactive" }] }),
          { status: 200 }
        );
      }
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    const config = await resolveOpsConfig(db, PEPPER, {});
    const withApi = { ...config, accountId: "acct-1", apiToken: "api-token", tunnelName: "xbet-tunnel" };
    const deps = { control: new UnsupportedTunnelControl(), keyMaterial: PEPPER, fetcher };

    const first = await runMonitorCycle(env as any, withApi, deps, new TrafficSampler());
    expect(first.status).toBe("down");
    expect(calls.some((url) => url.startsWith("https://hooks.example.com"))).toBe(true);

    const second = await runMonitorCycle(env as any, withApi, deps, new TrafficSampler());
    expect(second.status).toBe("down");
    const hookCalls = calls.filter((url) => url.startsWith("https://hooks.example.com"));
    expect(hookCalls).toHaveLength(1);

    const statusEvents = await listEvents(db, { action: "tunnel_status_changed" });
    expect(statusEvents).toHaveLength(1);
    const deliveries = await listDeliveries(db);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].status).toBe("sent");
  });
});

describe("traffic statistics", () => {
  it("aggregates recorded samples into totals", async () => {
    const db = createD1Database(":memory:");
    await recordTrafficSample(db, { tunnelName: "default", bytesIn: 100, bytesOut: 40, requests: 2, errors: 0 });
    await recordTrafficSample(db, { tunnelName: "default", bytesIn: 50, bytesOut: 10, requests: 1, errors: 1 });
    const totals = await trafficTotals(db, "default", 24);
    expect(totals.bytesIn).toBe(150);
    expect(totals.bytesOut).toBe(50);
    expect(totals.requests).toBe(3);
    expect(totals.errors).toBe(1);
  });

  it("renders the chart from samples and an empty state without them", async () => {
    const db = createD1Database(":memory:");
    const env = createEnv(db);
    const deps = adminDeps(new UnsupportedTunnelControl());

    const empty = await handleOpsRequest(new Request("http://localhost/traffic-stats"), env, deps);
    const emptyHtml = await empty!.text();
    expect(emptyHtml).toContain("No traffic data yet");

    await recordTrafficSample(db, { tunnelName: "default", bytesIn: 2048, bytesOut: 1024, requests: 5, errors: 0 });
    await recordTrafficSample(db, { tunnelName: "default", bytesIn: 4096, bytesOut: 3072, requests: 9, errors: 0 });

    const page = await handleOpsRequest(new Request("http://localhost/traffic-stats"), env, deps);
    const html = await page!.text();
    expect(html).toContain("<svg");
    expect(html).toContain("Ingress");
  });
});

describe("operations pages", () => {
  it("renders every page with the top navigation and no leaked credentials", async () => {
    const db = createD1Database(":memory:");
    const env = createEnv(db);
    await saveSettings(db, PEPPER, { api_token: "never-shown-token" }, "admin");
    const deps = adminDeps(new UnsupportedTunnelControl());

    for (const path of OPS_PAGE_PATHS) {
      const response = await handleOpsRequest(new Request(`http://localhost${path}`), env, deps);
      expect(response, path).not.toBeNull();
      expect(response!.status, path).toBe(200);
      const html = await response!.text();
      expect(html, path).toContain("Operations navigation");
      for (const link of OPS_PAGE_PATHS) expect(html, `${path} → ${link}`).toContain(`href="${link}"`);
      expect(html, path).not.toContain("never-shown-token");
    }
  });

  it("filters the activity log by level", async () => {
    const db = createD1Database(":memory:");
    const env = createEnv(db);
    const deps = adminDeps(new UnsupportedTunnelControl());

    await handleOpsRequest(
      formRequest(
        "/api/ops/access/rules",
        { name: "Bad", path_prefix: "/", match_kind: "ip", match_value: "9.9.9.9", action: "deny" },
        true
      ),
      env,
      deps
    );
    await handleOpsRequest(formRequest("/api/ops/tunnels/start", {}, true), env, deps);

    const tableBody = (html: string): string => html.split("<tbody>")[1]?.split("</tbody>")[0] || "";

    const errorPage = await handleOpsRequest(new Request("http://localhost/activity-logs?level=error"), env, deps);
    const errorRows = tableBody(await errorPage!.text());
    expect(errorRows).toContain("tunnel_start");
    expect(errorRows).not.toContain("access_rule_created");

    const infoPage = await handleOpsRequest(new Request("http://localhost/activity-logs?level=info"), env, deps);
    const infoRows = tableBody(await infoPage!.text());
    expect(infoRows).toContain("access_rule_created");
    expect(infoRows).not.toContain("tunnel_start");
  });

  it("does not count unknown checks as downtime", async () => {
    const db = createD1Database(":memory:");
    const insert = (status: string) =>
      db
        .prepare("INSERT INTO cloudflared_status_checks (created_at, tunnel_name, status, detail, connections) VALUES (?, 'default', ?, '', 0)")
        .bind(new Date().toISOString(), status)
        .run();
    await insert("unknown");
    await insert("unknown");
    const unknownOnly = await uptimeSummary(db, "default", 24);
    expect(unknownOnly.percent).toBeNull();
    expect(unknownOnly.checks).toBe(0);

    await insert("up");
    const mixed = await uptimeSummary(db, "default", 24);
    expect(mixed.checks).toBe(1);
    expect(mixed.percent).toBe(100);
  });

  it("serves the JSON snapshot only to an admin", async () => {
    const db = createD1Database(":memory:");
    const env = createEnv(db);
    const deps = adminDeps(new UnsupportedTunnelControl());

    const anonymous = await handleOpsRequest(new Request("http://localhost/api/ops/status"), env, deps);
    expect(anonymous?.status).toBe(401);

    const admin = await handleOpsRequest(
      new Request("http://localhost/api/ops/status", { headers: { "X-Admin-Secret": ADMIN_SECRET } }),
      env,
      deps
    );
    expect(admin?.status).toBe(200);
    const body = (await admin!.json()) as any;
    expect(body.ok).toBe(true);
    expect(body.connector.supported).toBe(false);
    expect(body.settings.apiTokenSource).toBe("missing");
  });

  it("accepts same-origin form posts even when a proxy rewrote the Host header", async () => {
    const db = createD1Database(":memory:");
    const env = createEnv(db);
    const response = await handleOpsRequest(
      new Request("http://internal-host/api/ops/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Admin-Secret": ADMIN_SECRET,
          Origin: "https://public-preview.example.com",
          "Sec-Fetch-Site": "same-origin",
        },
        body: "account_id=through-proxy",
      }),
      env,
      adminDeps(new UnsupportedTunnelControl())
    );
    expect(response?.status).toBe(303);
    const settings = await listStoredSettings(db);
    expect(settings.find((item) => item.key === "account_id")?.value).toBe("through-proxy");
  });

  it("rejects cross-origin form posts", async () => {
    const db = createD1Database(":memory:");
    const env = createEnv(db);
    const response = await handleOpsRequest(
      new Request("http://localhost/api/ops/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Admin-Secret": ADMIN_SECRET,
          Origin: "https://evil.example.com",
        },
        body: "account_id=stolen",
      }),
      env,
      adminDeps(new UnsupportedTunnelControl())
    );
    expect(response?.status).toBe(403);
    const settings = await listStoredSettings(db);
    expect(settings).toHaveLength(0);
  });
});
