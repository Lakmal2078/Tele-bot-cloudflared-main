/**
 * HTTP entry point for the cloudflared operations pages (/dashboard,
 * /settings, /activity-logs, /tunnel-manager, /connected-devices,
 * /traffic-stats, /access-controls, /notifications).
 *
 * Pages render read-only for visitors. Every state-changing request must come
 * from an admin session (or admin credentials) and is recorded in the activity
 * log with its real outcome.
 */

import type { Env } from "./types";
import {
  clearSetting,
  createAccessRule,
  createAlertRule,
  deleteAccessRule,
  deleteAlertRule,
  listAccessRules,
  listAlertRules,
  listDeliveries,
  listDevices,
  listEventActions,
  listEvents,
  listTunnels,
  recordEvent,
  resolveOpsConfig,
  saveSettings,
  setAccessRuleEnabled,
  setAlertRuleEnabled,
  SETTING_KEYS,
  trafficSeries,
  trafficTotals,
  uptimeSummary,
  type OpsConfig,
  type SettingKey,
} from "./cloudflared/store";
import type { ApiError } from "./cloudflared/cloudflareApi";
import { collectHealth, sendTestAlert, type HealthSnapshot, type OpsDeps, type OpsEnv, type TrafficSampler } from "./cloudflared/runtime";
import type { ControlState, TunnelControl, TunnelMetrics } from "./cloudflared/supervisor";
import { OPS_PAGE_PATHS, type OpsPageData } from "./ops/types";
import { renderConnectedDevices, renderDashboard, renderTrafficStats, renderTunnelManager } from "./ops/pagesOverview";
import { renderAccessControls, renderActivityLogs, renderNotifications, renderSettings } from "./ops/pagesConfig";
import { opsLayout, signInPrompt } from "./ops/ui";

export interface OpsHandlerDeps {
  control: TunnelControl;
  /** Encryption key material for saved credentials. */
  keyMaterial: string;
  isAdmin(request: Request): Promise<boolean>;
  /** Applies the current configuration to the runtime (e.g. supervisor). */
  prepareControl(config: OpsConfig): void;
  /** Runs a monitoring cycle; resolves to a human-readable result. */
  refresh(): Promise<string | null>;
  lastMonitorMessage(): string | null;
  sampler?: TrafficSampler;
  fetcher?: typeof fetch;
  scrape?: (metricsAddr: string) => Promise<TunnelMetrics | null>;
}

const PAGE_PATHS = new Set<string>(OPS_PAGE_PATHS);

function htmlHeaders(nonce: string): Record<string, string> {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    // frame-ancestors is removed so the preview iframe can embed the page.
    "Content-Security-Policy": `default-src 'none'; style-src 'nonce-${nonce}'; img-src 'self' data:; form-action 'self'; base-uri 'none'; object-src 'none'; connect-src 'self';`,
  };
}

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function newNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function redirect(location: string, flash?: { kind: "success" | "error" | "info"; message: string }): Response {
  const url = new URL(location, "http://localhost");
  if (flash) url.searchParams.set(flash.kind === "success" ? "ok" : flash.kind, flash.message);
  return new Response(null, {
    status: 303,
    headers: { Location: `${url.pathname}${url.search}`, "Cache-Control": "no-store" },
  });
}

function readFlash(url: URL): { kind: "success" | "error" | "info"; message: string } | null {
  const ok = url.searchParams.get("ok");
  if (ok) return { kind: "success", message: ok };
  const error = url.searchParams.get("error");
  if (error) return { kind: "error", message: error };
  const info = url.searchParams.get("info");
  if (info) return { kind: "info", message: info };
  return null;
}

/**
 * Rejects cross-site form posts.
 *
 * `Sec-Fetch-Site` is the authoritative browser signal (a page cannot forge it),
 * and it is also correct behind a reverse proxy that rewrites the Host header.
 * Without it (non-browser clients) the Origin is compared against the Host the
 * server actually received.
 */
function crossOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite) return fetchSite !== "same-origin" && fetchSite !== "none";

  const origin = request.headers.get("Origin");
  if (!origin) return false;

  try {
    const originHost = new URL(origin).host;
    const receivedHosts = [request.headers.get("Host"), request.headers.get("X-Forwarded-Host")].filter(
      (value): value is string => Boolean(value)
    );
    if (receivedHosts.length > 0) return !receivedHosts.includes(originHost);
    return new URL(request.url).host !== originHost;
  } catch {
    return true;
  }
}

