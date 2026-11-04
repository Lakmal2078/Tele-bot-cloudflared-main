/** Dashboard, tunnel manager, devices and traffic pages. */

import type { OpsPageData, OpsRenderOptions } from "./types";
import { renderTrafficChart } from "./chart";
import { emptyState, esc, formatBytes, formatDateTime, formatDuration, formatNumber, formatRelative, notice, signInPrompt, statusBadge } from "./ui";

function statCard(label: string, value: string, sub: string): string {
  return `<div class="card">
    <div class="stat-label">${esc(label)}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-sub">${sub}</div>
  </div>`;
}

function eventsTable(events: OpsPageData["events"], limit = 8): string {
  if (events.length === 0) {
    return emptyState("No activity recorded yet", "Actions taken here and tunnel status changes appear in this log.");
  }
  const rows = events
    .slice(0, limit)
    .map(
      (event) => `<tr>
      <td class="mono">${esc(formatDateTime(event.created_at))}</td>
      <td>${statusBadge(event.level)}</td>
      <td class="mono">${esc(event.action)}</td>
      <td>${esc(event.message)}</td>
    </tr>`
    )
    .join("");
  return `<div class="table-wrap"><table>
    <thead><tr><th>When</th><th>Level</th><th>Action</th><th>Detail</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

export function renderDashboard(data: OpsPageData, _options: OpsRenderOptions): { title: string; subtitle: string; body: string } {
  const { snapshot, config, control, uptime24h, traffic24h } = data;

  const setupNotice =
    snapshot.status === "unknown"
      ? notice(
          "info",
          config.apiToken || config.tunnelToken ? "Monitoring is not connected yet" : "Connect cloudflared to see live status",
          `<p>${esc(snapshot.detail)}</p>
           <p>Two ways to feed this dashboard:</p>
           <ul>
             <li><strong>Cloudflare API token</strong> (+ account ID) for live tunnel and connector health — read-only.</li>
             <li><strong>Tunnel token</strong> to run a connector from this app, which also exposes traffic metrics.</li>
           </ul>
           <p><a class="btn primary" href="/settings">Open Service Settings</a></p>`
        )
      : "";

  const errorNotice = snapshot.error
    ? notice("error", "Cloudflare reported a problem", `${esc(snapshot.error.message)}${snapshot.error.hint ? `<br /><span class="muted">${esc(snapshot.error.hint)}</span>` : ""}`)
    : "";

  const uptimeValue = uptime24h.percent === null ? "—" : `${uptime24h.percent}%`;
  const checksSub =
    uptime24h.checks === 0
      ? "no health checks recorded yet"
      : `${uptime24h.upChecks} up / ${uptime24h.downChecks} down of ${uptime24h.checks} checks`;

  const statuses =
    data.tunnels.length > 0
      ? `<div class="table-wrap"><table>
          <thead><tr><th>Tunnel</th><th>Status</th><th>Connections</th><th>Last checked</th></tr></thead>
          <tbody>${data.tunnels
            .map(
              (tunnel) => `<tr>
              <td><strong>${esc(tunnel.name)}</strong><div class="muted mono">${esc(tunnel.hostname || tunnel.tunnelId || "no hostname configured")}</div></td>
              <td>${statusBadge(tunnel.lastStatus || "unknown")}</td>
              <td class="mono">${esc(tunnel.tunnelId ? "see Cloudflare" : "—")}</td>
              <td class="mono">${esc(formatRelative(tunnel.lastCheckedAt))}</td>
            </tr>`
            )
            .join("")}</tbody>
        </table></div>`
      : emptyState("No tunnels recorded yet", "A tunnel appears here after the first health check runs with credentials saved.");

  const body = `
    ${setupNotice}
    ${errorNotice}
    <div class="grid">
      ${statCard("Tunnel status", statusBadge(snapshot.status), esc(snapshot.source === "none" ? "no live source" : `source: ${snapshot.source}`))}
      ${statCard("Uptime (24h)", esc(uptimeValue), esc(checksSub))}
      ${statCard("Connections", esc(formatNumber(snapshot.connections)), esc(snapshot.detail.slice(0, 90)))}
      ${statCard("Traffic (24h)", formatBytes(traffic24h.bytesIn + traffic24h.bytesOut), `in ${formatBytes(traffic24h.bytesIn)} · out ${formatBytes(traffic24h.bytesOut)}`)}
      ${statCard("Requests (24h)", esc(formatNumber(traffic24h.requests)), traffic24h.samples ? `${esc(formatNumber(traffic24h.errors))} errors · ${traffic24h.samples} samples` : "no samples collected")}
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-h"><h2>Connector runtime</h2>${statusBadge(control.running ? "up" : control.supported ? "unknown" : "error")}</div>
        <dl class="kv">
          <dt>Process</dt><dd>${control.running ? `running · PID ${esc(control.pid)}` : "stopped"}</dd>
          <dt>Uptime</dt><dd>${esc(control.running ? formatDuration(control.startedAt) : "—")}</dd>
          <dt>CLI</dt><dd class="mono">${esc(control.binary)}${control.binAvailable ? "" : " (not found)"}</dd>
          <dt>Metrics</dt><dd class="mono">${esc(config.metricsAddr || "—")}</dd>
        </dl>
        <p class="muted" style="margin:10px 0 0">${esc(control.message)}</p>
        <p style="margin:12px 0 0"><a class="btn small" href="/tunnel-manager">Manage tunnels →</a></p>
      </div>
      <div class="card">
        <div class="card-h"><h2>Uptime</h2>${statusBadge(snapshot.status)}</div>
        <dl class="kv">
          <dt>24 hours</dt><dd>${uptime24h.percent === null ? "no data" : `${uptime24h.percent}%`} <span class="muted">(${uptime24h.checks} checks)</span></dd>
          <dt>7 days</dt><dd>${data.uptime7d.percent === null ? "no data" : `${data.uptime7d.percent}%`} <span class="muted">(${data.uptime7d.checks} checks)</span></dd>
          <dt>Monitoring since</dt><dd>${esc(formatDateTime(uptime24h.since))}</dd>
          <dt>Last change</dt><dd>${uptime24h.lastChangeAt ? `${statusBadge(uptime24h.lastChangeTo || "unknown")} <span class="muted">${esc(formatRelative(uptime24h.lastChangeAt))}</span>` : "no transitions recorded"}</dd>
        </dl>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-h"><h2>Tunnel health</h2><a class="btn small" href="/tunnel-manager">Tunnel manager</a></div>
      ${statuses}
    </div>

    <div class="card">
      <div class="card-h"><h2>Recent activity</h2><a class="btn small" href="/activity-logs">All logs</a></div>
      ${eventsTable(data.events)}
    </div>`;

  return {
    title: "Bot Dashboard",
    subtitle: "Live cloudflared status, connector uptime and recent activity.",
    body,
  };
}

export function renderTunnelManager(data: OpsPageData, options: OpsRenderOptions): { title: string; subtitle: string; body: string } {
  const { config, control, snapshot } = data;
  const admin = options.isAdmin;
  const canStart = admin && control.supported && control.binAvailable && Boolean(config.tunnelToken);
  const canStop = admin && control.running;
  const canRestart = admin && control.supported && control.binAvailable && Boolean(config.tunnelToken) && control.running;

  const startReason = !control.supported
    ? "This runtime cannot run a connector process."
    : !control.binAvailable
      ? `The "${control.binary}" CLI is not installed in this runtime.`
      : !config.tunnelToken
        ? "Save a tunnel token on the Service Settings page first."
        : !admin
          ? "Sign in as admin to control the connector."
          : "";

  const controlsCard = `<div class="card">
    <div class="card-h"><h2>Connector control</h2>${statusBadge(control.running ? "up" : "unknown")}</div>
    <dl class="kv">
      <dt>Runtime</dt><dd>${control.supported ? "local process supervisor" : "not supported here"}</dd>
      <dt>CLI available</dt><dd>${control.binAvailable ? "yes" : "no"} <span class="mono muted">${esc(control.binary)}</span></dd>
      <dt>State</dt><dd>${control.running ? `running · PID ${esc(control.pid)} · ${esc(formatDuration(control.startedAt))}` : "stopped"}</dd>
      ${control.lastExitAt ? `<dt>Last exit</dt><dd>code ${esc(control.lastExitCode ?? "—")} at ${esc(formatDateTime(control.lastExitAt))}</dd>` : ""}
    </dl>
    <p class="muted" style="margin:10px 0">${esc(control.message)}</p>
    <div class="row-actions">
      <form method="POST" action="/api/ops/tunnels/start"><button class="btn primary" type="submit"${canStart ? "" : " disabled"}>Start</button></form>
      <form method="POST" action="/api/ops/tunnels/stop"><button class="btn" type="submit"${canStop ? "" : " disabled"}>Stop</button></form>
      <form method="POST" action="/api/ops/tunnels/restart"><button class="btn" type="submit"${canRestart ? "" : " disabled"}>Restart</button></form>
      <form method="POST" action="/api/ops/tunnels/check"><button class="btn" type="submit"${admin ? "" : " disabled"}>Check health now</button></form>
    </div>
    ${startReason ? `<p class="muted" style="margin:10px 0 0">${esc(startReason)}</p>` : ""}
    ${admin ? "" : signInPrompt("/tunnel-manager", "Starting, stopping or restarting a tunnel")}
  </div>`;

  const healthCard = `<div class="card">
    <div class="card-h"><h2>Reported health</h2>${statusBadge(snapshot.status)}</div>
    <dl class="kv">
      <dt>Source</dt><dd>${esc(snapshot.source === "none" ? "unavailable" : snapshot.source)}</dd>
      <dt>Tunnel</dt><dd>${esc(snapshot.tunnelName)} ${snapshot.tunnelId ? `<span class="mono muted">${esc(snapshot.tunnelId)}</span>` : ""}</dd>
      <dt>Connections</dt><dd>${esc(formatNumber(snapshot.connections))}</dd>
      <dt>Checked</dt><dd>${esc(formatDateTime(snapshot.checkedAt))}</dd>
      <dt>Detail</dt><dd>${esc(snapshot.detail)}</dd>
    </dl>
    ${snapshot.error ? notice("warn", "Health source unavailable", `${esc(snapshot.error.message)}${snapshot.error.hint ? `<br /><span class="muted">${esc(snapshot.error.hint)}</span>` : ""}`) : ""}
  </div>`;

  const tunnelsTable =
    data.tunnels.length > 0
      ? `<div class="table-wrap"><table>
          <thead><tr><th>Name</th><th>Hostname</th><th>Origin</th><th>Status</th><th>Checked</th></tr></thead>
          <tbody>${data.tunnels
            .map(
              (tunnel) => `<tr>
              <td><strong>${esc(tunnel.name)}</strong><div class="mono muted">${esc(tunnel.tunnelId || "id resolved on next check")}</div></td>
              <td class="mono">${esc(tunnel.hostname || "—")}</td>
              <td class="mono">${esc(tunnel.serviceUrl || "—")}</td>
              <td>${statusBadge(tunnel.lastStatus || "unknown")}</td>
              <td class="mono">${esc(formatRelative(tunnel.lastCheckedAt))}</td>
            </tr>`
            )
            .join("")}</tbody>
        </table></div>`
      : emptyState("No tunnels yet", "A tunnel record is created on the first health check after credentials are saved.");

  const logCard = `<div class="card">
    <div class="card-h"><h2>Connector output</h2><span class="muted">last ${data.logs.length} lines, token redacted</span></div>
    ${data.logs.length > 0 ? `<pre class="log">${esc(data.logs.join("\n"))}</pre>` : emptyState("No connector output", "Start the connector to see its log here.")}
  </div>`;

  return {
    title: "Tunnel Manager",
    subtitle: "Start, stop or restart the cloudflared connector and inspect its health.",
    body: `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">${controlsCard}${healthCard}</div>
      <div class="card" style="margin-bottom:16px"><div class="card-h"><h2>Configured tunnels</h2></div>${tunnelsTable}</div>
      ${logCard}`,
  };
}

export function renderConnectedDevices(data: OpsPageData, _options: OpsRenderOptions): { title: string; subtitle: string; body: string } {
  const { config, snapshot, devices } = data;
  const connected = devices.filter((device) => device.status === "connected");
  const disconnected = devices.filter((device) => device.status !== "connected");

  const unavailable = !config.accountId || !config.apiToken;
  const banner = unavailable
    ? notice(
        "info",
        "Live device data needs a Cloudflare API token",
        "Connected devices are read from Cloudflare's tunnel connection list, so an account ID and an API token with <strong>Cloudflare Tunnel: Read</strong> are required. Save them on the <a href=\"/settings\">Service Settings</a> page."
      )
    : snapshot.error
      ? notice("error", "Could not read connections from Cloudflare", `${esc(snapshot.error.message)}${snapshot.error.hint ? `<br /><span class="muted">${esc(snapshot.error.hint)}</span>` : ""}`)
      : "";

  const rows = devices
    .map(
      (device) => `<tr>
      <td><strong>${esc(device.label || device.device_key)}</strong><div class="mono muted">${esc(device.device_key)}</div></td>
      <td class="mono">${esc(device.origin_ip || "—")}</td>
      <td class="mono">${esc(device.client_version || "—")}</td>
      <td class="mono">${esc(device.colo || "—")}</td>
      <td>${statusBadge(device.status)}</td>
      <td class="mono">${esc(formatRelative(device.last_seen))}</td>
      <td class="mono">${esc(formatDateTime(device.first_seen))}</td>
    </tr>`
    )
    .join("");

  const body = `${banner}
    <div class="grid">
      ${statCard("Connected now", esc(formatNumber(connected.length)), "connector connections reported by Cloudflare")}
      ${statCard("Disconnected", esc(formatNumber(disconnected.length)), "previously seen connectors now offline")}
      ${statCard("Tunnel", esc(snapshot.tunnelName), esc(snapshot.tunnelId || "id resolved on next check"))}
    </div>
    <div class="card">
      <div class="card-h"><h2>Devices on this tunnel</h2><span class="muted">refreshed on each health check</span></div>
      ${
        devices.length > 0
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Device</th><th>Origin IP</th><th>Client</th><th>Colo</th><th>Status</th><th>Last seen</th><th>First seen</th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`
          : emptyState(
              "No devices reported",
              unavailable
                ? "Add a Cloudflare API token and run a health check to populate this list."
                : "Cloudflare reports no connector connections for this tunnel right now."
            )
      }
    </div>`;

  return {
    title: "Connected Devices",
    subtitle: "Connector connections currently reported for your tunnel.",
    body,
  };
}

export function renderTrafficStats(data: OpsPageData, options: OpsRenderOptions): { title: string; subtitle: string; body: string } {
  const windowHours = options.windowHours || 24;
  const totals = windowHours === 168 ? data.traffic7d : data.traffic24h;
  const windowLabel = windowHours === 1 ? "last hour" : windowHours === 168 ? "last 7 days" : "last 24 hours";
  const chart = renderTrafficChart(data.traffic);

  const rangeLinks = [1, 24, 168]
    .map(
      (hours) =>
        `<a class="btn small${hours === windowHours ? " primary" : ""}" href="/traffic-stats?window=${hours}">${
          hours === 1 ? "1h" : hours === 24 ? "24h" : "7d"
        }</a>`
    )
    .join("");

  const emptyReason =
    options.monitorMessage ||
    (!data.control.running
      ? "Traffic metrics are collected from the local cloudflared connector. Start it on the Tunnel Manager page to begin sampling."
      : "No samples recorded in this window yet — samples are taken automatically every minute while the connector runs.");

  const sampleRows = data.traffic
    .slice(-12)
    .reverse()
    .map(
      (sample) => `<tr>
      <td class="mono">${esc(formatDateTime(sample.sampled_at))}</td>
      <td class="mono">${formatBytes(sample.bytes_in)}</td>
      <td class="mono">${formatBytes(sample.bytes_out)}</td>
      <td class="mono">${esc(formatNumber(sample.requests))}</td>
      <td class="mono">${esc(formatNumber(sample.errors))}</td>
    </tr>`
    )
    .join("");

  const body = `<div class="toolbar"><div class="row-actions">${rangeLinks}</div><span class="muted">Showing ${esc(windowLabel)} · ${totals.samples} samples · last ${esc(formatRelative(totals.lastSampledAt))}</span></div>
    <div class="grid">
      ${statCard("Ingress", formatBytes(totals.bytesIn), esc(windowLabel))}
      ${statCard("Egress", formatBytes(totals.bytesOut), esc(windowLabel))}
      ${statCard("Requests", esc(formatNumber(totals.requests)), `${esc(formatNumber(totals.errors))} errors`)}
      ${statCard("Sampling", totals.samples > 0 ? "active" : "idle", data.control.running ? "connector running" : "connector stopped")}
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-h"><h2>Ingress and egress</h2><span class="muted">bytes per interval</span></div>
      ${chart || emptyState("No traffic data yet", emptyReason)}
    </div>
    <div class="card">
      <div class="card-h"><h2>Recent samples</h2><span class="muted">from cloudflared metrics</span></div>
      ${
        data.traffic.length > 0
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Sampled</th><th>Ingress</th><th>Egress</th><th>Requests</th><th>Errors</th></tr></thead>
              <tbody>${sampleRows}</tbody>
            </table></div>`
          : emptyState("No samples yet", emptyReason)
      }
    </div>`;

  return {
    title: "Traffic Statistics",
    subtitle: "Ingress and egress measured from the connector's own metrics.",
    body,
  };
}
