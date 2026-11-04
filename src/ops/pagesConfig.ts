/** Settings, activity log, access controls and notification pages. */

import type { OpsPageData, OpsRenderOptions } from "./types";
import { secretField, selectField, submitButton, textField } from "./forms";
import { emptyState, esc, formatDateTime, formatRelative, notice, signInPrompt, statusBadge } from "./ui";

export function renderSettings(data: OpsPageData, options: OpsRenderOptions): { title: string; subtitle: string; body: string } {
  const { config } = data;
  const admin = options.isAdmin;

  const sourceLabel = (source: "saved" | "environment" | "missing"): string =>
    source === "saved" ? "saved here (encrypted)" : source === "environment" ? "from environment" : "not set";

  const body = `
    ${admin ? "" : signInPrompt("/settings", "Saving credentials or tunnel configuration")}
    ${
      config.decryptError
        ? notice("error", "A saved credential cannot be read", esc(config.decryptError))
        : ""
    }
    <form class="card stack" method="POST" action="/api/ops/settings">
      <div class="card-h"><h2>Tunnel configuration</h2><span class="muted">used by the tunnel manager and health checks</span></div>
      <div class="two-col">
        ${textField("account_id", "Cloudflare account ID", config.accountId, {
          placeholder: "023e105f4ecef8ad9ca31a8372d0c353",
          hint: "Found in the Cloudflare dashboard URL.",
          disabled: !admin,
        })}
        ${textField("tunnel_name", "Tunnel name", config.tunnelName, {
          placeholder: "xbet-tunnel",
          hint: "Tunnel created with `cloudflared tunnel create`.",
          disabled: !admin,
        })}
        ${textField("tunnel_id", "Tunnel ID (optional)", config.tunnelId, {
          placeholder: "6ff42ae2-765d-4adf-8112-31c55c1551ef",
          hint: "Resolved automatically from the name when left blank.",
          disabled: !admin,
        })}
        ${textField("hostname", "Public hostname", config.hostname, {
          placeholder: "bot.example.com",
          hint: "Shown on the dashboard and stored with the tunnel record.",
          disabled: !admin,
        })}
        ${textField("origin_service", "Local origin service", config.originService, {
          placeholder: "http://127.0.0.1:3000",
          hint: "Where cloudflared forwards tunnel traffic.",
          disabled: !admin,
        })}
        ${textField("metrics_addr", "Metrics address", config.metricsAddr, {
          placeholder: "127.0.0.1:20241",
          hint: "cloudflared --metrics endpoint used for traffic statistics.",
          disabled: !admin,
        })}
        ${textField("cloudflared_bin", "cloudflared binary", config.cloudflaredBin, {
          placeholder: "cloudflared",
          hint: "Command or absolute path used to start the connector.",
          disabled: !admin,
        })}
      </div>

      <div class="card-h" style="margin-top:6px"><h2>Credentials</h2><span class="muted">stored encrypted, never displayed</span></div>
      <div class="two-col">
        ${secretField("api_token", "Cloudflare API token", {
          saved: config.sources.apiToken === "saved",
          hint: `Used read-only for tunnel and connector health (${sourceLabel(config.sources.apiToken)}). Leave blank to keep the saved value.`,
          disabled: !admin,
        })}
        ${secretField("tunnel_token", "Tunnel token", {
          saved: config.sources.tunnelToken === "saved",
          hint: `Lets this app run the connector process (${sourceLabel(config.sources.tunnelToken)}). Leave blank to keep the saved value.`,
          disabled: !admin,
        })}
      </div>
      <p class="muted">Credentials are encrypted with AES-GCM using a key derived from <span class="mono">SECURITY_CODE_PEPPER</span>. If that value rotates, re-save both credentials.</p>
      <div class="row-actions">${admin ? submitButton("Save settings") : `<button class="btn primary" type="submit" disabled>Save settings</button>`}</div>
    </form>

    <div class="card" style="margin-top:16px">
      <div class="card-h"><h2>Credential status</h2></div>
      <dl class="kv">
        <dt>API token</dt><dd>${esc(sourceLabel(config.sources.apiToken))}</dd>
        <dt>Tunnel token</dt><dd>${esc(sourceLabel(config.sources.tunnelToken))}</dd>
        <dt>Config source</dt><dd>Saved values take precedence over environment variables.</dd>
      </dl>
    </div>

    ${
      admin
        ? `<div class="card" style="margin-top:16px">
            <div class="card-h"><h2>Forget credentials</h2><span class="muted">removes the encrypted value</span></div>
            <form method="POST" action="/api/ops/settings/clear" class="inline-form">
              <input type="hidden" name="key" value="api_token" />
              <button class="btn danger small" type="submit">Forget API token</button>
            </form>
            <form method="POST" action="/api/ops/settings/clear" class="inline-form">
              <input type="hidden" name="key" value="tunnel_token" />
              <button class="btn danger small" type="submit">Forget tunnel token</button>
            </form>
          </div>`
        : ""
    }`;

  return {
    title: "Service Settings",
    subtitle: "Tunnel configuration and credentials for the cloudflared integration.",
    body,
  };
}

