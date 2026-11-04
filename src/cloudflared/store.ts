import type { D1Database } from "../types";
import { isSealedSecret, openSecret, sealSecret, secretHint } from "./secrets";

/** Configuration keys accepted by the settings page. */
export const SETTING_KEYS = [
  "account_id",
  "tunnel_name",
  "tunnel_id",
  "hostname",
  "origin_service",
  "metrics_addr",
  "cloudflared_bin",
  "api_token",
  "tunnel_token",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export const SECRET_SETTING_KEYS: ReadonlySet<SettingKey> = new Set<SettingKey>(["api_token", "tunnel_token"]);

export const SETTING_DEFAULTS: Record<SettingKey, string> = {
  account_id: "",
  tunnel_name: "",
  tunnel_id: "",
  hostname: "",
  origin_service: "http://127.0.0.1:3000",
  metrics_addr: "127.0.0.1:20241",
  cloudflared_bin: "cloudflared",
  api_token: "",
  tunnel_token: "",
};

export interface OpsConfig {
  accountId: string;
  tunnelName: string;
  tunnelId: string;
  hostname: string;
  originService: string;
  metricsAddr: string;
  cloudflaredBin: string;
  apiToken: string;
  tunnelToken: string;
  /** Where each credential came from, for display only. */
  sources: { apiToken: "saved" | "environment" | "missing"; tunnelToken: "saved" | "environment" | "missing" };
  /** True when a stored credential could not be decrypted. */
  decryptError: string | null;
}

export interface StoredSetting {
  key: string;
  value: string;
  isSecret: boolean;
  updatedAt: string;
  hint?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function rows<T>(result: { results: T[] } | undefined): T[] {
  return result?.results || [];
}

export async function listStoredSettings(db: D1Database): Promise<StoredSetting[]> {
  const result = await db
    .prepare("SELECT key, value, is_secret, updated_at FROM cloudflared_settings ORDER BY key")
    .all<{ key: string; value: string; is_secret: number; updated_at: string }>();
  return rows(result).map((row) => {
    const isSecret = Number(row.is_secret) === 1;
    return {
      key: row.key,
      value: isSecret ? "" : row.value || "",
      isSecret,
      updatedAt: row.updated_at,
      hint: isSecret ? secretHint(row.value || "") : undefined,
    };
  });
}

/**
 * Resolves the effective cloudflared configuration.
 * A value saved from the settings page wins; the platform environment is the
 * fallback so an operator can also supply credentials through secrets.
 */
export async function resolveOpsConfig(
  db: D1Database,
  keyMaterial: string,
  env: Record<string, string | undefined> = {}
): Promise<OpsConfig> {
  const stored = await listStoredSettings(db);
  const byKey = new Map(stored.map((item) => [item.key, item]));
  const decryptErrorRef: { message: string | null } = { message: null };

  const readPlain = (key: SettingKey, envValue?: string): string => {
    const item = byKey.get(key);
    if (item && !item.isSecret && item.value) return item.value;
    return (envValue || "").trim();
  };

  const readSecret = async (key: SettingKey, envValue?: string): Promise<string> => {
    const item = byKey.get(key);
    if (item) {
      const raw = await db
        .prepare("SELECT value FROM cloudflared_settings WHERE key = ?")
        .bind(key)
        .first<{ value: string }>();
      const value = raw?.value || "";
      if (value) {
        if (!isSealedSecret(value)) {
          decryptErrorRef.message = `Stored ${key.replace("_", " ")} is not encrypted; re-save it from the settings page.`;
          return "";
        }
        try {
          return await openSecret(value, keyMaterial);
        } catch {
          decryptErrorRef.message = `Stored ${key.replace("_", " ")} could not be decrypted. Re-save it from the settings page.`;
          return "";
        }
      }
    }
    return (envValue || "").trim();
  };

  const apiToken = await readSecret("api_token", env.CLOUDFLARE_API_TOKEN);
  const tunnelToken = await readSecret("tunnel_token", env.CLOUDFLARED_TUNNEL_TOKEN);

  return {
    accountId: readPlain("account_id", env.CLOUDFLARE_ACCOUNT_ID),
    tunnelName: readPlain("tunnel_name", env.CLOUDFLARED_TUNNEL_NAME),
    tunnelId: readPlain("tunnel_id"),
    hostname: readPlain("hostname"),
    originService: readPlain("origin_service", env.CLOUDFLARED_ORIGIN_SERVICE) || SETTING_DEFAULTS.origin_service,
    metricsAddr: readPlain("metrics_addr", env.CLOUDFLARED_METRICS_ADDR) || SETTING_DEFAULTS.metrics_addr,
    cloudflaredBin: readPlain("cloudflared_bin", env.CLOUDFLARED_BIN) || SETTING_DEFAULTS.cloudflared_bin,
    apiToken,
    tunnelToken,
    sources: {
      apiToken: apiToken ? (byKey.get("api_token") ? "saved" : "environment") : "missing",
      tunnelToken: tunnelToken ? (byKey.get("tunnel_token") ? "saved" : "environment") : "missing",
    },
    decryptError: decryptErrorRef.message,
  };
}

export interface SaveSettingsResult {
  saved: SettingKey[];
  skipped: SettingKey[];
}

/**
 * Persists settings. Credential values are sealed before they touch the
 * database. An empty credential field means "keep what is stored".
 */
export async function saveSettings(
  db: D1Database,
  keyMaterial: string,
  updates: Record<string, string>,
  actor: string
): Promise<SaveSettingsResult> {
  const saved: SettingKey[] = [];
  const skipped: SettingKey[] = [];

  for (const key of SETTING_KEYS) {
    if (!(key in updates)) continue;
    const rawValue = (updates[key] ?? "").trim();
    const isSecret = SECRET_SETTING_KEYS.has(key);

    if (isSecret && !rawValue) {
      skipped.push(key);
      continue;
    }
    if (!isSecret && rawValue.length > 500) {
      throw new Error(`${key.replace(/_/g, " ")} is too long (max 500 characters)`);
    }

    const value = isSecret ? await sealSecret(rawValue, keyMaterial) : rawValue.slice(0, 500);
    await db
      .prepare(
        `INSERT INTO cloudflared_settings (key, value, is_secret, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_secret = excluded.is_secret, updated_at = excluded.updated_at`
      )
      .bind(key, value, isSecret ? 1 : 0, nowIso())
      .run();
    saved.push(key);
  }

  if (saved.length > 0) {
    await recordEvent(db, {
      level: "info",
      action: "settings_saved",
      actor,
      message: `Updated cloudflared settings: ${saved.map((k) => (SECRET_SETTING_KEYS.has(k) ? `${k} (credential)` : k)).join(", ")}`,
    });
  }

  return { saved, skipped };
}

/** Clears one stored setting (used by "Forget credential"). */
export async function clearSetting(db: D1Database, key: SettingKey, actor: string): Promise<void> {
  await db.prepare("DELETE FROM cloudflared_settings WHERE key = ?").bind(key).run();
  await recordEvent(db, {
    level: "warn",
    action: "settings_cleared",
    actor,
    message: `Cleared ${SECRET_SETTING_KEYS.has(key) ? `${key} credential` : key}`,
  });
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export type EventLevel = "info" | "warn" | "error";

export interface OpsEvent {
  id: number;
  created_at: string;
  level: EventLevel;
  action: string;
  actor: string;
  message: string;
  metadata: string | null;
}

export interface EventInput {
  level?: EventLevel;
  action: string;
  actor?: string;
  message: string;
  metadata?: unknown;
}

export async function recordEvent(db: D1Database, input: EventInput): Promise<void> {
  const level: EventLevel = input.level === "error" || input.level === "warn" ? input.level : "info";
  let metadata: string | null = null;
  if (input.metadata !== undefined) {
    try {
      metadata = JSON.stringify(input.metadata).slice(0, 2000);
    } catch {
      metadata = null;
    }
  }
  await db
    .prepare(
      `INSERT INTO cloudflared_activity (created_at, level, action, actor, message, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(nowIso(), level, input.action.slice(0, 100), (input.actor || "system").slice(0, 100), input.message.slice(0, 1000), metadata)
    .run();
}

export interface EventFilter {
  level?: EventLevel | "all";
  action?: string;
  /** Matches actions starting with this value (e.g. "access_"). */
  actionPrefix?: string;
  query?: string;
  limit?: number;
}

export async function listEvents(db: D1Database, filter: EventFilter = {}): Promise<OpsEvent[]> {
  const limit = Math.max(1, Math.min(filter.limit || 100, 500));
  const clauses: string[] = [];
  const binds: unknown[] = [];

  if (filter.level && filter.level !== "all") {
    clauses.push("level = ?");
    binds.push(filter.level);
  }
  if (filter.action) {
    clauses.push("action = ?");
    binds.push(filter.action);
  }
  if (filter.actionPrefix) {
    clauses.push("action LIKE ?");
    binds.push(`${filter.actionPrefix}%`);
  }
  if (filter.query) {
    clauses.push("(message LIKE ? OR action LIKE ?)");
    binds.push(`%${filter.query}%`, `%${filter.query}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await db
    .prepare(`SELECT id, created_at, level, action, actor, message, metadata FROM cloudflared_activity ${where} ORDER BY id DESC LIMIT ?`)
    .bind(...binds, limit)
    .all<OpsEvent>();
  return rows(result);
}

export async function listEventActions(db: D1Database, limit = 1000): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT action, COUNT(*) AS count FROM cloudflared_activity
       GROUP BY action ORDER BY count DESC LIMIT ?`
    )
    .bind(limit)
    .all<{ action: string }>();
  return rows(result)
    .map((row) => row.action)
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Tunnels and health
// ---------------------------------------------------------------------------

export type TunnelStatus = "up" | "degraded" | "down" | "unknown";

export interface TunnelRecord {
  id: number;
  name: string;
  tunnelId: string | null;
  hostname: string | null;
  serviceUrl: string | null;
  enabled: number;
  lastStatus: TunnelStatus | null;
  lastCheckedAt: string | null;
}

export async function listTunnels(db: D1Database): Promise<TunnelRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, name, tunnel_id, hostname, service_url, enabled, last_status, last_checked_at
       FROM cloudflared_tunnels ORDER BY name ASC`
    )
    .all<{ id: number; name: string; tunnel_id: string | null; hostname: string | null; service_url: string | null; enabled: number; last_status: string | null; last_checked_at: string | null }>();
  return rows(result).map((row) => ({
    id: row.id,
    name: row.name,
    tunnelId: row.tunnel_id,
    hostname: row.hostname,
    serviceUrl: row.service_url,
    enabled: Number(row.enabled),
    lastStatus: (row.last_status as TunnelStatus) || null,
    lastCheckedAt: row.last_checked_at,
  }));
}

export async function ensureTunnel(
  db: D1Database,
  input: { name: string; tunnelId?: string | null; hostname?: string | null; serviceUrl?: string | null }
): Promise<void> {
  const name = input.name.trim();
  if (!name) return;
  await db
    .prepare(
      `INSERT INTO cloudflared_tunnels (name, tunnel_id, hostname, service_url, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         tunnel_id = COALESCE(excluded.tunnel_id, cloudflared_tunnels.tunnel_id),
         hostname = COALESCE(excluded.hostname, cloudflared_tunnels.hostname),
         service_url = COALESCE(excluded.service_url, cloudflared_tunnels.service_url),
         updated_at = excluded.updated_at`
    )
    .bind(name, input.tunnelId || null, input.hostname || null, input.serviceUrl || null, nowIso())
    .run();
}

export async function setTunnelStatus(
  db: D1Database,
  name: string,
  status: TunnelStatus,
  tunnelId?: string | null
): Promise<void> {
  await db
    .prepare(
      `UPDATE cloudflared_tunnels
       SET last_status = ?, last_checked_at = ?, tunnel_id = COALESCE(?, tunnel_id), updated_at = ?
       WHERE name = ?`
    )
    .bind(status, nowIso(), tunnelId || null, nowIso(), name)
    .run();
}

export interface StatusCheck {
  id: number;
  created_at: string;
  tunnel_name: string;
  status: TunnelStatus;
  detail: string | null;
  connections: number;
}

export async function latestStatusCheck(db: D1Database, tunnelName: string): Promise<StatusCheck | null> {
  return db
    .prepare(
      `SELECT id, created_at, tunnel_name, status, detail, connections
       FROM cloudflared_status_checks WHERE tunnel_name = ?
       ORDER BY id DESC LIMIT 1`
    )
    .bind(tunnelName)
    .first<StatusCheck>();
}

export async function statusHistory(db: D1Database, tunnelName: string, limit = 20): Promise<StatusCheck[]> {
  const result = await db
    .prepare(
      `SELECT id, created_at, tunnel_name, status, detail, connections
       FROM cloudflared_status_checks WHERE tunnel_name = ?
       ORDER BY id DESC LIMIT ?`
    )
    .bind(tunnelName, Math.max(1, Math.min(limit, 200)))
    .all<StatusCheck>();
  return rows(result);
}

export interface UptimeSummary {
  windowHours: number;
  checks: number;
  upChecks: number;
  downChecks: number;
  percent: number | null;
  since: string | null;
  lastChangeAt: string | null;
  lastChangeTo: TunnelStatus | null;
}

/** Uptime is derived from recorded health checks; it is never estimated. */
export async function uptimeSummary(
  db: D1Database,
  tunnelName: string,
  windowHours = 24
): Promise<UptimeSummary> {
  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
  const result = await db
    .prepare(
      `SELECT status, COUNT(*) AS count FROM cloudflared_status_checks
       WHERE tunnel_name = ? AND created_at >= ? GROUP BY status`
    )
    .bind(tunnelName, since)
    .all<{ status: string; count: number }>();

  const counts = new Map(rows(result).map((row) => [row.status, Number(row.count)]));
  const upChecks = (counts.get("up") || 0) + (counts.get("degraded") || 0);
  const downChecks = counts.get("down") || 0;
  // "unknown" checks mean no health source could answer; they must not be
  // counted as either uptime or downtime.
  const checks = upChecks + downChecks;

  const first = await db
    .prepare(
      `SELECT created_at FROM cloudflared_status_checks WHERE tunnel_name = ?
       ORDER BY id ASC LIMIT 1`
    )
    .bind(tunnelName)
    .first<{ created_at: string }>();

  const change = await db
    .prepare(
      `SELECT a.status AS new_status, a.created_at AS created_at
       FROM cloudflared_status_checks a
       JOIN cloudflared_status_checks b ON b.id = (
         SELECT MAX(id) FROM cloudflared_status_checks
         WHERE tunnel_name = a.tunnel_name AND id < a.id
       )
       WHERE a.tunnel_name = ? AND a.status <> b.status
       ORDER BY a.id DESC LIMIT 1`
    )
    .bind(tunnelName)
    .first<{ new_status: TunnelStatus; created_at: string }>();

  return {
    windowHours,
    checks,
    upChecks,
    downChecks,
    percent: checks > 0 ? Math.round((upChecks / checks) * 1000) / 10 : null,
    since: first?.created_at || null,
    lastChangeAt: change?.created_at || null,
    lastChangeTo: change?.new_status || null,
  };
}

export interface TrafficSample {
  id: number;
  sampled_at: string;
  bytes_in: number;
  bytes_out: number;
  requests: number;
  errors: number;
}

export async function recordTrafficSample(
  db: D1Database,
  sample: { tunnelName: string; bytesIn: number; bytesOut: number; requests: number; errors: number }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO cloudflared_traffic_samples (sampled_at, tunnel_name, bytes_in, bytes_out, requests, errors)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      nowIso(),
      sample.tunnelName,
      Math.max(0, Math.round(sample.bytesIn)),
      Math.max(0, Math.round(sample.bytesOut)),
      Math.max(0, Math.round(sample.requests)),
      Math.max(0, Math.round(sample.errors))
    )
    .run();
}

export async function trafficSeries(
  db: D1Database,
  tunnelName: string,
  windowHours = 24
): Promise<TrafficSample[]> {
  const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
  const result = await db
    .prepare(
      `SELECT id, sampled_at, bytes_in, bytes_out, requests, errors
       FROM cloudflared_traffic_samples
       WHERE tunnel_name = ? AND sampled_at >= ?
       ORDER BY sampled_at ASC LIMIT 2000`
    )
    .bind(tunnelName, since)
    .all<TrafficSample>();
  return rows(result);
}

export interface TrafficTotals {
  bytesIn: number;
  bytesOut: number;
  requests: number;
  errors: number;
  samples: number;
  lastSampledAt: string | null;
}

export async function trafficTotals(db: D1Database, tunnelName: string, windowHours = 24): Promise<TrafficTotals> {
  const samples = await trafficSeries(db, tunnelName, windowHours);
  return {
    bytesIn: samples.reduce((sum, s) => sum + Number(s.bytes_in || 0), 0),
    bytesOut: samples.reduce((sum, s) => sum + Number(s.bytes_out || 0), 0),
    requests: samples.reduce((sum, s) => sum + Number(s.requests || 0), 0),
    errors: samples.reduce((sum, s) => sum + Number(s.errors || 0), 0),
    samples: samples.length,
    lastSampledAt: samples.length ? samples[samples.length - 1].sampled_at : null,
  };
}

// ---------------------------------------------------------------------------
// Devices (tunnel connector connections reported by Cloudflare)
// ---------------------------------------------------------------------------

export interface DeviceRecord {
  id: number;
  tunnel_name: string;
  device_key: string;
  label: string | null;
  origin_ip: string | null;
  client_version: string | null;
  colo: string | null;
  status: string;
  first_seen: string;
  last_seen: string;
}

export async function listDevices(db: D1Database, tunnelName?: string): Promise<DeviceRecord[]> {
  const sql = tunnelName
    ? `SELECT * FROM cloudflared_devices WHERE tunnel_name = ? ORDER BY status ASC, last_seen DESC LIMIT 200`
    : `SELECT * FROM cloudflared_devices ORDER BY status ASC, last_seen DESC LIMIT 200`;
  const stmt = db.prepare(sql);
  const result = tunnelName ? await stmt.bind(tunnelName).all<DeviceRecord>() : await stmt.all<DeviceRecord>();
  return rows(result);
}

export interface DeviceInput {
  deviceKey: string;
  label?: string | null;
  originIp?: string | null;
  clientVersion?: string | null;
  colo?: string | null;
}

/**
 * Reconciles the stored device list with the connector connections currently
 * reported for a tunnel: present keys become `connected`, absent ones
 * `disconnected`. Nothing is invented for tunnels without live data.
 */
export async function reconcileDevices(
  db: D1Database,
  tunnelName: string,
  devices: DeviceInput[]
): Promise<void> {
  const now = nowIso();
  const keep = new Set(devices.map((device) => device.deviceKey));
  const existing = await listDevices(db, tunnelName);

  for (const device of existing) {
    if (!keep.has(device.device_key) && device.status === "connected") {
      await db
        .prepare("UPDATE cloudflared_devices SET status = 'disconnected' WHERE id = ?")
        .bind(device.id)
        .run();
    }
  }

  for (const device of devices) {
    await db
      .prepare(
        `INSERT INTO cloudflared_devices
           (tunnel_name, device_key, label, origin_ip, client_version, colo, status, first_seen, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, 'connected', ?, ?)
         ON CONFLICT(tunnel_name, device_key) DO UPDATE SET
           label = excluded.label,
           origin_ip = excluded.origin_ip,
           client_version = excluded.client_version,
           colo = excluded.colo,
           status = 'connected',
           last_seen = excluded.last_seen`
      )
      .bind(
        tunnelName,
        device.deviceKey.slice(0, 200),
        (device.label || "").slice(0, 200) || null,
        (device.originIp || "").slice(0, 100) || null,
        (device.clientVersion || "").slice(0, 100) || null,
        (device.colo || "").slice(0, 50) || null,
        now,
        now
      )
      .run();
  }
}

// ---------------------------------------------------------------------------
// Access rules
// ---------------------------------------------------------------------------

export type AccessMatchKind = "ip" | "email" | "path";

export interface AccessRule {
  id: number;
  name: string;
  path_prefix: string;
  match_kind: AccessMatchKind;
  match_value: string;
  action: "allow" | "deny";
  enabled: number;
  created_at: string;
}

export async function listAccessRules(db: D1Database): Promise<AccessRule[]> {
  const result = await db
    .prepare("SELECT * FROM cloudflared_access_rules ORDER BY id DESC")
    .all<AccessRule>();
  return rows(result);
}

export async function createAccessRule(
  db: D1Database,
  input: { name: string; pathPrefix: string; matchKind: AccessMatchKind; matchValue: string; action: "allow" | "deny" },
  actor: string
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO cloudflared_access_rules (name, path_prefix, match_kind, match_value, action, enabled)
       VALUES (?, ?, ?, ?, ?, 1)`
    )
    .bind(
      input.name.slice(0, 100),
      input.pathPrefix.slice(0, 200),
      input.matchKind,
      input.matchValue.slice(0, 200),
      input.action
    )
    .run();
  const id = Number(result?.meta?.last_row_id || 0);
  await recordEvent(db, {
    level: "info",
    action: "access_rule_created",
    actor,
    message: `${input.action === "deny" ? "Deny" : "Allow"} rule "${input.name}" for ${input.pathPrefix} (${input.matchKind}: ${input.matchValue})`,
  });
  return id;
}

export async function setAccessRuleEnabled(
  db: D1Database,
  id: number,
  enabled: boolean,
  actor: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE cloudflared_access_rules SET enabled = ? WHERE id = ?")
    .bind(enabled ? 1 : 0, id)
    .run();
  const changed = Number(result?.meta?.changes || 0) > 0;
  if (changed) {
    await recordEvent(db, {
      level: "info",
      action: enabled ? "access_rule_enabled" : "access_rule_disabled",
      actor,
      message: `Access rule #${id} ${enabled ? "enabled" : "disabled"}`,
    });
  }
  return changed;
}

