import type { Env, SystemStats, DailyTrendItem } from "./types";
import type { R2StorageAnalytics } from "./r2";
import { renderTrendsChartSvg } from "./adminChart";
import { BRAND_LOGO_SVG_COMPACT, BRAND_LOGO_FAVICON_DATA_URI } from "./brandLogo";

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return escapeAttribute(value);
}

export interface AdminPageData {
  stats: SystemStats;
  trends: DailyTrendItem[];
  days: number;
  metric: "volume" | "count";
  isAuthorized: boolean;
  r2Analytics?: R2StorageAnalytics;
  tickets?: any[];
  alerts?: any[];
  tips?: any[];
  paymentMethods?: {
    bank: string;
    ezcash: string;
    mcash: string;
    frimi: string;
    ipay: string;
    whatsapp: string;
  };
}

/**
 * Rendered for unauthenticated /admin visitors. Deliberately contains no
 * stats, trends, tickets, alerts, or payment-method data — only a secret
 * entry form — so that anonymous visitors cannot view business/financial
 * information just by navigating to /admin.
 */
export function renderAdminLoginPage(
  env: Env,
  nonce?: string,
  options: { error?: string } = {}
): string {
  const nonceAttr = nonce ? ` nonce="${escapeAttribute(nonce)}"` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Admin Login — Fast xBet Cash</title>
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#070b12">
  <link rel="icon" type="image/svg+xml" href="${BRAND_LOGO_FAVICON_DATA_URI}">
  <style${nonceAttr}>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #070b12; color: #f1f5f9;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    }
    .login-card {
      width: min(100% - 32px, 400px);
      background: radial-gradient(circle at 50% -20%, rgba(56, 189, 248, 0.14) 0%, transparent 65%), linear-gradient(145deg, #0d1726, #070d17);
      border: 1px solid rgba(56, 189, 248, 0.28);
      border-radius: 20px;
      padding: 36px 30px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .login-card h1 { font-size: 20px; font-weight: 800; margin: 14px 0 6px; color: #ffffff; }
    .login-card p { font-size: 13px; color: #94a3b8; margin: 0 0 22px; }
    .form-field { text-align:left; margin-bottom:12px; }
    .form-field label { display:block; margin-bottom:7px; color:#cbd5e1; font-size:13px; font-weight:700; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    .login-card input {
      width: 100%; padding: 12px 14px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.35);
      color: #f1f5f9; font-size: 14px; margin-bottom: 12px;
      transition: border-color 0.2s;
    }
    .login-card input:focus { border-color: #38bdf8; box-shadow: 0 0 12px rgba(56,189,248,0.25); }
    .login-card input:focus-visible { outline: 3px solid rgba(56, 189, 248, 0.9); outline-offset: 3px; }
    .login-card button {
      width: 100%; padding: 12px 14px; border-radius: 10px; border: none;
      background: #00e676; color: #04130b; font-weight: 800; font-size: 14px; cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .login-card button:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,230,118,0.3); }
    .login-card a { display: inline-block; margin-top: 16px; font-size: 12px; color: #64748b; text-decoration: none; }
    @media (max-width: 640px) {
      body { padding: 16px 12px; }
      .login-card { width: 100%; padding: 24px 16px; border-radius: 12px; }
    }
  </style>
</head>
<body>
  <div class="login-card">
    <span style="width:40px; height:40px; display:inline-flex; border-radius:10px; overflow:hidden;">${BRAND_LOGO_SVG_COMPACT}</span>
    <h1>Admin Login</h1>
    <p>Enter the admin secret to view the dashboard.</p>
    ${options.error ? `<p style="color:#f87171; font-size:13px;">${escapeAttribute(options.error)}</p>` : ""}
    <form id="admin-secret-form" method="POST" action="/admin/login">
      <div class="form-field">
        <label for="admin-secret-input">Admin secret</label>
        <input type="password" name="secret" class="auth-input" id="admin-secret-input" placeholder="Enter ADMIN_API_SECRET..." autocomplete="current-password" aria-describedby="admin-secret-help" required>
        <p id="admin-secret-help" class="sr-only">Enter the administrator secret to access the dashboard.</p>
      </div>
      <button type="submit" id="btn-apply-secret">Sign In</button>
    </form>
    <a href="/">← Back to public website</a>
  </div>
</body>
</html>`;
}

export function renderAdminPage(
  env: Env,
  request: Request,
  data: AdminPageData,
  nonce?: string
): string {
  const nonceAttr = nonce ? ` nonce="${escapeAttribute(nonce)}"` : "";
  const { stats, trends, days, metric, isAuthorized, tickets = [], alerts = [], r2Analytics } = data;
  const r2 = r2Analytics || {
    configured: false,
    bucket: "chat-media",
    receiptsCount: 0,
    receiptsTotalBytes: 0,
    receiptsFormattedSize: "0 B",
    lastReceiptUploadedAt: null,
    logsCount: 0,
    logsTotalBytes: 0,
    logsFormattedSize: "0 B",
    totalObjects: 0,
    totalStorageBytes: 0,
    totalFormattedSize: "0 B",
    timestamp: new Date().toISOString(),
  };
  const r2Configured = Boolean(r2.configured);

  const chartSvg = renderTrendsChartSvg(trends, { metric });

  const totalDepVol = trends.reduce((sum, d) => sum + d.depositVolume, 0);
  const totalWdVol = trends.reduce((sum, d) => sum + d.withdrawalVolume, 0);
  const netTrendVol = totalDepVol - totalWdVol;
  const totalTxs = trends.reduce((sum, d) => sum + d.totalTransactions, 0);

  // Table rows for daily trend details
  const tableRows = trends
    .slice()
    .reverse()
    .map((d) => {
      const net = d.approvedDepositVolume - d.approvedWithdrawalVolume;
      const netClass = net >= 0 ? "text-emerald-400" : "text-rose-400";
      const netSign = net >= 0 ? "+" : "";

      return `
        <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
          <td class="py-3 px-4 text-sm font-medium text-slate-200">${escapeText(d.label)} <span class="text-xs text-slate-500 font-mono">(${escapeText(d.date)})</span></td>
          <td class="py-3 px-4 text-sm text-right font-mono text-emerald-400">
            LKR ${d.depositVolume.toLocaleString()}
            <span class="text-xs text-slate-400 ml-1">(${d.depositCount} txs)</span>
          </td>
          <td class="py-3 px-4 text-sm text-right font-mono text-amber-400">
            LKR ${d.withdrawalVolume.toLocaleString()}
            <span class="text-xs text-slate-400 ml-1">(${d.withdrawalCount} txs)</span>
          </td>
          <td class="py-3 px-4 text-sm text-right font-mono font-semibold ${netClass}">
            ${netSign}LKR ${Math.abs(net).toLocaleString()}
          </td>
          <td class="py-3 px-4 text-sm text-center">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              ${d.totalTransactions} total
            </span>
          </td>
        </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Admin Dashboard — Fast xBet Cash</title>
  <meta name="description" content="Operational admin panel and financial trend monitoring for Fast xBet Cash Telegram bot.">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#070b12">
  <link rel="icon" type="image/svg+xml" href="${BRAND_LOGO_FAVICON_DATA_URI}">
  <link rel="alternate icon" type="image/png" sizes="32x32" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="192x192" href="/logo.png">
  <style${nonceAttr}>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #070b12;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 24px 16px;
      min-height: 100vh;
    }
    .container {
      max-width: 1180px;
      margin: 0 auto;
    }
    /* Layout Cards */
    .card {
      background-color: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .header-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      margin-bottom: 24px;
      background: radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.09) 0%, transparent 50%), linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(11, 18, 32, 0.98));
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.28);
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #10b981;
    }
    /* Button Controls */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width:44px;
      min-height:44px;
      padding:10px 16px;
      font-size:13px;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .btn-secondary {
      background-color: #1e293b;
      color: #cbd5e1;
      border-color: rgba(255, 255, 255, 0.1);
    }
    .btn-secondary:hover {
      background-color: #334155;
      color: #fff;
    }
    .btn-primary {
      background-color: #10b981;
      color: #042f2e;
    }
    .btn-primary:hover {
      background-color: #059669;
      color: #fff;
    }
    .btn-tab {
      min-width:44px;
      min-height:44px;
      padding:9px 14px;
      font-size: 12px;
      border-radius: 6px;
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .btn-tab.active {
      background: #00e676;
      color: #070b12;
      font-weight: 700;
      border-color: #00e676;
    }
    /* Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .r2-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 14px;
    }
    .r2-stat-card {
      background: #070b12;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 16px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .r2-stat-card:hover {
      border-color: rgba(56, 189, 248, 0.35);
    }
    .polling-control-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .polling-select {
      background: #070b12;
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 12px;
      cursor: pointer;
    }
    .polling-select:focus { border-color:#38bdf8; }
    .polling-select:focus-visible { outline:3px solid rgba(56,189,248,.9); outline-offset:2px; }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spinning {
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes pulse-border {
      0% { border-color: rgba(56, 189, 248, 0.8); box-shadow: 0 0 12px rgba(56, 189, 248, 0.3); }
      100% { border-color: rgba(255, 255, 255, 0.08); box-shadow: none; }
    }
    .flash-highlight {
      animation: pulse-border 1s ease-out;
    }
    .botfather-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .payment-methods-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .operational-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }
    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .chart-toggles-wrap {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .trend-summary-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: space-between;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 12px;
      color: #94a3b8;
    }
    .kit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    .kit-header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .kpi-card {
      background-color: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 20px;
    }
    .kpi-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 26px;
      font-weight: 800;
      font-family: monospace;
      color: #f8fafc;
      margin-bottom: 4px;
    }
    .kpi-sub {
      font-size: 12px;
      color: #64748b;
    }
    /* Chart Section */
    .chart-box {
      background-color: #0c1424;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      margin-top: 16px;
      position: relative;
    }
    .chart-controls {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .controls-group {
      display: flex;
      gap: 6px;
      background: #070b12;
      padding: 4px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    /* Table */
    .table-container {
      overflow-x: auto;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(15, 23, 42, 0.6);
    }
    td {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    /* Auth Form */
    .auth-banner {
      background: linear-gradient(135deg, rgba(14, 26, 44, 0.9), rgba(10, 19, 32, 0.95));
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .auth-input {
      background: #070b12;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 13px;
      color: #fff;
      font-family: monospace;
      min-width: 260px;
    }

    /* Responsive CSS Media Queries: Shift multi-column layouts to single-column on mobile devices */
    @media (max-width: 768px) {
      body {
        padding: 16px 12px;
      }
      .card {
        padding: 18px 14px;
        border-radius: 12px;
        margin-bottom: 18px;
      }
      .header-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 14px;
        padding-bottom: 16px;
        margin-bottom: 18px;
      }
      .header-actions {
        flex-direction: column;
        width: 100%;
        gap: 8px;
      }
      .header-actions .btn {
        width: 100%;
      }
      .auth-banner {
        flex-direction: column;
        align-items: stretch;
        padding: 14px;
        gap: 12px;
      }
      .auth-banner form {
        flex-direction: column;
        width: 100%;
      }
      .auth-input {
        min-width: 0;
        width: 100%;
      }
      .auth-banner button {
        width: 100%;
      }
      /* Shift all dashboard grids from multi-column to single-column */
      .kpi-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .r2-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .polling-control-row {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        gap: 8px;
      }
      .polling-select {
        width: 100%;
      }
      #btn-manual-poll {
        width: 100%;
        justify-content: center;
      }
      .botfather-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .payment-methods-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .operational-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      /* Chart controls & summary */
      .chart-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      .chart-toggles-wrap {
        flex-direction: column;
        width: 100%;
        gap: 8px;
      }
      .controls-group {
        width: 100%;
        display: flex;
        justify-content: stretch;
      }
      .controls-group .btn-tab {
        flex: 1;
        text-align: center;
      }
      .trend-summary-row {
        flex-direction: column;
        gap: 8px;
      }
      .kit-header {
        flex-direction: column;
        align-items: stretch;
      }
      .kit-header-actions {
        flex-direction: column;
        width: 100%;
      }
      .kit-header-actions .btn-tab {
        width: 100%;
        justify-content: center;
      }
      .table-container {
        margin-top: 14px;
      }
      table th, table td {
        padding: 10px 10px;
        font-size: 12px;
      }
    }

    @media (max-width: 480px) {
      body {
        padding: 12px 8px;
      }
      .card {
        padding: 14px 10px;
        border-radius: 10px;
      }
      .kpi-card {
        padding: 14px 12px;
      }
      .kpi-value {
        font-size: 22px;
      }
      .chart-box {
        padding: 12px 6px;
      }
    }
  
    @media (prefers-reduced-motion: reduce) {
      *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; scroll-behavior:auto!important; }
      .spinning,.flash-highlight { animation:none!important; }
    }
</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header-bar" id="admin-header">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
          <span style="width:32px; height:32px; display:inline-flex; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,180,248,0.35); flex-shrink:0;">${BRAND_LOGO_SVG_COMPACT}</span>
          <h1 style="font-size: 22px; font-weight: 800; color: #f8fafc;">Fast xBet Cash — Admin Panel</h1>
          <span class="badge" id="sys-badge"><span class="badge-dot"></span> System Live</span>
          <span class="badge" id="admin-bot-badge" style="background:rgba(250,204,21,0.12); color:#facc15; border-color:rgba(250,204,21,0.3); cursor:pointer;" title="Click to test Telegram Bot API ping"><span class="badge-dot" id="admin-bot-dot" style="background:#facc15;"></span> <span id="admin-bot-text">Bot: Checking...</span></span>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">Financial integrity monitor, Telegram agent stats &amp; D3.js trend analytics</p>
      </div>

      <div class="header-actions">
        <a href="/" class="btn btn-secondary" id="btn-back-home">← Public Website</a>
        <a href="https://t.me/${escapeAttribute((env.BOT_USERNAME || "fast_1xbetcash_bot").replace(/^@/, ""))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" id="btn-open-bot">🚀 Open Bot</a>
      </div>
    </header>

    <!-- Optional Admin Key Bar -->
    <div class="auth-banner" id="auth-section">
      <div style="font-size: 13px; color: #cbd5e1;">
        <strong style="color: #38bdf8;">Admin API Access:</strong> 
        ${isAuthorized ? '<span style="color: #10b981; font-weight: 600;">Authenticated Session Active</span>' : 'Preview Mode Active. Enter secret for direct API write controls.'}
      </div>
      <form id="admin-secret-form" style="display: flex; gap: 8px;" method="POST" action="${isAuthorized ? "/admin/logout" : "/admin/login"}">
        ${isAuthorized ? "" : `<input type="password" name="secret" class="auth-input" id="admin-secret-input" placeholder="Enter ADMIN_API_SECRET..." value="" autocomplete="current-password">`}
        <button type="submit" class="btn btn-secondary" id="btn-apply-secret">${isAuthorized ? "Sign Out" : "Sign In"}</button>
      </form>
    </div>

    <!-- KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card" id="kpi-users">
        <div class="kpi-label">👥 Total Users</div>
        <div class="kpi-value">${stats.totalUsers.toLocaleString()}</div>
        <div class="kpi-sub">+${stats.todayUsers.toLocaleString()} today</div>
      </div>

      <div class="kpi-card" id="kpi-deposits">
        <div class="kpi-label" style="color: #34d399;">💰 Approved Deposits</div>
        <div class="kpi-value" style="color: #10b981;">LKR ${stats.approvedDepositsVolume.toLocaleString()}</div>
        <div class="kpi-sub">${stats.approvedDepositsCount.toLocaleString()} approved · ${stats.pendingDeposits} pending</div>
      </div>

      <div class="kpi-card" id="kpi-withdrawals">
        <div class="kpi-label" style="color: #fbbf24;">💸 Approved Withdrawals</div>
        <div class="kpi-value" style="color: #f59e0b;">LKR ${stats.approvedWithdrawalsVolume.toLocaleString()}</div>
        <div class="kpi-sub">${stats.approvedWithdrawalsCount.toLocaleString()} approved · ${stats.pendingWithdrawals} pending</div>
      </div>

      <div class="kpi-card" id="kpi-net">
        <div class="kpi-label" style="color: #38bdf8;">⚖️ Net Cashflow</div>
        <div class="kpi-value" style="color: ${stats.approvedDepositsVolume >= stats.approvedWithdrawalsVolume ? '#10b981' : '#f43f5e'};">
          LKR ${(stats.approvedDepositsVolume - stats.approvedWithdrawalsVolume).toLocaleString()}
        </div>
        <div class="kpi-sub">Today Deposits: LKR ${stats.todayDepositsVolume.toLocaleString()}</div>
      </div>
    </div>

    <!-- Cloudflare R2 Analytics & Polling Dashboard Section -->
    <section class="card" id="section-r2-analytics" style="margin-bottom: 24px; border: 1px solid rgba(56, 189, 248, 0.2); background: linear-gradient(145deg, #0b1322, #070b13);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 4px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #38bdf8; margin: 0; display: flex; align-items: center; gap: 8px;">
              ☁️ Cloudflare R2 Storage &amp; Receipt Analytics
            </h2>
            <span class="badge" id="r2-engine-badge" style="background: ${r2Configured ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; color: ${r2Configured ? '#10b981' : '#f59e0b'}; border-color: ${r2Configured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'};">
              <span class="badge-dot" id="r2-engine-dot" style="background: ${r2Configured ? '#10b981' : '#f59e0b'};"></span>
              <span id="r2-engine-status">${r2Configured ? 'R2 Connected' : 'R2 Standby'}</span>
            </span>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            Receipt image storage telemetry, audit logs footprint &amp; live polling engine
          </p>
        </div>

        <!-- Polling Controls & Real-Time Sync Indicator -->
        <div class="polling-control-row">
          <span class="badge" id="polling-status-badge" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border-color: rgba(16, 185, 129, 0.25);">
            <span class="badge-dot" id="polling-dot" style="background: #10b981;"></span>
            <span id="polling-status-text">Auto-Poll: 15s</span>
          </span>

          <label style="font-size: 11px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
            Poll:
            <select id="polling-interval-select" class="polling-select">
              <option value="10000">10s</option>
              <option value="15000" selected>15s</option>
              <option value="30000">30s</option>
              <option value="60000">60s</option>
              <option value="0">Paused</option>
            </select>
          </label>

          <button type="button" id="btn-manual-poll" class="btn btn-secondary" style="padding: 5px 12px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <span id="poll-spinner-icon" style="display: inline-block;">🔄</span> Refresh Now
          </button>
        </div>
      </div>

      <div class="r2-grid" id="r2-metrics-grid">
        <!-- Metric 1: Backed Up Receipts -->
        <div class="r2-stat-card" id="card-r2-receipts">
          <div class="kpi-label" style="color: #38bdf8;">🧾 Stored Deposit Receipts</div>
          <div class="kpi-value" id="r2-receipts-count" style="color: #38bdf8; font-size: 24px;">${r2.receiptsCount.toLocaleString()}</div>
          <div class="kpi-sub" id="r2-receipts-size">${r2.receiptsFormattedSize} verified slips</div>
        </div>

        <!-- Metric 2: Total Storage Footprint -->
        <div class="r2-stat-card" id="card-r2-storage">
          <div class="kpi-label" style="color: #10b981;">💾 Total Bucket Footprint</div>
          <div class="kpi-value" id="r2-total-size" style="color: #10b981; font-size: 24px;">${r2.totalFormattedSize}</div>
          <div class="kpi-sub" id="r2-total-objects">${r2.totalObjects.toLocaleString()} objects (slips + logs)</div>
        </div>

        <!-- Metric 3: Target Bucket -->
        <div class="r2-stat-card" id="card-r2-bucket">
          <div class="kpi-label" style="color: #fbbf24;">🪣 Target R2 Bucket</div>
          <div class="kpi-value" id="r2-bucket-name" style="color: #f8fafc; font-size: 18px; word-break: break-all;">${escapeText(r2.bucket)}</div>
          <div class="kpi-sub" id="r2-engine-sub">${r2Configured ? 'Direct binding active' : 'Fallback / Unconfigured'}</div>
        </div>

        <!-- Metric 4: Latest Upload & Sync Timestamp -->
        <div class="r2-stat-card" id="card-r2-backup">
          <div class="kpi-label" style="color: #a855f7;">⏱️ Latest Storage Activity</div>
          <div class="kpi-value" id="r2-last-upload" style="color: #e2e8f0; font-size: 15px; font-weight: 700;">
            ${r2.lastReceiptUploadedAt ? new Date(r2.lastReceiptUploadedAt).toLocaleTimeString() : 'No uploads yet'}
          </div>
          <div class="kpi-sub" id="r2-last-sync-time">Last synced: Just now</div>
        </div>
      </div>
    </section>

    <!-- Main Chart Card (D3.js Visualization) -->
    <section class="card" id="section-trends">
      <div class="chart-controls">
        <div>
          <h2 style="font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 2px;">
            📈 Daily Deposit &amp; Withdrawal Trends
          </h2>
          <p style="font-size: 12px; color: #94a3b8;">
            Rendered with D3.js · Dual-series visualization tracking deposit velocity vs withdrawal demand
          </p>
        </div>

        <div class="chart-toggles-wrap">
          <!-- Metric Mode Switcher -->
          <div class="controls-group" id="metric-toggles">
            <a href="?days=${days}&metric=volume" class="btn-tab ${metric === 'volume' ? 'active' : ''}" id="toggle-metric-vol">LKR Volume</a>
            <a href="?days=${days}&metric=count" class="btn-tab ${metric === 'count' ? 'active' : ''}" id="toggle-metric-count">Tx Count</a>
          </div>

          <!-- Date Window Switcher -->
          <div class="controls-group" id="window-toggles">
            <a href="?days=7&metric=${metric}" class="btn-tab ${days === 7 ? 'active' : ''}" id="toggle-window-7d">7 Days</a>
            <a href="?days=14&metric=${metric}" class="btn-tab ${days === 14 ? 'active' : ''}" id="toggle-window-14d">14 Days</a>
            <a href="?days=30&metric=${metric}" class="btn-tab ${days === 30 ? 'active' : ''}" id="toggle-window-30d">30 Days</a>
          </div>
        </div>
      </div>

      <!-- D3 Chart Render Container -->
      <div class="chart-box" id="d3-chart-container">
        ${chartSvg}
      </div>

      <!-- Trend Summary Stats Row -->
      <div class="trend-summary-row">
        <div>Window Period: <strong style="color: #f1f5f9;" id="summary-window-period">Last ${trends.length} days</strong></div>
        <div>Total Window Deposits: <strong style="color: #10b981;" id="summary-dep-vol">LKR ${totalDepVol.toLocaleString()}</strong></div>
        <div>Total Window Withdrawals: <strong style="color: #f59e0b;" id="summary-wd-vol">LKR ${totalWdVol.toLocaleString()}</strong></div>
        <div>Window Net Cashflow: <strong style="color: ${netTrendVol >= 0 ? '#10b981' : '#f43f5e'};" id="summary-net-vol">${netTrendVol >= 0 ? '+' : ''}LKR ${netTrendVol.toLocaleString()}</strong></div>
        <div>Total Activity: <strong style="color: #38bdf8;" id="summary-activity">${totalTxs} transactions</strong></div>
      </div>

      <!-- Detailed Day-by-Day Table -->
      <div class="table-container">
        <h3 style="font-size: 14px; font-weight: 700; color: #cbd5e1; margin-bottom: 12px; margin-top: 16px;">
          📊 Detailed Daily Breakdown
        </h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th style="text-align: right;">Deposits (Vol &amp; Txs)</th>
              <th style="text-align: right;">Withdrawals (Vol &amp; Txs)</th>
              <th style="text-align: right;">Net Cashflow</th>
              <th style="text-align: center;">Transactions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Telegram Bot Profile & BotFather Assets Kit -->
    <section class="card" id="section-bot-profile-kit" style="margin-bottom: 24px; border: 1px solid rgba(56, 189, 248, 0.25); background: linear-gradient(145deg, #0c1524, #080d17);">
      <div class="kit-header">
        <div>
          <h3 style="font-size: 16px; font-weight: 700; color: #38bdf8; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
            🤖 Telegram BotFather Setup Kit
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 600;">640x360 Ready</span>
          </h3>
          <p style="font-size: 13px; color: #94a3b8; margin: 0;">
            Copy verified BotFather configuration texts and download the exact 640x360 description photo.
          </p>
        </div>
        <div class="kit-header-actions">
          <a href="/bot-description-640x360.jpg" download="fast-xbet-bot-description-640x360.jpg" class="btn-tab active" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 12px;">
            ⬇️ Download Photo (640x360)
          </a>
          <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" class="btn-tab" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; font-size: 12px;">
            ↗ Open @BotFather
          </a>
        </div>
      </div>

      <div class="botfather-grid">
        <!-- Photo Preview Card -->
        <div style="background: #060a12; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px;">
          <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>🖼️ Description Photo (/setdescriptionphoto)</span>
            <span style="color: #10b981; font-family: monospace;">640 × 360 px</span>
          </div>
          <a href="/bot-description-640x360.jpg" target="_blank" style="display: block; overflow: hidden; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.3);">
            <img src="/bot-description-640x360.jpg" alt="Telegram Bot Description Photo" style="width: 100%; height: auto; display: block; aspect-ratio: 16/9; object-fit: cover;" />
          </a>
          <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
            <span>Aspect Ratio: 16:9 (Telegram standard)</span>
            <a href="/bot-description-640x360.jpg" download="bot-description-640x360.jpg" style="color: #38bdf8; text-decoration: none; font-weight: 600;">Download JPG</a>
          </div>
        </div>

        <!-- Description (Under 512 chars) -->
        <div style="background: #060a12; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; display: flex; flex-direction: column;">
          <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>📝 Bot Description (/setdescription)</span>
            <span style="color: #10b981; font-family: monospace;">433 / 512 chars</span>
          </div>
          <div id="copy-desc-box" style="background: #0a111e; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.5; color: #e2e8f0; font-family: sans-serif; white-space: pre-line; flex: 1; margin-bottom: 10px;">⚡ Welcome to Fast xBet Cash 🇱🇰
Official 1xBet Sri Lanka Cash Desk.

What we offer:
💳 Instant 1xBet Local Deposits (eZ Cash, mCash, FriMi, Bank Transfer)
🚀 Fast 5–15 min Withdrawals directly to your local account
⚽ Daily Free VIP Sports Betting Tips with top winning odds
🌐 24/7 Sinhala, English & Tamil Live Customer Support
🔒 100% Secure, Verified & 0% Hidden Fees!

Tap 'Start' below to begin now! 👇</div>
          <button type="button" class="btn-tab" onclick="var btn=this;navigator.clipboard.writeText(document.getElementById('copy-desc-box').innerText).then(function(){btn.textContent='✓ Copied!';setTimeout(function(){btn.textContent='📋 Copy Description Text'},2000);})" style="width: 100%; text-align: center; justify-content: center; padding: 8px; cursor: pointer;">
            📋 Copy Description Text
          </button>
        </div>

        <!-- About Text (Under 120 chars) -->
        <div style="background: #060a12; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; display: flex; flex-direction: column;">
          <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>ℹ️ About Text (/setabouttext)</span>
            <span style="color: #10b981; font-family: monospace;">109 / 120 chars</span>
          </div>
          <div id="copy-about-box" style="background: #0a111e; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.5; color: #e2e8f0; font-family: sans-serif; white-space: pre-line; flex: 1; margin-bottom: 10px;">⚡ Fast xBet Cash 🇱🇰 | Official 1xBet Sri Lanka Cash Desk. Instant deposits, fast withdrawals &amp; daily free tips!</div>
          <button type="button" class="btn-tab" onclick="var btn=this;navigator.clipboard.writeText(document.getElementById('copy-about-box').innerText).then(function(){btn.textContent='✓ Copied!';setTimeout(function(){btn.textContent='📋 Copy About Text'},2000);})" style="width: 100%; text-align: center; justify-content: center; padding: 8px; cursor: pointer;">
            📋 Copy About Text
          </button>
        </div>

        <!-- Privacy Policy URL (/setprivacy) -->
        <div style="background: #060a12; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; display: flex; flex-direction: column;">
          <div style="font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>🛡️ Privacy Policy (/setprivacy)</span>
            <span style="color: #38bdf8; font-family: monospace;">Public URL</span>
          </div>
          <div id="copy-privacy-box" style="background: #0a111e; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.5; color: #7dd3fc; font-family: monospace; word-break: break-all; flex: 1; margin-bottom: 10px;">/privacy</div>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <button type="button" class="btn-tab" onclick="var btn=this;var fullUrl=window.location.origin+'/privacy';navigator.clipboard.writeText(fullUrl).then(function(){btn.textContent='✓ Copied!';setTimeout(function(){btn.textContent='📋 Copy Privacy URL'},2000);})" style="flex: 1; text-align: center; justify-content: center; padding: 8px; cursor: pointer;">
              📋 Copy Privacy URL
            </button>
            <a href="/privacy" target="_blank" class="btn-tab" style="text-align: center; justify-content: center; padding: 8px 12px; text-decoration: none; display: inline-flex; align-items: center; color: #e2e8f0;">
              ↗ View
            </a>
          </div>
          <div style="font-size: 11px; color: #94a3b8; line-height: 1.4;">
            Send this public URL to @BotFather after typing <code>/setprivacy</code>, or use <code>/empty</code> to revert to Telegram's default policy.
          </div>
        </div>
      </div>
    </section>

    <!-- Payment Methods Config -->
    <section class="card" id="section-payment-methods" style="margin-bottom: 24px;">
      <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #f8fafc;">
        💳 Active Payment Methods
      </h3>
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">
        Current deposit accounts and wallets active in the Telegram Bot menu.
      </p>
      <div class="payment-methods-grid">
        ${data.paymentMethods ? `
          <div style="background: #070b12; border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">Bank Transfer</div>
            <div style="font-size: 13px; font-family: monospace; color: #38bdf8; word-break: break-all;">${escapeText(data.paymentMethods.bank)}</div>
          </div>
          <div style="background: #070b12; border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">eZ Cash</div>
            <div style="font-size: 13px; font-family: monospace; color: #10b981;">${escapeText(data.paymentMethods.ezcash)}</div>
          </div>
          <div style="background: #070b12; border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">mCash</div>
            <div style="font-size: 13px; font-family: monospace; color: #f59e0b;">${escapeText(data.paymentMethods.mcash)}</div>
          </div>
          <div style="background: #070b12; border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">FriMi</div>
            <div style="font-size: 13px; font-family: monospace; color: #a855f7;">${escapeText(data.paymentMethods.frimi)}</div>
          </div>
          <div style="background: #070b12; border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">iPay</div>
            <div style="font-size: 13px; font-family: monospace; color: #ef4444;">${escapeText(data.paymentMethods.ipay)}</div>
          </div>
          <div style="background: #070b12; border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px;">WhatsApp Support</div>
            <div style="font-size: 13px; font-family: monospace; color: #22c55e;">${escapeText(data.paymentMethods.whatsapp)}</div>
          </div>
        ` : '<div style="font-size: 13px; color: #64748b;">Payment details unavailable.</div>'}
      </div>
    </section>

    <!-- Operational Tickets & Alerts Section -->
    <div class="operational-grid">
      <div class="card" id="section-tickets">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #f8fafc;">
          🎫 Support Tickets Queue
        </h3>
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">
          User requests submitted via the Telegram <code>/ticket</code> command.
        </p>
        <div style="font-size: 13px; color: #64748b;">
          ${tickets.length === 0 ? 'No open support tickets in queue.' : `${tickets.length} active tickets recorded.`}
        </div>
      </div>

      <div class="card" id="section-alerts">
        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #f8fafc;">
          🛡️ Operational Integrity
        </h3>
        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">
          D1 SQLite database active, rate limiting enabled, and cryptographic fraud detection online.
        </p>
        <div style="font-size: 13px; color: ${alerts.length === 0 ? '#10b981' : '#f59e0b'};">
          ${alerts.length === 0 ? '✓ All financial operations and bot webhooks running normal.' : `⚠️ ${alerts.length} operational alerts pending review.`}
        </div>
      </div>
    </div>
  </div>

  <script${nonceAttr}>
  (function(){
    // Set absolute Privacy Policy URL for current host
    var privacyBox = document.getElementById("copy-privacy-box");
    if (privacyBox) {
      privacyBox.textContent = window.location.origin + "/privacy";
    }

    // Telegram Bot ping
    var badge = document.getElementById("admin-bot-badge");
    var dot = document.getElementById("admin-bot-dot");
    var text = document.getElementById("admin-bot-text");
    function pingBot() {
      if (text) text.textContent = "Bot: Pinging...";
      if (dot) dot.style.background = "#facc15";
      fetch("/api/bot/status", { cache: "no-store" })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(d){
          if (d && d.ok && d.status === "connected") {
            if (text) text.textContent = "Bot: Connected (" + (d.pingMs ? d.pingMs + "ms" : "OK") + ")";
            if (dot) dot.style.background = "#10b981";
            if (badge) {
              badge.style.background = "rgba(16, 185, 129, 0.12)";
              badge.style.color = "#10b981";
              badge.style.borderColor = "rgba(16, 185, 129, 0.28)";
            }
          } else if (d && d.status === "not_configured") {
            if (text) text.textContent = "Bot: Unconfigured";
            if (dot) dot.style.background = "#f59e0b";
            if (badge) {
              badge.style.background = "rgba(245, 158, 11, 0.12)";
              badge.style.color = "#f59e0b";
              badge.style.borderColor = "rgba(245, 158, 11, 0.28)";
            }
          } else {
            if (text) text.textContent = "Bot: Offline";
            if (dot) dot.style.background = "#ef4444";
            if (badge) {
              badge.style.background = "rgba(239, 68, 68, 0.12)";
              badge.style.color = "#ef4444";
              badge.style.borderColor = "rgba(239, 68, 68, 0.28)";
            }
          }
        })
        .catch(function(){
          if (text) text.textContent = "Bot: Unreachable";
          if (dot) dot.style.background = "#ef4444";
        });
    }
    if (badge) badge.addEventListener("click", pingBot);
    pingBot();

    // R2 Analytics & Dashboard Periodic Polling Engine
    var pollIntervalMs = 15000;
    var pollTimer = null;
    var isPollingInProgress = false;
    var isTabActive = !document.hidden;

    var intervalSelect = document.getElementById("polling-interval-select");
    var manualPollBtn = document.getElementById("btn-manual-poll");
    var spinnerIcon = document.getElementById("poll-spinner-icon");
    var pollBadge = document.getElementById("polling-status-badge");
    var pollDot = document.getElementById("polling-dot");
    var pollStatusText = document.getElementById("polling-status-text");
    var lastSyncText = document.getElementById("r2-last-sync-time");

    function setPollingUI(state) {
      if (!pollDot || !pollStatusText) return;
      if (state === "syncing") {
        if (spinnerIcon) spinnerIcon.classList.add("spinning");
        pollDot.style.background = "#38bdf8";
        pollStatusText.textContent = "Syncing...";
      } else if (state === "paused") {
        if (spinnerIcon) spinnerIcon.classList.remove("spinning");
        pollDot.style.background = "#94a3b8";
        pollStatusText.textContent = "Polling: Paused";
        if (pollBadge) {
          pollBadge.style.background = "rgba(148, 163, 184, 0.12)";
          pollBadge.style.color = "#94a3b8";
          pollBadge.style.borderColor = "rgba(148, 163, 184, 0.25)";
        }
      } else if (state === "error") {
        if (spinnerIcon) spinnerIcon.classList.remove("spinning");
        pollDot.style.background = "#f59e0b";
        pollStatusText.textContent = "Retrying...";
      } else if (state === "expired") {
        if (spinnerIcon) spinnerIcon.classList.remove("spinning");
        pollDot.style.background = "#ef4444";
        pollStatusText.textContent = "Session Expired";
        if (pollBadge) {
          pollBadge.style.background = "rgba(239, 68, 68, 0.12)";
          pollBadge.style.color = "#ef4444";
          pollBadge.style.borderColor = "rgba(239, 68, 68, 0.28)";
        }
      } else { // active
        if (spinnerIcon) spinnerIcon.classList.remove("spinning");
        pollDot.style.background = "#10b981";
        var sec = Math.round(pollIntervalMs / 1000);
        pollStatusText.textContent = "Auto-Poll: " + sec + "s";
        if (pollBadge) {
          pollBadge.style.background = "rgba(16, 185, 129, 0.12)";
          pollBadge.style.color = "#10b981";
          pollBadge.style.borderColor = "rgba(16, 185, 129, 0.25)";
        }
      }
    }

    function triggerHighlight(elementId) {
      var el = document.getElementById(elementId);
      if (el) {
        el.classList.remove("flash-highlight");
        void el.offsetWidth;
        el.classList.add("flash-highlight");
      }
    }

    function refreshR2Dashboard() {
      if (isPollingInProgress) return;
      isPollingInProgress = true;
      setPollingUI("syncing");

      var searchParams = new URLSearchParams(window.location.search);
      var days = searchParams.get("days") || "7";
      var metric = searchParams.get("metric") || "volume";

      fetch("/api/admin/r2-analytics?days=" + encodeURIComponent(days) + "&metric=" + encodeURIComponent(metric), {
        cache: "no-store",
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (res.status === 401 || res.status === 403) {
          setPollingUI("expired");
          stopPolling();
          return null;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function(data) {
        if (!data || !data.ok) return;

        // 1. Update R2 Storage Analytics card
        if (data.r2) {
          var r = data.r2;
          var countEl = document.getElementById("r2-receipts-count");
          var sizeEl = document.getElementById("r2-receipts-size");
          var totalSizeEl = document.getElementById("r2-total-size");
          var totalObjEl = document.getElementById("r2-total-objects");
          var bucketEl = document.getElementById("r2-bucket-name");
          var lastUpEl = document.getElementById("r2-last-upload");
          var statusEl = document.getElementById("r2-engine-status");
          var dotEl = document.getElementById("r2-engine-dot");
          var subEl = document.getElementById("r2-engine-sub");

          if (countEl) countEl.textContent = (r.receiptsCount || 0).toLocaleString();
          if (sizeEl) sizeEl.textContent = (r.receiptsFormattedSize || "0 B") + " verified slips";
          if (totalSizeEl) totalSizeEl.textContent = r.totalFormattedSize || "0 B";
          if (totalObjEl) totalObjEl.textContent = (r.totalObjects || 0).toLocaleString() + " objects (slips + logs)";
          if (bucketEl && r.bucket) bucketEl.textContent = r.bucket;
          if (statusEl) statusEl.textContent = r.configured ? "R2 Connected" : "R2 Standby";
          if (dotEl) dotEl.style.background = r.configured ? "#10b981" : "#f59e0b";
          if (subEl) subEl.textContent = r.configured ? "Direct binding active" : "Fallback / Unconfigured";
          if (lastUpEl) {
            lastUpEl.textContent = r.lastReceiptUploadedAt ? new Date(r.lastReceiptUploadedAt).toLocaleTimeString() : "No uploads yet";
          }
          triggerHighlight("card-r2-receipts");
          triggerHighlight("card-r2-storage");
        }

        // 2. Update KPI Grid cards
        if (data.stats) {
          var s = data.stats;
          var usersVal = document.querySelector("#kpi-users .kpi-value");
          var usersSub = document.querySelector("#kpi-users .kpi-sub");
          var depVal = document.querySelector("#kpi-deposits .kpi-value");
          var depSub = document.querySelector("#kpi-deposits .kpi-sub");
          var wdVal = document.querySelector("#kpi-withdrawals .kpi-value");
          var wdSub = document.querySelector("#kpi-withdrawals .kpi-sub");
          var netVal = document.querySelector("#kpi-net .kpi-value");

          if (usersVal) usersVal.textContent = (s.totalUsers || 0).toLocaleString();
          if (usersSub) usersSub.textContent = "+" + (s.todayUsers || 0).toLocaleString() + " today";
          if (depVal) depVal.textContent = "LKR " + (s.approvedDepositsVolume || 0).toLocaleString();
          if (depSub) depSub.textContent = (s.approvedDepositsCount || 0).toLocaleString() + " approved · " + (s.pendingDeposits || 0) + " pending";
          if (wdVal) wdVal.textContent = "LKR " + (s.approvedWithdrawalsVolume || 0).toLocaleString();
          if (wdSub) wdSub.textContent = (s.approvedWithdrawalsCount || 0).toLocaleString() + " approved · " + (s.pendingWithdrawals || 0) + " pending";
          if (netVal) {
            var net = (s.approvedDepositsVolume || 0) - (s.approvedWithdrawalsVolume || 0);
            netVal.textContent = "LKR " + net.toLocaleString();
            netVal.style.color = net >= 0 ? "#10b981" : "#f43f5e";
          }
        }

        // 3. Update Window Trends Summary row
        if (data.summary) {
          var sum = data.summary;
          var depRow = document.getElementById("summary-dep-vol");
          var wdRow = document.getElementById("summary-wd-vol");
          var netRow = document.getElementById("summary-net-vol");
          var actRow = document.getElementById("summary-activity");
          if (depRow) depRow.textContent = "LKR " + (sum.totalDepositVolume || 0).toLocaleString();
          if (wdRow) wdRow.textContent = "LKR " + (sum.totalWithdrawalVolume || 0).toLocaleString();
          if (netRow) {
            var netV = sum.netVolume || 0;
            netRow.textContent = (netV >= 0 ? "+" : "") + "LKR " + netV.toLocaleString();
            netRow.style.color = netV >= 0 ? "#10b981" : "#f43f5e";
          }
          if (actRow) {
            var txs = (sum.totalDepositCount || 0) + (sum.totalWithdrawalCount || 0);
            actRow.textContent = txs + " transactions";
          }
        }

        if (lastSyncText) {
          lastSyncText.textContent = "Last synced: " + new Date().toLocaleTimeString();
        }
        if (pollIntervalMs > 0) {
          setPollingUI("active");
        }
      })
      .catch(function(err) {
        console.warn("[R2 Polling Warning]:", err);
        if (pollIntervalMs > 0) {
          setPollingUI("error");
        }
      })
      .finally(function() {
        isPollingInProgress = false;
      });
    }

    function startPolling() {
      stopPolling();
      if (pollIntervalMs > 0) {
        setPollingUI("active");
        pollTimer = setInterval(function() {
          if (isTabActive && pollIntervalMs > 0) {
            refreshR2Dashboard();
          }
        }, pollIntervalMs);
      } else {
        setPollingUI("paused");
      }
    }

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    if (intervalSelect) {
      intervalSelect.addEventListener("change", function() {
        pollIntervalMs = parseInt(intervalSelect.value, 10) || 0;
        if (pollIntervalMs > 0) {
          startPolling();
          refreshR2Dashboard();
        } else {
          stopPolling();
          setPollingUI("paused");
        }
      });
    }

    if (manualPollBtn) {
      manualPollBtn.addEventListener("click", function() {
        refreshR2Dashboard();
        if (pollIntervalMs > 0) {
          startPolling();
        }
      });
    }

    document.addEventListener("visibilitychange", function() {
      isTabActive = !document.hidden;
      if (isTabActive && pollIntervalMs > 0) {
        refreshR2Dashboard();
      }
    });

    // Initialize auto-polling
    startPolling();
  })();
  </script>
</body>
</html>`;
}