export function renderActivityLogs(data: OpsPageData, options: OpsRenderOptions): { title: string; subtitle: string; body: string } {
  const filters = options.filters || { level: "all", action: "", query: "", limit: 100 };
  const levelOptions = [
    { value: "all", label: "All levels" },
    { value: "info", label: "Info" },
    { value: "warn", label: "Warning" },
    { value: "error", label: "Error" },
  ];
  const actionOptions = [{ value: "", label: "All actions" }, ...data.eventActions.map((action) => ({ value: action, label: action }))];

  const rows = data.events
    .map(
      (event) => `<tr>
      <td class="mono">${esc(formatDateTime(event.created_at))}<div class="muted">${esc(formatRelative(event.created_at))}</div></td>
      <td>${statusBadge(event.level)}</td>
      <td class="mono">${esc(event.action)}</td>
      <td>${esc(event.actor)}</td>
      <td>${esc(event.message)}${
        event.metadata
          ? `<details><summary>metadata</summary><pre class="log" style="max-height:120px;margin-top:6px">${esc(event.metadata)}</pre></details>`
          : ""
      }</td>
    </tr>`
    )
    .join("");

  const body = `<form class="card" method="GET" action="/activity-logs">
    <div class="toolbar">
      ${selectField("level", "Level", filters.level, levelOptions)}
      ${selectField("action", "Action", filters.action, actionOptions)}
      ${textField("q", "Search", filters.query, { placeholder: "message or action" })}
      ${textField("limit", "Limit", String(filters.limit), { type: "number" })}
      ${submitButton("Filter", "btn")}
      <a class="btn small" href="/activity-logs">Reset</a>
    </div>
  </form>

  <div class="card">
    <div class="card-h"><h2>Activity</h2><span class="muted">${data.events.length} entries, newest first</span></div>
    ${
      data.events.length > 0
        ? `<div class="table-wrap"><table>
            <thead><tr><th>When</th><th>Level</th><th>Action</th><th>Actor</th><th>Detail</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>`
        : emptyState("No matching activity", "Adjust the filters, or perform an action such as saving settings or running a health check.")
    }
  </div>`;

  return {
    title: "Activity Logs",
    subtitle: "Chronological record of tunnel actions, health changes and errors.",
    body,
  };
}