export async function deleteAccessRule(db: D1Database, id: number, actor: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM cloudflared_access_rules WHERE id = ?").bind(id).run();
  const changed = Number(result?.meta?.changes || 0) > 0;
  if (changed) {
    await recordEvent(db, {
      level: "warn",
      action: "access_rule_deleted",
      actor,
      message: `Access rule #${id} deleted`,
    });
  }
  return changed;
}

export interface AccessContext {
  ip: string;
  email: string;
  path: string;
}

export interface AccessDecision {
  allowed: boolean;
  rule: AccessRule | null;
  reason: string;
  /** False when no enabled rule covers the requested path. */
  enforced: boolean;
}

/**
 * Applies the operator's access rules to a request.
 * Rules only govern the path scopes they declare: a request outside every
 * rule's scope is left to the application's own authorization. Inside a
 * scope, an explicit deny wins; otherwise allow rules must match.
 */
export function evaluateAccess(rules: AccessRule[], context: AccessContext): AccessDecision {
  const enabled = rules.filter((rule) => Number(rule.enabled) === 1);
  const scoped = enabled.filter((rule) => {
    const prefix = rule.path_prefix || "/";
    return prefix === "/" || context.path === prefix || context.path.startsWith(prefix);
  });

  if (scoped.length === 0) {
    return { allowed: true, rule: null, reason: "No access rule covers this path", enforced: false };
  }

  const matches = (rule: AccessRule): boolean => {
    const value = (rule.match_value || "").trim();
    if (!value) return false;
    if (rule.match_kind === "ip") {
      if (value.endsWith("*")) return context.ip.startsWith(value.slice(0, -1));
      return context.ip === value;
    }
    if (rule.match_kind === "email") {
      const target = value.toLowerCase();
      const actual = (context.email || "").toLowerCase();
      if (!actual) return false;
      if (target.startsWith("*@")) return actual.endsWith(target.slice(1));
      return actual === target;
    }
    return context.path === value || context.path.startsWith(value);
  };

  const deny = scoped.find((rule) => rule.action === "deny" && matches(rule));
  if (deny) {
    return { allowed: false, rule: deny, reason: `Denied by rule "${deny.name}"`, enforced: true };
  }

  const allowRules = scoped.filter((rule) => rule.action === "allow");
  if (allowRules.length === 0) {
    return { allowed: true, rule: null, reason: "Only deny rules apply; no rule matched", enforced: true };
  }

  const allow = allowRules.find(matches);
  if (allow) {
    return { allowed: true, rule: allow, reason: `Allowed by rule "${allow.name}"`, enforced: true };
  }
  return {
    allowed: false,
    rule: allowRules[0],
    reason: "No allow rule matched this client",
    enforced: true,
  };
}

