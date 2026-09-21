import type { Env, SystemStats, DailyTrendItem } from "./types";
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
      width: min(100% - 32px, 380px);
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 32px 28px;
      text-align: center;
    }
    .login-card h1 { font-size: 18px; font-weight: 800; margin: 12px 0 4px; }
    .login-card p { font-size: 13px; color: #94a3b8; margin: 0 0 20px; }
    .login-card input {
      width: 100%; padding: 12px 14px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04);
      color: #f1f5f9; font-size: 14px; margin-bottom: 12px;
    }
    .login-card button {
      width: 100%; padding: 12px 14px; border-radius: 10px; border: none;
      background: #00e676; color: #04130b; font-weight: 800; font-size: 14px; cursor: pointer;
    }
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
      <input type="password" name="secret" class="auth-input" id="admin-secret-input" placeholder="Enter ADMIN_API_SECRET..." autocomplete="current-password">
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
  const { stats, trends, days, metric, isAuthorized, tickets = [], alerts = [] } = data;

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
      padding-bottom: 24px;
      margin-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
      padding: 8px 16px;
      font-size: 13px;
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
      padding: 6px 14px;
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
      background: rgba(30, 41, 59, 0.7);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
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
        <div>Window Period: <strong style="color: #f1f5f9;">Last ${trends.length} days</strong></div>
        <div>Total Window Deposits: <strong style="color: #10b981;">LKR ${totalDepVol.toLocaleString()}</strong></div>
        <div>Total Window Withdrawals: <strong style="color: #f59e0b;">LKR ${totalWdVol.toLocaleString()}</strong></div>
        <div>Window Net Cashflow: <strong style="color: ${netTrendVol >= 0 ? '#10b981' : '#f43f5e'};">${netTrendVol >= 0 ? '+' : ''}LKR ${netTrendVol.toLocaleString()}</strong></div>
        <div>Total Activity: <strong style="color: #38bdf8;">${totalTxs} transactions</strong></div>
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
          <button type="button" class="btn-tab" onclick="navigator.clipboard.writeText(document.getElementById('copy-desc-box').innerText).then(function(){alert('Description copied to clipboard!')})" style="width: 100%; text-align: center; justify-content: center; padding: 8px; cursor: pointer;">
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
          <button type="button" class="btn-tab" onclick="navigator.clipboard.writeText(document.getElementById('copy-about-box').innerText).then(function(){alert('About text copied to clipboard!')})" style="width: 100%; text-align: center; justify-content: center; padding: 8px; cursor: pointer;">
            📋 Copy About Text
          </button>
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
  })();
  </script>
</body>
</html>`;
}
