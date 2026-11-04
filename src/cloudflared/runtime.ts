/**
 * Cloudflared health collection, traffic sampling and alert delivery.
 *
 * Every value written to the operations pages comes from one of:
 *  - the Cloudflare API (live tunnel + connector state),
 *  - the local cloudflared connector (process state, Prometheus metrics),
 *  - this app's own recorded checks and activity.
 * When none of those can answer, the result is reported as unavailable with
 * an actionable reason instead of a made-up value.
 */

import type { D1Database } from "../types";
import { fetchTunnelHealth, type ApiError } from "./cloudflareApi";
import {
  ensureTunnel,
  latestStatusCheck,
  recordDelivery,
  recordEvent,
  recordTrafficSample,
  reconcileDevices,
  setTunnelStatus,
  listAlertRules,
  type AlertEvent,
  type AlertRule,
  type OpsConfig,
  type TunnelStatus,
} from "./store";
import type { ControlState, TunnelControl, TunnelMetrics } from "./supervisor";

export interface OpsEnv {
  DB: D1Database;
  SECURITY_CODE_PEPPER?: string;
  BOT_TOKEN?: string;
  ADMIN_CHANNEL_ID?: string;
  ADMIN_IDS?: string;
  ADMIN_API_SECRET?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARED_TUNNEL_TOKEN?: string;
  CLOUDFLARED_TUNNEL_NAME?: string;
  CLOUDFLARED_METRICS_ADDR?: string;
  CLOUDFLARED_ORIGIN_SERVICE?: string;
  CLOUDFLARED_BIN?: string;
}

export interface OpsDeps {
  control: TunnelControl;
  /** Encryption key material for saved credentials. */
  keyMaterial: string;
  fetcher?: typeof fetch;
  scrape?: (metricsAddr: string) => Promise<TunnelMetrics | null>;
}

export interface HealthSnapshot {
  checkedAt: string;
  tunnelName: string;
  tunnelId: string | null;
  configured: boolean;
  status: TunnelStatus;
  detail: string;
  source: "cloudflare-api" | "local-connector" | "none";
  connections: number;
  error: ApiError | null;
  control: ControlState;
}

function defaultTunnelName(config: OpsConfig): string {
  return config.tunnelName || config.tunnelId || "default";
}

/** Collects the current tunnel state from whichever source is configured. */
export async function collectHealth(
  config: OpsConfig,
  deps: OpsDeps
): Promise<HealthSnapshot> {
  const checkedAt = new Date().toISOString();
  const tunnelName = defaultTunnelName(config);
  const control = deps.control.state();
  const apiConfigured = Boolean(config.accountId && config.apiToken);

  if (apiConfigured) {
    const health = await fetchTunnelHealth(config, deps.fetcher || fetch);
    if (health.ok && health.data) {
      return {
        checkedAt,
        tunnelName: health.data.name || tunnelName,
        tunnelId: health.data.tunnelId,
        configured: true,
        status: health.data.status,
        detail: health.data.detail,
        source: "cloudflare-api",
        connections: health.data.connections.length,
        error: null,
        control,
      };
    }
    // API configured but unusable: report the real error, and fall back to the
    // local connector only for the process state, never as a health claim.
    const localRunning = control.running;
    return {
      checkedAt,
      tunnelName,
      tunnelId: config.tunnelId || null,
      configured: true,
      status: "unknown",
      detail: localRunning
        ? `Cloudflare API unavailable (${health.error?.message || "unknown error"}); local connector is running but health cannot be confirmed.`
        : health.error?.message || "Cloudflare API unavailable.",
      source: "none",
      connections: 0,
      error: health.error || null,
      control,
    };
  }

  if (control.running) {
    let connections = 0;
    let metricsOk = false;
    if (deps.scrape) {
      const metrics = await deps.scrape(config.metricsAddr);
      if (metrics) {
        metricsOk = true;
        connections = metrics.haConnections ?? 0;
      }
    }
    return {
      checkedAt,
      tunnelName,
      tunnelId: config.tunnelId || null,
      configured: true,
      status: metricsOk && connections > 0 ? "up" : "degraded",
      detail: metricsOk
        ? `Local connector running; ${connections} HA connection${connections === 1 ? "" : "s"} reported by cloudflared metrics.`
        : "Local connector process is running, but the metrics endpoint is unreachable so connectivity cannot be confirmed.",
      source: "local-connector",
      connections,
      error: metricsOk
        ? null
        : {
            code: "metrics_unreachable",
            message: `cloudflared metrics endpoint ${config.metricsAddr} is not reachable.`,
            hint: "Pass --metrics to the connector or update the metrics address on the settings page.",
          },
      control,
    };
  }

  return {
    checkedAt,
    tunnelName,
    tunnelId: config.tunnelId || null,
    configured: apiConfigured || Boolean(config.tunnelToken),
    status: "unknown",
    detail: config.tunnelToken
      ? "Tunnel token saved but the connector is not running, and no Cloudflare API token is configured to report health."
      : "No tunnel credentials configured yet. Add a Cloudflare API token or tunnel token on the Service Settings page.",
    source: "none",
    connections: 0,
    error: null,
    control,
  };
}