// ---------------------------------------------------------------------------
// Alert rules and delivery
// ---------------------------------------------------------------------------

export type AlertEvent = "tunnel_down" | "tunnel_up" | "status_change";
export type AlertChannel = "webhook" | "telegram";

export interface AlertRule {
  id: number;
  name: string;
  event: AlertEvent;
  channel: AlertChannel;
  target: string | null;
  enabled: number;
  created_at: string;
}

export async function listAlertRules(db: D1Database): Promise<AlertRule[]> {
  const result = await db.prepare("SELECT * FROM cloudflared_alert_rules ORDER BY id DESC").all<AlertRule>();
  return rows(result);
}

export async function createAlertRule(
  db: D1Database,
  input: { name: string; event: AlertEvent; channel: AlertChannel; target: string },
  actor: string
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO cloudflared_alert_rules (name, event, channel, target, enabled)
       VALUES (?, ?, ?, ?, 1)`
    )
    .bind(input.name.slice(0, 100), input.event, input.channel, input.target.slice(0, 300))
    .run();
  const id = Number(result?.meta?.last_row_id || 0);
  await recordEvent(db, {
    level: "info",
    action: "alert_rule_created",
    actor,
    message: `Alert "${input.name}" created for ${input.event} via ${input.channel}`,
  });
  return id;
}

export async function setAlertRuleEnabled(
  db: D1Database,
  id: number,
  enabled: boolean,
  actor: string
): Promise<boolean> {
  const result = await db
    .prepare("UPDATE cloudflared_alert_rules SET enabled = ? WHERE id = ?")
    .bind(enabled ? 1 : 0, id)
    .run();
  const changed = Number(result?.meta?.changes || 0) > 0;
  if (changed) {
    await recordEvent(db, {
      level: "info",
      action: enabled ? "alert_rule_enabled" : "alert_rule_disabled",
      actor,
      message: `Alert rule #${id} ${enabled ? "enabled" : "disabled"}`,
    });
  }
  return changed;
}