export function renderAccessControls(data: OpsPageData, options: OpsRenderOptions): { title: string; subtitle: string; body: string } {
  const admin = options.isAdmin;
  const decisions = data.events.filter((event) => event.action.startsWith("access_"));

  const ruleRows = data.accessRules
    .map(
      (rule) => `<tr>
      <td><strong>${esc(rule.name)}</strong><div class="muted mono">#${esc(rule.id)}</div></td>
      <td class="mono">${esc(rule.path_prefix)}</td>
      <td class="mono">${esc(rule.match_kind)}: ${esc(rule.match_value)}</td>
      <td>${statusBadge(rule.action === "deny" ? "down" : "up")} <span class="muted">${esc(rule.action)}</span></td>
      <td>${rule.enabled ? statusBadge("up") : statusBadge("unknown")} <span class="muted">${rule.enabled ? "enabled" : "disabled"}</span></td>
      <td>
        ${
          admin
            ? `<div class="row-actions">
                <form method="POST" action="/api/ops/access/rules/toggle">
                  <input type="hidden" name="id" value="${esc(rule.id)}" />
                  <input type="hidden" name="enabled" value="${rule.enabled ? "0" : "1"}" />
                  <button class="btn small" type="submit">${rule.enabled ? "Disable" : "Enable"}</button>
                </form>
                <form method="POST" action="/api/ops/access/rules/delete">
                  <input type="hidden" name="id" value="${esc(rule.id)}" />
                  <button class="btn danger small" type="submit">Delete</button>
                </form>
              </div>`
            : `<span class="muted">sign in to edit</span>`
        }
      </td>
    </tr>`
    )
    .join("");

  const body = `
    ${admin ? "" : signInPrompt("/access-controls", "Creating or changing access rules")}
    ${notice(
      "info",
      "How these rules are enforced",
      `Rules apply to the path scopes you give them. On a matching request, an explicit <strong>deny</strong> always wins; if the scope only has allow rules, a client must match one. Paths outside every rule scope keep the app's normal behaviour.`
    )}
    <div class="card" style="margin-bottom:16px">
      <div class="card-h"><h2>Access rules</h2><span class="muted">${data.accessRules.length} rule${data.accessRules.length === 1 ? "" : "s"}</span></div>
      ${
        data.accessRules.length > 0
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Rule</th><th>Path scope</th><th>Match</th><th>Effect</th><th>State</th><th>Actions</th></tr></thead>
              <tbody>${ruleRows}</tbody>
            </table></div>`
          : emptyState("No access rules yet", "Add a rule below to gate a path scope by IP, Cloudflare Access email, or path.")
      }
    </div>

    <form class="card stack" method="POST" action="/api/ops/access/rules" style="margin-bottom:16px">
      <div class="card-h"><h2>Add a rule</h2></div>
      <div class="two-col">
        ${textField("name", "Rule name", "", { placeholder: "Office only", required: true, disabled: !admin })}
        ${textField("path_prefix", "Path scope", "/api/", { placeholder: "/api/", hint: "Paths starting with this value are governed by the rule.", disabled: !admin })}
        ${selectField("match_kind", "Match on", "ip", [
          { value: "ip", label: "Client IP" },
          { value: "email", label: "Access email (Cf-Access-Authenticated-User-Email)" },
          { value: "path", label: "Path" },
        ])}
        ${textField("match_value", "Value", "", { placeholder: "203.0.113.*", required: true, disabled: !admin, hint: "IP supports a trailing *, email supports *@domain.com." })}
        ${selectField("action", "Effect", "deny", [
          { value: "deny", label: "Deny" },
          { value: "allow", label: "Allow only matching clients" },
        ])}
      </div>
      <div class="row-actions">${admin ? submitButton("Add rule") : `<button class="btn primary" type="submit" disabled>Add rule</button>`}</div>
    </form>

    <div class="card">
      <div class="card-h"><h2>Recent access decisions</h2><span class="muted">recorded by the request gate</span></div>
      ${
        decisions.length > 0
          ? `<div class="table-wrap"><table>
              <thead><tr><th>When</th><th>Level</th><th>Decision</th><th>Detail</th></tr></thead>
              <tbody>${decisions
                .slice(0, 20)
                .map(
                  (event) => `<tr>
                  <td class="mono">${esc(formatDateTime(event.created_at))}</td>
                  <td>${statusBadge(event.level)}</td>
                  <td class="mono">${esc(event.action)}</td>
                  <td>${esc(event.message)}</td>
                </tr>`
                )
                .join("")}</tbody>
            </table></div>`
          : emptyState("No decisions recorded", "Decisions appear here when a request matches a configured rule scope.")
      }
    </div>`;

  return {
    title: "Access Controls",
    subtitle: "Rules deciding who may reach specific service paths through the tunnel.",
    body,
  };
}