/** Persists a snapshot and emits an event plus alerts when status changes. */
export async function persistHealth(
  env: OpsEnv,
  config: OpsConfig,
  snapshot: HealthSnapshot,
  deps: OpsDeps
): Promise<{ previous: TunnelStatus | null; changed: boolean }> {
  const db = env.DB;
  const tunnelName = snapshot.tunnelName;

  await ensureTunnel(db, {
    name: tunnelName,
    tunnelId: snapshot.tunnelId,
    hostname: config.hostname,
    serviceUrl: config.originService,
  });

  const previousCheck = await latestStatusCheck(db, tunnelName);
  const previous = previousCheck?.status || null;

  await db
    .prepare(
      `INSERT INTO cloudflared_status_checks (created_at, tunnel_name, status, detail, connections)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(snapshot.checkedAt, tunnelName, snapshot.status, snapshot.detail.slice(0, 500), snapshot.connections)
    .run();
  await setTunnelStatus(db, tunnelName, snapshot.status, snapshot.tunnelId);

  const changed = previous !== snapshot.status;
  if (changed) {
    const level = snapshot.status === "down" ? "error" : snapshot.status === "degraded" ? "warn" : "info";
    await recordEvent(db, {
      level,
      action: "tunnel_status_changed",
      actor: "monitor",
      message: `Tunnel "${tunnelName}" ${previous ? `changed from ${previous}` : "reported"} ${snapshot.status}: ${snapshot.detail}`,
      metadata: { source: snapshot.source, connections: snapshot.connections },
    });

    const event: AlertEvent =
      snapshot.status === "down" ? "tunnel_down" : snapshot.status === "up" ? "tunnel_up" : "status_change";
    await dispatchAlerts(env, deps, {
      event,
      tunnelName,
      status: snapshot.status,
      detail: snapshot.detail,
    });
  }

  return { previous, changed };
}

// ---------------------------------------------------------------------------
// Traffic sampling
// ---------------------------------------------------------------------------

export class TrafficSampler {
  private last: TunnelMetrics | null = null;

  reset(): void {
    this.last = null;
  }

  /** Converts cumulative cloudflared counters into per-interval deltas. */
  delta(current: TunnelMetrics): { bytesIn: number; bytesOut: number; requests: number; errors: number } {
    const previous = this.last;
    this.last = current;
    if (!previous) {
      return { bytesIn: 0, bytesOut: 0, requests: 0, errors: 0 };
    }
    const diff = (now: number | null, before: number | null): number => {
      if (now === null || before === null) return 0;
      return now >= before ? now - before : now; // counter reset after a connector restart
    };
    return {
      bytesIn: diff(current.bytesIn, previous.bytesIn),
      bytesOut: diff(current.bytesOut, previous.bytesOut),
      requests: diff(current.requests, previous.requests),
      errors: diff(current.errors, previous.errors),
    };
  }
}

export async function sampleTraffic(
  env: OpsEnv,
  config: OpsConfig,
  sampler: TrafficSampler,
  deps: OpsDeps
): Promise<{ ok: boolean; message: string }> {
  if (!deps.control.state().running) {
    return { ok: false, message: "Traffic metrics are only available while the local connector is running." };
  }
  if (!deps.scrape) {
    return { ok: false, message: "Metrics collection is not available in this runtime." };
  }
  const metrics = await deps.scrape(config.metricsAddr);
  if (!metrics) {
    sampler.reset();
    return {
      ok: false,
      message: `No metrics endpoint answered at ${config.metricsAddr}. Start the connector with --metrics to collect traffic.`,
    };
  }
  const delta = sampler.delta(metrics);
  await recordTrafficSample(env.DB, {
    tunnelName: defaultTunnelName(config),
    bytesIn: delta.bytesIn,
    bytesOut: delta.bytesOut,
    requests: delta.requests,
    errors: delta.errors,
  });
  return { ok: true, message: "Traffic sample recorded." };
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

interface AlertInput {
  event: AlertEvent;
  tunnelName: string;
  status: TunnelStatus;
  detail: string;
}

function alertMessage(input: AlertInput): string {
  const label =
    input.event === "tunnel_down"
      ? "Tunnel down"
      : input.event === "tunnel_up"
        ? "Tunnel recovered"
        : "Tunnel status changed";
  return `${label}: ${input.tunnelName} is ${input.status}. ${input.detail}`;
}

async function deliverRule(
  env: OpsEnv,
  deps: OpsDeps,
  rule: AlertRule,
  message: string,
  input: AlertInput
): Promise<{ status: "sent" | "failed" | "skipped"; detail: string }> {
  const fetcher = deps.fetcher || fetch;

  if (rule.channel === "webhook") {
    const target = (rule.target || "").trim();
    if (!target) return { status: "failed", detail: "No webhook URL configured for this rule." };
    let url: URL;
    try {
      url = new URL(target);
    } catch {
      return { status: "failed", detail: "Webhook target is not a valid URL." };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { status: "failed", detail: "Webhook target must be an http(s) URL." };
    }
    try {
      const response = await fetcher(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: input.event,
          tunnel: input.tunnelName,
          status: input.status,
          detail: input.detail,
          message,
          at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(6000),
      });
      return response.ok
        ? { status: "sent", detail: `Webhook responded ${response.status}` }
        : { status: "failed", detail: `Webhook responded ${response.status}` };
    } catch (err) {
      return { status: "failed", detail: `Webhook delivery failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  const token = (env.BOT_TOKEN || "").trim();
  const chatId = (rule.target || env.ADMIN_CHANNEL_ID || (env.ADMIN_IDS || "").split(",")[0] || "").trim();
  if (!token) {
    return { status: "failed", detail: "Telegram alerts need BOT_TOKEN to be configured." };
  }
  if (!chatId) {
    return { status: "failed", detail: "No Telegram chat configured for this rule (set a chat ID or ADMIN_CHANNEL_ID)." };
  }
  try {
    const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(6000),
    });
    const body: any = await response.json().catch(() => null);
    return response.ok && body?.ok
      ? { status: "sent", detail: `Telegram message delivered to ${chatId}` }
      : { status: "failed", detail: `Telegram responded ${response.status}: ${body?.description || "no detail"}` };
  } catch (err) {
    return { status: "failed", detail: `Telegram delivery failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Delivers a status event to every enabled alert rule subscribed to it. */
export async function dispatchAlerts(
  env: OpsEnv,
  deps: OpsDeps,
  input: AlertInput
): Promise<{ delivered: number; failed: number }> {
  const rules = (await listAlertRules(env.DB)).filter(
    (rule) => Number(rule.enabled) === 1 && (rule.event === input.event || rule.event === "status_change")
  );

  let delivered = 0;
  let failed = 0;
  const message = alertMessage(input);

  for (const rule of rules) {
    const result = await deliverRule(env, deps, rule, message, input);
    if (result.status === "sent") delivered += 1;
    else failed += 1;
    await recordDelivery(env.DB, {
      ruleId: rule.id,
      event: input.event,
      tunnelName: input.tunnelName,
      channel: rule.channel,
      status: result.status,
      detail: result.detail,
    });
  }

  if (rules.length > 0) {
    await recordEvent(env.DB, {
      level: failed > 0 ? "warn" : "info",
      action: "alert_dispatch",
      actor: "monitor",
      message: `${input.event} for "${input.tunnelName}": ${delivered} delivered, ${failed} failed`,
    });
  }

  return { delivered, failed };
}

/** Sends one rule immediately, for the "Send test" control. */
export async function sendTestAlert(
  env: OpsEnv,
  deps: OpsDeps,
  rule: AlertRule,
  tunnelName: string
): Promise<{ status: string; detail: string }> {
  const input: AlertInput = {
    event: rule.event,
    tunnelName,
    status: "unknown",
    detail: "This is a test notification triggered from the Notification Alerts page.",
  };
  const result = await deliverRule(env, deps, rule, alertMessage(input), input);
  await recordDelivery(env.DB, {
    ruleId: rule.id,
    event: rule.event,
    tunnelName,
    channel: rule.channel,
    status: result.status,
    detail: `Test: ${result.detail}`,
  });
  await recordEvent(env.DB, {
    level: result.status === "sent" ? "info" : "warn",
    action: "alert_test",
    actor: "admin",
    message: `Test notification via ${rule.channel}: ${result.status} - ${result.detail}`,
  });
  return result;
}

/** Runs one full monitoring cycle: health, devices, traffic, alerts. */
export async function runMonitorCycle(
  env: OpsEnv,
  config: OpsConfig,
  deps: OpsDeps,
  sampler: TrafficSampler
): Promise<HealthSnapshot> {
  const snapshot = await collectHealth(config, deps);

  if (snapshot.source === "cloudflare-api" && config.accountId && config.apiToken) {
    const health = await fetchTunnelHealth(config, deps.fetcher || fetch);
    if (health.ok && health.data) {
      await reconcileDevices(
        env.DB,
        health.data.name || snapshot.tunnelName,
        health.data.connections.map((connection) => ({
          deviceKey: connection.clientId || connection.id,
          label: `connector-${(connection.clientId || connection.id).slice(0, 8)}`,
          originIp: connection.originIp,
          clientVersion: connection.clientVersion,
          colo: connection.colo,
        }))
      );
    }
  }

  await persistHealth(env, config, snapshot, deps);

  if (deps.control.state().running) {
    await sampleTraffic(env, config, sampler, deps).catch(() => ({ ok: false, message: "" }));
  }

  return snapshot;
}

export { recordEvent };
