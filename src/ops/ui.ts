/** Shared chrome and primitives for the cloudflared operations pages. */

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return esc(iso);
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const diff = Date.now() - date.getTime();
  if (diff < 45_000) return "just now";
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function formatDuration(startIso: string | null | undefined): string {
  if (!startIso) return "—";
  const started = new Date(startIso).getTime();
  if (!Number.isFinite(started)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function statusBadge(status: string | null | undefined): string {
  const value = (status || "unknown").toLowerCase();
  const map: Record<string, { label: string; tone: string }> = {
    up: { label: "Up", tone: "ok" },
    healthy: { label: "Healthy", tone: "ok" },
    connected: { label: "Connected", tone: "ok" },
    sent: { label: "Sent", tone: "ok" },
    degraded: { label: "Degraded", tone: "warn" },
    down: { label: "Down", tone: "bad" },
    disconnected: { label: "Disconnected", tone: "bad" },
    failed: { label: "Failed", tone: "bad" },
    error: { label: "Error", tone: "bad" },
    warn: { label: "Warning", tone: "warn" },
    info: { label: "Info", tone: "neutral" },
    unknown: { label: "Unknown", tone: "neutral" },
    skipped: { label: "Skipped", tone: "neutral" },
  };
  const entry = map[value] || { label: value, tone: "neutral" };
  return `<span class="badge ${entry.tone}">${esc(entry.label)}</span>`;
}

export function notice(kind: "info" | "warn" | "error" | "success", title: string, body: string): string {
  return `<div class="notice ${kind}"><strong>${esc(title)}</strong><div>${body}</div></div>`;
}

export function emptyState(title: string, description: string): string {
  return `<div class="empty"><strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;
}

const NAV_ITEMS: Array<{ href: string; label: string; short: string }> = [
  { href: "/dashboard", label: "Bot Dashboard", short: "Dashboard" },
  { href: "/tunnel-manager", label: "Tunnel Manager", short: "Tunnels" },
  { href: "/connected-devices", label: "Connected Devices", short: "Devices" },
  { href: "/traffic-stats", label: "Traffic Statistics", short: "Traffic" },
  { href: "/activity-logs", label: "Activity Logs", short: "Activity" },
  { href: "/access-controls", label: "Access Controls", short: "Access" },
  { href: "/notifications", label: "Notification Alerts", short: "Alerts" },
  { href: "/settings", label: "Service Settings", short: "Settings" },
];

export function opsNav(activePath: string): string {
  const links = NAV_ITEMS.map(
    (item) =>
      `<a class="nav-link${activePath === item.href ? " active" : ""}" href="${item.href}"${
        activePath === item.href ? ' aria-current="page"' : ""
      }>${esc(item.short)}</a>`
  ).join("");
  return `<header class="ops-nav">
  <div class="wrap navin">
    <a class="brand" href="/" aria-label="Fast xBet Cash home"><span class="dot"></span>Fast xBet <span class="brand-sub">Ops</span></a>
    <nav class="links" aria-label="Operations navigation">${links}</nav>
  </div>
</header>`;
}

export interface LayoutInput {
  title: string;
  subtitle: string;
  path: string;
  nonce: string;
  body: string;
  isAdmin: boolean;
  flash?: { kind: "success" | "error" | "info"; message: string } | null;
  autoRefresh?: boolean;
}

export function opsLayout(input: LayoutInput): string {
  const flash = input.flash
    ? notice(input.flash.kind, input.flash.kind === "error" ? "Action failed" : "Done", esc(input.flash.message))
    : "";
  const session = input.isAdmin
    ? `<span class="session ok">Admin session active</span>`
    : `<span class="session">Read-only view</span>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(input.title)} · Fast xBet Ops</title>
<meta name="robots" content="noindex, nofollow" />
<style nonce="${input.nonce}">${OPS_CSS}</style>
</head>
<body>
${opsNav(input.path)}
<main class="wrap page">
  <div class="page-head">
    <div>
      <h1>${esc(input.title)}</h1>
      <p class="muted">${esc(input.subtitle)}</p>
    </div>
    <div class="head-meta">${session}</div>
  </div>
  ${flash}
  ${input.body}
</main>
<footer class="wrap foot">
  <span>Cloudflared operations · data shown is read from Cloudflare, the local connector and this app's own records.</span>
  <a href="/">← Back to site</a>
</footer>
</body>
</html>`;
}

/** Read-only banner with an inline admin sign-in form for mutating pages. */
export function signInPrompt(path: string, what: string): string {
  return `<div class="notice info">
  <strong>Read-only view</strong>
  <div>${esc(what)} needs an admin session. Sign in with your admin secret to continue.</div>
  <form method="POST" action="/admin/login" class="inline-form">
    <input type="hidden" name="next" value="${esc(path)}" />
    <label class="sr" for="admin-secret">Admin secret</label>
    <input id="admin-secret" type="password" name="secret" autocomplete="current-password" placeholder="Admin secret" required />
    <button class="btn primary" type="submit">Sign in</button>
  </form>
</div>`;
}

export const OPS_CSS = `
:root{--bg:#070b12;--panel:#0d1420;--panel2:#111a28;--border:#1e2a3d;--text:#e6edf7;--muted:#8b9bb4;--accent:#00e676;--accent-dim:#00b45c;--warn:#f5a524;--bad:#ff5d5d;--info:#4da3ff}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:radial-gradient(1200px 600px at 50% -200px,#0d2030 0%,var(--bg) 55%) no-repeat,var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{width:100%;max-width:1180px;margin:0 auto;padding:0 18px}
.ops-nav{position:sticky;top:0;z-index:40;background:#070b12ee;backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}
.navin{display:flex;align-items:center;gap:16px;min-height:62px}
.brand{display:flex;align-items:center;gap:8px;font-weight:800;color:var(--text);letter-spacing:.2px;white-space:nowrap}
.brand:hover{text-decoration:none}
.brand .dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
.brand-sub{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.12em}
.links{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1;padding:6px 0}
.links::-webkit-scrollbar{display:none}
.nav-link{color:var(--muted);font-size:13.5px;font-weight:600;padding:7px 10px;border-radius:8px;white-space:nowrap;border:1px solid transparent}
.nav-link:hover{color:var(--text);background:#ffffff0d;text-decoration:none}
.nav-link.active{color:#04120a;background:var(--accent);border-color:var(--accent)}
.page{padding:26px 18px 40px}
.page-head{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px}
h1{font-size:26px;line-height:1.2;margin:0 0 6px;letter-spacing:-.3px}
h2{font-size:16px;margin:0;letter-spacing:-.1px}
h3{font-size:14px;margin:0 0 6px;letter-spacing:.02em}
.muted{color:var(--muted);margin:0;font-size:13.5px}
.session{font-size:12px;font-weight:700;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:5px 11px;white-space:nowrap}
.session.ok{color:var(--accent);border-color:#00e67655;background:#00e67612}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));margin-bottom:18px}
.card{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--border);border-radius:14px;padding:16px}
.card-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.stat-label{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:700}
.stat-value{font-size:26px;font-weight:800;letter-spacing:-.5px;margin:6px 0 2px;word-break:break-word}
.stat-sub{font-size:12.5px;color:var(--muted)}
.badge{display:inline-block;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:3px 9px;border-radius:999px;border:1px solid}
.badge.ok{color:var(--accent);border-color:#00e67655;background:#00e67614}
.badge.warn{color:var(--warn);border-color:#f5a52455;background:#f5a52414}
.badge.bad{color:var(--bad);border-color:#ff5d5d55;background:#ff5d5d14}
.badge.neutral{color:var(--muted);border-color:var(--border);background:#ffffff08}
.notice{border:1px solid var(--border);border-left-width:4px;border-radius:12px;padding:13px 15px;margin:0 0 16px;background:var(--panel);font-size:14px}
.notice strong{display:block;margin-bottom:3px;font-size:14px}
.notice>div{color:var(--muted)}
.notice.info{border-left-color:var(--info)}
.notice.warn{border-left-color:var(--warn)}
.notice.error{border-left-color:var(--bad)}
.notice.success{border-left-color:var(--accent)}
.inline-form{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
.empty{border:1px dashed var(--border);border-radius:12px;padding:22px;text-align:center;color:var(--muted);font-size:14px}
.empty strong{display:block;color:var(--text);margin-bottom:4px;font-size:14.5px}
.empty p{margin:0}
.table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--panel)}
table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:520px}
th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:10px 12px;border-bottom:1px solid var(--border);white-space:nowrap;background:#0b1220}
td{padding:10px 12px;border-bottom:1px solid #16202f;vertical-align:top}
tr:last-child td{border-bottom:none}
td.mono,.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
.kv{display:grid;grid-template-columns:minmax(120px,auto) 1fr;gap:6px 14px;font-size:13.5px}
.kv dt{color:var(--muted)}
.kv dd{margin:0;word-break:break-word}
.btn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:13.5px;font-weight:700;padding:8px 14px;border-radius:9px;border:1px solid var(--border);background:#ffffff0d;color:var(--text);cursor:pointer;text-decoration:none}
.btn:hover{background:#ffffff17;text-decoration:none}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#04120a}
.btn.primary:hover{background:var(--accent-dim)}
.btn.danger{background:#ff5d5d18;border-color:#ff5d5d55;color:#ff8a8a}
.btn.small{padding:5px 10px;font-size:12.5px}
.btn[disabled]{opacity:.45;cursor:not-allowed}
.row-actions{display:flex;gap:6px;flex-wrap:wrap}
form.stack{display:grid;gap:12px}
.two-col{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.field{display:grid;gap:5px}
.field label{font-size:12.5px;font-weight:700;color:var(--muted)}
.field .hint{font-size:12px;color:var(--muted)}
input[type=text],input[type=password],input[type=url],input[type=number],select,textarea{width:100%;background:#050a12;border:1px solid var(--border);border-radius:9px;color:var(--text);padding:9px 11px;font:inherit;font-size:14px}
input:focus,select:focus,textarea:focus{outline:2px solid #00e67644;border-color:var(--accent-dim)}
textarea{min-height:74px;resize:vertical}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px}
.toolbar .field{min-width:150px}
pre.log{margin:0;background:#04080f;border:1px solid var(--border);border-radius:12px;padding:12px;font-size:12px;line-height:1.5;max-height:260px;overflow:auto;color:#b9c7dd;white-space:pre-wrap;word-break:break-word}
details summary{cursor:pointer;color:var(--muted);font-size:12.5px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.chart{width:100%;height:auto;display:block;margin:0}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--muted);margin-top:8px}
.legend span{display:inline-flex;align-items:center;gap:6px}
.swatch{width:10px;height:10px;border-radius:3px;display:inline-block}
.foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:18px;color:var(--muted);font-size:12.5px;border-top:1px solid var(--border);margin-top:20px}
.stack-16{display:grid;gap:16px}
@media(max-width:640px){
h1{font-size:22px}
.page{padding:18px 14px 32px}
.stat-value{font-size:22px}
.kv{grid-template-columns:1fr}
.foot{padding:16px 14px}
}
`;