export async function deleteAlertRule(db: D1Database, id: number, actor: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM cloudflared_alert_rules WHERE id = ?").bind(id).run();
  const changed = Number(result?.meta?.changes || 0) > 0;
  if (changed) {
    await recordEvent(db, {
      level: "warn",
      action: "alert_rule_deleted",
      actor,
      message: `Alert rule #${id} deleted`,
    });
  }
  return changed;
}

export interface AlertDelivery {
  id: number;
  rule_id: number | null;
  created_at: string;
  event: string;
  tunnel_name: string | null;
  channel: string;
  status: string;
  detail: string | null;
}

export async function recordDelivery(
  db: D1Database,
  input: { ruleId: number | null; event: string; tunnelName?: string | null; channel: string; status: string; detail?: string }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO cloudflared_alert_deliveries (rule_id, created_at, event, tunnel_name, channel, status, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.ruleId,
      nowIso(),
      input.event,
      input.tunnelName || null,
      input.channel,
      input.status,
      (input.detail || "").slice(0, 1000) || null
    )
    .run();
}

export async function listDeliveries(db: D1Database, limit = 50): Promise<AlertDelivery[]> {
  const result = await db
    .prepare("SELECT * FROM cloudflared_alert_deliveries ORDER BY id DESC LIMIT ?")
    .bind(Math.max(1, Math.min(limit, 200)))
    .all<AlertDelivery>();
  return rows(result);
}