export function renderNotifications(data: OpsPageData, options: OpsRenderOptions): { title: string; subtitle: string; body: string } {
  const admin = options.isAdmin;

  const ruleRows = data.alertRules
    .map(
      (rule) => `<tr>
      <td><strong>${esc(rule.name)}</strong><div class="muted mono">#${esc(rule.id)}</div></td>
      <td class="mono">${esc(rule.event)}</td>
      <td class="mono">${esc(rule.channel)}</td>
      <td class="mono">${esc(rule.target || "default admin chat")}</td>
      <td>${rule.enabled ? statusBadge("up") : statusBadge("unknown")} <span class="muted">${rule.enabled ? "enabled" : "disabled"}</span></td>
      <td>
        ${
          admin
            ? `<div class="row-actions">
                <form method="POST" action="/api/ops/alerts/test">
                  <input type="hidden" name="id" value="${esc(rule.id)}" />
                  <button class="btn small" type="submit">Send test</button>
                </form>
                <form method="POST" action="/api/ops/alerts/rules/toggle">
                  <input type="hidden" name="id" value="${esc(rule.id)}" />
                  <input type="hidden" name="enabled" value="${rule.enabled ? "0" : "1"}" />
                  <button class="btn small" type="submit">${rule.enabled ? "Disable" : "Enable"}</button>
                </form>
                <form method="POST" action="/api/ops/alerts/rules/delete">
                  <input type="hidden" name="id" value="${esc(rule.id)}" />
                  <button class="btn danger small" type="submit">Delete</button>
                </form>
              </div>`
            : `<span class="muted">sign in to edit</span>`
        }
      </td>
    </tr>`
    )
    .join("");

  const deliveryRows = data.deliveries
    .map(
      (delivery) => `<tr>
      <td class="mono">${esc(formatDateTime(delivery.created_at))}</td>
      <td class="mono">${esc(delivery.event)}</td>
      <td class="mono">${esc(delivery.channel)}</td>
      <td>${statusBadge(delivery.status)}</td>
      <td>${esc(delivery.detail || "—")}</td>
    </tr>`
    )
    .join("");

  const body = `
    ${admin ? "" : signInPrompt("/notifications", "Managing alert rules")}
    ${notice(
      "info",
      "When alerts fire",
      "Alerts are evaluated on every health check. A notification is sent only when the tunnel status actually changes (down, recovered, or any other transition), and every attempt is recorded below with its real outcome."
    )}
    <div class="card" style="margin-bottom:16px">
      <div class="card-h"><h2>Alert rules</h2><span class="muted">${data.alertRules.length} rule${data.alertRules.length === 1 ? "" : "s"}</span></div>
      ${
        data.alertRules.length > 0
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Rule</th><th>Event</th><th>Channel</th><th>Target</th><th>State</th><th>Actions</th></tr></thead>
              <tbody>${ruleRows}</tbody>
            </table></div>`
          : emptyState("No alert rules yet", "Add a rule to be notified when the tunnel goes down or recovers.")
      }
    </div>

    <form class="card stack" method="POST" action="/api/ops/alerts/rules" style="margin-bottom:16px">
      <div class="card-h"><h2>Add an alert</h2></div>
      <div class="two-col">
        ${textField("name", "Rule name", "", { placeholder: "Tunnel down alert", required: true, disabled: !admin })}
        ${selectField("event", "Event", "tunnel_down", [
          { value: "tunnel_down", label: "Tunnel goes down" },
          { value: "tunnel_up", label: "Tunnel recovers" },
          { value: "status_change", label: "Any status change" },
        ])}
        ${selectField("channel", "Channel", "webhook", [
          { value: "webhook", label: "Webhook (HTTPS POST)" },
          { value: "telegram", label: "Telegram message" },
        ])}
        ${textField("target", "Target", "", {
          placeholder: "https://example.com/hooks/tunnel or -1001234567890",
          hint: "Webhook URL, or a Telegram chat ID (blank uses ADMIN_CHANNEL_ID).",
          disabled: !admin,
        })}
      </div>
      <div class="row-actions">${admin ? submitButton("Add alert rule") : `<button class="btn primary" type="submit" disabled>Add alert rule</button>`}</div>
    </form>

    <div class="card">
      <div class="card-h"><h2>Delivery history</h2><span class="muted">real outcomes, including failures</span></div>
      ${
        data.deliveries.length > 0
          ? `<div class="table-wrap"><table>
              <thead><tr><th>When</th><th>Event</th><th>Channel</th><th>Result</th><th>Detail</th></tr></thead>
              <tbody>${deliveryRows}</tbody>
            </table></div>`
          : emptyState("No notifications sent yet", "Use “Send test” on a rule to verify delivery, or wait for a tunnel status change.")
      }
    </div>`;

  return {
    title: "Notification Alerts",
    subtitle: "Be told when the tunnel changes state or goes down.",
    body,
  };
}