function formValue(form: FormData, key: string, maxLength = 500): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function formId(form: FormData): number {
  const raw = Number.parseInt(formValue(form, "id", 20), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

async function loadPageData(env: OpsEnv, deps: OpsHandlerDeps, options: { activityFilter: boolean; filters: any; windowHours: number }): Promise<OpsPageData> {
  const config = await resolveOpsConfig(env.DB, deps.keyMaterial, env as unknown as Record<string, string | undefined>);
  const runtimeDeps: OpsDeps = {
    control: deps.control,
    keyMaterial: deps.keyMaterial,
    fetcher: deps.fetcher,
    scrape: deps.scrape,
  };

  const snapshot: HealthSnapshot = await collectHealth(config, runtimeDeps);
  const control: ControlState = deps.control.state();

  const events = options.activityFilter
    ? await listEvents(env.DB, options.filters)
    : await listEvents(env.DB, { limit: 50 });
  const accessEvents = await listEvents(env.DB, { actionPrefix: "access_", limit: 30 });

  const [uptime24h, uptime7d, tunnels, eventActions, devices, traffic24h, traffic7d] = await Promise.all([
    uptimeSummary(env.DB, snapshot.tunnelName, 24),
    uptimeSummary(env.DB, snapshot.tunnelName, 168),
    listTunnels(env.DB),
    listEventActions(env.DB),
    listDevices(env.DB),
    trafficTotals(env.DB, snapshot.tunnelName, 24),
    trafficTotals(env.DB, snapshot.tunnelName, 168),
  ]);

  const traffic = await trafficSeries(env.DB, snapshot.tunnelName, options.windowHours);

  const [accessRules, alertRules, deliveries] = await Promise.all([
    listAccessRules(env.DB),
    listAlertRules(env.DB),
    listDeliveries(env.DB, 40),
  ]);

  return {
    config,
    snapshot,
    control,
    logs: deps.control.recentLog(),
    uptime24h,
    uptime7d,
    tunnels,
    events: options.activityFilter ? events : [...accessEvents, ...events].sort((a, b) => b.id - a.id),
    eventActions,
    devices,
    traffic,
    traffic24h,
    traffic7d,
    accessRules,
    alertRules,
    deliveries,
  };
}

function renderPage(path: string, data: OpsPageData, options: Parameters<typeof renderDashboard>[1]): { title: string; subtitle: string; body: string } {
  switch (path) {
    case "/settings":
      return renderSettings(data, options);
    case "/activity-logs":
      return renderActivityLogs(data, options);
    case "/tunnel-manager":
      return renderTunnelManager(data, options);
    case "/connected-devices":
      return renderConnectedDevices(data, options);
    case "/traffic-stats":
      return renderTrafficStats(data, options);
    case "/access-controls":
      return renderAccessControls(data, options);
    case "/notifications":
      return renderNotifications(data, options);
    default:
      return renderDashboard(data, options);
  }
}

function unauthorizedPage(path: string): Response {
  const nonce = newNonce();
  const html = opsLayout({
    title: "Sign in required",
    subtitle: "This action changes cloudflared configuration.",
    path,
    nonce,
    isAdmin: false,
    body: signInPrompt(path, "This action"),
  });
  return new Response(html, { status: 401, headers: htmlHeaders(nonce) });
}

function tunnelNameFor(config: OpsConfig): string {
  return config.tunnelName || config.tunnelId || "default";
}

export async function handleOpsRequest(
  request: Request,
  env: Env,
  deps: OpsHandlerDeps
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  const method = (request.method || "GET").toUpperCase();
  const opsEnv = env as unknown as OpsEnv;

  // -------------------------------------------------------------------------
  // Pages (read-only unless an admin session is present)
  // -------------------------------------------------------------------------
  if (PAGE_PATHS.has(path) && (method === "GET" || method === "HEAD")) {
    const isAdmin = await deps.isAdmin(request);
    const windowParam = Number.parseInt(url.searchParams.get("window") || "24", 10);
    const windowHours = [1, 24, 168].includes(windowParam) ? windowParam : 24;
    const filters = {
      level: url.searchParams.get("level") || "all",
      action: url.searchParams.get("action") || "",
      query: url.searchParams.get("q") || "",
      limit: Math.max(10, Math.min(Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100, 500)),
    };

    const data = await loadPageData(opsEnv, deps, {
      activityFilter: path === "/activity-logs",
      filters,
      windowHours,
    });
    const nonce = newNonce();
    const page = renderPage(path, data, {
      nonce,
      isAdmin,
      flash: readFlash(url),
      filters,
      windowHours,
      monitorMessage: deps.lastMonitorMessage(),
    });
    const html = opsLayout({ ...page, path, nonce, isAdmin, flash: readFlash(url) });
    const headers = htmlHeaders(nonce);
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(html, { status: 200, headers });
  }

  if (!path.startsWith("/api/ops/")) return null;

  // -------------------------------------------------------------------------
  // Admin-only JSON snapshot (used by tests and automation)
  // -------------------------------------------------------------------------
  if (path === "/api/ops/status" && (method === "GET" || method === "HEAD")) {
    if (!(await deps.isAdmin(request))) return json({ ok: false, error: "Unauthorized" }, 401);
    const data = await loadPageData(opsEnv, deps, { activityFilter: false, filters: {}, windowHours: 24 });
    return json({
      ok: true,
      tunnel: {
        name: data.snapshot.tunnelName,
        status: data.snapshot.status,
        source: data.snapshot.source,
        connections: data.snapshot.connections,
        checkedAt: data.snapshot.checkedAt,
        detail: data.snapshot.detail,
        error: (data.snapshot.error as ApiError | null) || null,
      },
      connector: {
        supported: data.control.supported,
        running: data.control.running,
        pid: data.control.pid,
        binAvailable: data.control.binAvailable,
      },
      uptime24h: data.uptime24h,
      traffic24h: data.traffic24h,
      activeAlerts: data.alertRules.filter((rule) => Number(rule.enabled) === 1).length,
      accessRules: data.accessRules.length,
      settings: {
        accountIdSet: Boolean(data.config.accountId),
        tunnelName: data.config.tunnelName,
        apiTokenSource: data.config.sources.apiToken,
        tunnelTokenSource: data.config.sources.tunnelToken,
      },
    });
  }

  if (method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  if (crossOriginRequest(request)) {
    return json({ ok: false, error: "Cross-origin request rejected" }, 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Expected form-encoded body" }, 400);
  }

  const wantsHtml = !(request.headers.get("Accept") || "").includes("application/json");
  const denied = async (): Promise<Response | null> => {
    if (await deps.isAdmin(request)) return null;
    await recordEvent(opsEnv.DB, {
      level: "warn",
      action: "ops_action_denied",
      actor: "anonymous",
      message: `Unauthorized ${method} ${path}`,
    }).catch(() => {});
    return wantsHtml ? unauthorizedPage("/dashboard") : json({ ok: false, error: "Unauthorized" }, 401);
  };

  try {
    // ---- Settings -------------------------------------------------------
    if (path === "/api/ops/settings") {
      const unauthorized = await denied();
      if (unauthorized) return unauthorized;

      const config = await resolveOpsConfig(opsEnv.DB, deps.keyMaterial, env as unknown as Record<string, string | undefined>);
      const updates: Record<string, string> = {};
      for (const key of SETTING_KEYS) {
        if (form.has(key)) updates[key] = formValue(form, key, 500);
      }

      const result = await saveSettings(opsEnv.DB, deps.keyMaterial, updates, "admin");
      deps.prepareControl(
        await resolveOpsConfig(opsEnv.DB, deps.keyMaterial, env as unknown as Record<string, string | undefined>)
      );
      const savedCount = result.saved.length;
      if (savedCount === 0 && result.skipped.length > 0) {
        return redirect("/settings", { kind: "info", message: "Nothing changed — credential fields were left blank." });
      }
      const nameNote = updates.tunnel_name && updates.tunnel_name !== config.tunnelName ? " Tunnel name updated." : "";
      return redirect("/settings", {
        kind: "success",
        message: `${savedCount} setting${savedCount === 1 ? "" : "s"} saved.${nameNote}`,
      });
    }

    if (path === "/api/ops/settings/clear") {
      const unauthorized = await denied();
      if (unauthorized) return unauthorized;
      const key = formValue(form, "key", 40) as SettingKey;
      if (!SETTING_KEYS.includes(key)) {
        return redirect("/settings", { kind: "error", message: "Unknown setting key." });
      }
      await clearSetting(opsEnv.DB, key, "admin");
      deps.prepareControl(await resolveOpsConfig(opsEnv.DB, deps.keyMaterial, env as unknown as Record<string, string | undefined>));
      return redirect("/settings", { kind: "success", message: `${key.replace(/_/g, " ")} cleared.` });
    }

    // ---- Tunnel control -------------------------------------------------
    if (path.startsWith("/api/ops/tunnels/")) {
      const unauthorized = await denied();
      if (unauthorized) return unauthorized;

      const action = path.slice("/api/ops/tunnels/".length);
      const config = await resolveOpsConfig(opsEnv.DB, deps.keyMaterial, env as unknown as Record<string, string | undefined>);
      deps.prepareControl(config);

      if (action === "check") {
        const message = await deps.refresh();
        return redirect("/tunnel-manager", { kind: "info", message: message || "Health check completed." });
      }

      if (!["start", "stop", "restart"].includes(action)) {
        return redirect("/tunnel-manager", { kind: "error", message: `Unknown tunnel action: ${action}` });
      }

      const result =
        action === "start"
          ? await deps.control.start()
          : action === "stop"
            ? await deps.control.stop()
            : await deps.control.restart();

      await recordEvent(opsEnv.DB, {
        level: result.ok ? "info" : "error",
        action: `tunnel_${action}`,
        actor: "admin",
        message: result.message,
      });

      if (!result.ok) {
        return redirect("/tunnel-manager", { kind: "error", message: result.message });
      }

      const monitor = await deps.refresh();
      return redirect("/tunnel-manager", {
        kind: "success",
        message: [result.message, monitor].filter(Boolean).join(" "),
      });
    }

    // ---- Access rules ---------------------------------------------------
    if (path === "/api/ops/access/rules") {
      const unauthorized = await denied();
      if (unauthorized) return unauthorized;

      const name = formValue(form, "name", 100);
      const pathPrefix = formValue(form, "path_prefix", 200) || "/";
      const matchKind = formValue(form, "match_kind", 20);
      const matchValue = formValue(form, "match_value", 200);
      const action = formValue(form, "action", 10);

      if (!name || !matchValue) {
        return redirect("/access-controls", { kind: "error", message: "Rule name and match value are required." });
      }
      if (!["ip", "email", "path"].includes(matchKind)) {
        return redirect("/access-controls", { kind: "error", message: "Match type must be ip, email or path." });
      }
      if (!["allow", "deny"].includes(action)) {
        return redirect("/access-controls", { kind: "error", message: "Effect must be allow or deny." });
      }
      if (!pathPrefix.startsWith("/")) {
        return redirect("/access-controls", { kind: "error", message: "Path scope must start with /." });
      }

      await createAccessRule(
        opsEnv.DB,
        { name, pathPrefix, matchKind: matchKind as "ip" | "email" | "path", matchValue, action: action as "allow" | "deny" },
        "admin"
      );
      return redirect("/access-controls", { kind: "success", message: `Rule "${name}" created.` });
    }

    if (path === "/api/ops/access/rules/toggle" || path === "/api/ops/access/rules/delete") {
      const unauthorized = await denied();
      if (unauthorized) return unauthorized;
      const id = formId(form);
      if (!id) return redirect("/access-controls", { kind: "error", message: "Missing rule id." });

      if (path.endsWith("/toggle")) {
        const enabled = formValue(form, "enabled", 5) === "1";
        const changed = await setAccessRuleEnabled(opsEnv.DB, id, enabled, "admin");
        return redirect("/access-controls", {
          kind: changed ? "success" : "error",
          message: changed ? `Rule #${id} ${enabled ? "enabled" : "disabled"}.` : `Rule #${id} was not found.`,
        });
      }

      const deleted = await deleteAccessRule(opsEnv.DB, id, "admin");
      return redirect("/access-controls", {
        kind: deleted ? "success" : "error",
        message: deleted ? `Rule #${id} deleted.` : `Rule #${id} was not found.`,
      });
    }

    // ---- Alerts ---------------------------------------------------------
    if (path === "/api/ops/alerts/rules") {
      const unauthorized = await denied();
      if (unauthorized) return unauthorized;

      const name = formValue(form, "name", 100);
      const event = formValue(form, "event", 30);
      const channel = formValue(form, "channel", 20);
      const target = formValue(form, "target", 300);

      if (!name) return redirect("/notifications", { kind: "error", message: "Rule name is required." });
      if (!["tunnel_down", "tunnel_up", "status_change"].includes(event)) {
        return redirect("/notifications", { kind: "error", message: "Choose a valid event." });
      }
      if (!["webhook", "telegram"].includes(channel)) {
        return redirect("/notifications", { kind: "error", message: "Choose webhook or telegram." });
      }
      if (channel === "webhook") {
        if (!target) return redirect("/notifications", { kind: "error", message: "A webhook URL is required for webhook alerts." });
        try {
          const parsed = new URL(target);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("bad protocol");
        } catch {
          return redirect("/notifications", { kind: "error", message: "Webhook target must be a valid http(s) URL." });
        }
      }

      await createAlertRule(
        opsEnv.DB,
        { name, event: event as "tunnel_down" | "tunnel_up" | "status_change", channel: channel as "webhook" | "telegram", target },
        "admin"
      );
      return redirect("/notifications", { kind: "success", message: `Alert "${name}" created.` });
    }

    if (path === "/api/ops/alerts/rules/toggle" || path === "/api/ops/alerts/rules/delete") {
      const unauthorized = await denied();
      if (unauthorized) return unauthorized;
      const id = formId(form);
      if (!id) return redirect("/notifications", { kind: "error", message: "Missing rule id." });

      if (path.endsWith("/toggle")) {
        const enabled = formValue(form, "enabled", 5) === "1";
        const changed = await setAlertRuleEnabled(opsEnv.DB, id, enabled, "admin");
        return redirect("/notifications", {
          kind: changed ? "success" : "error",
          message: changed ? `Alert #${id} ${enabled ? "enabled" : "disabled"}.` : `Alert #${id} was not found.`,
        });
      }

      const deleted = await deleteAlertRule(opsEnv.DB, id, "admin");
      return redirect("/notifications", {
        kind: deleted ? "success" : "error",
        message: deleted ? `Alert #${id} deleted.` : `Alert #${id} was not found.`,
      });
    }

    if (path === "/api/ops/alerts/test") {
      const unauthorized = await denied();
      if (unauthorized) return unauthorized;
      const id = formId(form);
      const rules = await listAlertRules(opsEnv.DB);
      const rule = rules.find((item) => item.id === id);
      if (!rule) return redirect("/notifications", { kind: "error", message: `Alert #${id} was not found.` });

      const config = await resolveOpsConfig(opsEnv.DB, deps.keyMaterial, env as unknown as Record<string, string | undefined>);
      const result = await sendTestAlert(
        opsEnv,
        { control: deps.control, keyMaterial: deps.keyMaterial, fetcher: deps.fetcher, scrape: deps.scrape },
        rule,
        tunnelNameFor(config)
      );
      return redirect("/notifications", {
        kind: result.status === "sent" ? "success" : "error",
        message: `Test notification ${result.status}: ${result.detail}`,
      });
    }

    return json({ ok: false, error: "Not found" }, 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Ops] request failed", err);
    await recordEvent(opsEnv.DB, {
      level: "error",
      action: "ops_request_failed",
      actor: "system",
      message: `${method} ${path} failed: ${message}`,
    }).catch(() => {});
    if (wantsHtml) {
      const back = path.startsWith("/api/ops/alerts") ? "/notifications" : path.startsWith("/api/ops/access") ? "/access-controls" : path.startsWith("/api/ops/tunnels") ? "/tunnel-manager" : "/settings";
      return redirect(back, { kind: "error", message });
    }
    return json({ ok: false, error: message }, 500);
  }
}
