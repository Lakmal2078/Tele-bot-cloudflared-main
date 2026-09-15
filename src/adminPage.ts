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
        </div>
        <p style="font-size: 13px; color: #94a3b8;">Financial integrity monitor, Telegram agent stats &amp; D3.js trend analytics</p>
      </div>

      <div style="display: flex; gap: 10px; align-items: center;">
        <a href="/" class="btn btn-secondary" id="btn-back-home">← Public Website</a>
        <a href="https://t.me/fast_1xbetcash_bot" target="_blank" rel="noopener noreferrer" class="btn btn-primary" id="btn-open-bot">🚀 Open Bot</a>
      </div>
    </header>

    <!-- Optional Admin Key Bar -->
    <div class="auth-banner" id="auth-section">
      <div style="font-size: 13px; color: #cbd5e1;">
        <strong style="color: #38bdf8;">Admin API Access:</strong> 
        ${isAuthorized ? '<span style="color: #10b981; font-weight: 600;">Authenticated Session Active</span>' : 'Preview Mode Active. Enter secret for direct API write controls.'}
      </div>
      <form id="admin-secret-form" style="display: flex; gap: 8px;" method="GET" action="/admin">
        <input type="hidden" name="days" value="${days}">
        <input type="hidden" name="metric" value="${metric}">
        <input type="password" name="secret" class="auth-input" id="admin-secret-input" placeholder="Enter ADMIN_API_SECRET..." value="" autocomplete="current-password">
        <button type="submit" class="btn btn-secondary" id="btn-apply-secret">Set Secret</button>
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

        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
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
      <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #94a3b8;">
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

    <!-- Payment Methods Config -->
    <section class="card" id="section-payment-methods" style="margin-bottom: 24px;">
      <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #f8fafc;">
        💳 Active Payment Methods
      </h3>
      <p style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">
        Current deposit accounts and wallets active in the Telegram Bot menu.
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
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
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
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
    // Remember admin secret in sessionStorage if supplied
    (function() {
      const urlParams = new URLSearchParams(window.location.search);
      const secretParam = urlParams.get('secret');
      if (secretParam) {
        sessionStorage.setItem('x-admin-secret', secretParam);
      }
      const stored = sessionStorage.getItem('x-admin-secret');
      if (stored) {
        const input = document.getElementById('admin-secret-input');
        if (input && !input.value) {
          input.value = stored;
        }
      }
    })();
  </script>
</body>
</html>`;
}
