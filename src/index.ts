import http from "node:http";
import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { createD1Database } from "./sqlite-d1";
import { getStats } from "./db";
import { logBotError } from "./logger";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import type { Env } from "./types";

// Automatically load .env if available
try {
  if (typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile();
  }
} catch {
  // .env file might not exist yet, ignore
}

const PORT = 3000;
const HOST = "0.0.0.0";

const dbPath = process.env.DB_PATH || "data/bot.db";
const db = createD1Database(dbPath);

const env: Env = {
  DB: db,
  BOT_TOKEN: process.env.BOT_TOKEN || "",
  ADMIN_IDS: process.env.ADMIN_IDS || "",
  ADMIN_CHANNEL_ID: process.env.ADMIN_CHANNEL_ID || "",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "",
  CHANNEL_USERNAME: process.env.CHANNEL_USERNAME || "@fast_xbet_cash",
  CHANNEL_URL: process.env.CHANNEL_URL || "https://t.me/fast_xbet_cash",
  XBET_LINK: process.env.XBET_LINK || "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622",
  XBET_PROMO_CODE: process.env.XBET_PROMO_CODE || "VGSL",
  MIN_TRANSACTION_LKR: process.env.MIN_TRANSACTION_LKR || "1000",
  MAX_TRANSACTION_LKR: process.env.MAX_TRANSACTION_LKR || "500000",
  DEPOSIT_INSTRUCTIONS:
    process.env.DEPOSIT_INSTRUCTIONS ||
    "කරුණාකර agentගෙන් නිල payment instructions ලබාගෙන, payment receipt screenshot එක එවන්න.",
  WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || "",
  // Cloudflare R2
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "",
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "",
  R2_PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN || "",
  // Custom Payment Gateways
  BANK_DETAILS: process.env.BANK_DETAILS || "",
  EZCASH_NUMBER: process.env.EZCASH_NUMBER || "",
  MCASH_NUMBER: process.env.MCASH_NUMBER || "",
  FRIMI_NUMBER: process.env.FRIMI_NUMBER || "",
};

// Default to Long Polling in standalone/Node.js environment unless webhook is explicitly forced
const usePolling =
  process.env.USE_POLLING === "true" ||
  process.env.BOT_MODE === "polling" ||
  (process.env.BOT_MODE !== "webhook" && process.env.USE_POLLING !== "false");

let bot: ReturnType<typeof createBot> | null = null;
let webhookHandler: ((req: http.IncomingMessage, res: http.ServerResponse) => Promise<unknown>) | null = null;

if (env.BOT_TOKEN && env.BOT_TOKEN.trim() !== "") {
  try {
    bot = createBot(env);
    if (usePolling) {
      // Clear any prior webhook (e.g. leftover Cloudflare Worker) so Telegram delivers updates immediately via Long Polling
      bot.api
        .deleteWebhook({ drop_pending_updates: false })
        .then(() => {
          console.log("[Bot] Cleared existing webhook; Telegram updates will be received via Long Polling.");
        })
        .catch((err) => {
          console.warn("[Bot] Notice deleting webhook:", err?.message || err);
        })
        .finally(() => {
          if (!bot) return;
          bot.start({
            drop_pending_updates: false,
            onStart: (botInfo) => {
              console.log(`[Bot] Long Polling started successfully as @${botInfo.username}`);
              bot?.api
                .setMyCommands([
                  { command: "start", description: "Start the bot & open main menu" },
                  { command: "menu", description: "Open Main Menu" },
                  { command: "deposit", description: "Deposit funds to 1XBet" },
                  { command: "confirm_deposit", description: "Submit transaction receipt screenshot to R2 & Admin" },
                  { command: "withdraw", description: "Withdraw funds from 1XBet" },
                  { command: "help", description: "Help, FAQ & Support" },
                  { command: "register", description: "Register on 1XBet with VIP Promo" },
                  { command: "myreferrals", description: "View your referral earnings" },
                  { command: "history", description: "View your transaction history" },
                  { command: "language", description: "Change language (සිංහල / English / தமிழ்)" },
                  { command: "cancel", description: "Cancel current operation" },
                  { command: "id", description: "View your Telegram ID & info" },
                ])
                .then(() => console.log("[Bot] Registered official bot commands menu with Telegram API."))
                .catch((e) => console.warn("[Bot] Notice setting bot commands:", e?.message || e));
            },
          }).catch((err) => {
            console.error("[Bot] Long Polling error:", err);
          });
        });
      console.log("[Bot] Grammy bot running in Long-Polling mode (direct Telegram connection).");
    } else {
      webhookHandler = webhookCallback(bot, "http", {
        secretToken: env.WEBHOOK_SECRET || undefined,
      });
      console.log("[Bot] Grammy bot initialized with webhook handler on port 3000.");
    }
  } catch (err) {
    console.error("[Bot] Failed to initialize bot:", err);
  }
} else {
  console.warn(
    "[Bot Notice] BOT_TOKEN is not set. The server is running, but Telegram updates will not be processed until BOT_TOKEN is configured in environment variables."
  );
}


const server = http.createServer(async (req, res) => {
  const method = (req.method || "GET").toUpperCase();
  const url = (req.url || "/").split("?")[0];

  if (url === "/health" || url === "/api/health") {
    if (method === "HEAD") {
      res.writeHead(200);
      res.end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (method === "GET" || method === "HEAD") {
    if (url === "/api/cleanup/logs/status") {
      const last = getLastCleanupResult();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        method === "HEAD" ? undefined : JSON.stringify({
          status: "ok",
          retentionPolicyDays: 30,
          schedule: "Daily at 02:00 UTC / 24-hour recurring interval",
          lastCleanup: last,
        })
      );
      return;
    }

    try {
      const stats = await getStats(env.DB);
      const isTokenSet = Boolean(env.BOT_TOKEN && env.BOT_TOKEN.trim() !== "");
      const isAdminsSet = Boolean(env.ADMIN_IDS && env.ADMIN_IDS.trim() !== "");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (method === "HEAD") {
        res.end();
        return;
      }
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XBet Telegram Bot</title>
  <meta name="description" content="Telegram bot for cash deposits, withdrawals, and account management with admin controls and D1 database support">
  <meta property="og:title" content="XBet Telegram Bot">
  <meta property="og:description" content="Telegram bot for cash deposits, withdrawals, and account management with admin controls and D1 database support">
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #4ade80;
      --warning: #fbbf24;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem 1rem;
      display: flex;
      justify-content: center;
    }
    .container {
      max-width: 780px;
      width: 100%;
    }
    .header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    .badge-online { background: rgba(74, 222, 128, 0.2); color: var(--success); }
    .badge-warn { background: rgba(251, 191, 36, 0.2); color: var(--warning); }
    h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 0.5rem; }
    p.desc { color: var(--text-muted); font-size: 0.95rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
    }
    .card h3 { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; }
    .card .val { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
    .section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section h2 { font-size: 1.15rem; margin-bottom: 1rem; }
    .row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    .row:last-child { border-bottom: none; }
    .label { color: var(--text-muted); }
    .val-text { font-family: monospace; }
    code {
      display: block;
      background: #020617;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #38bdf8;
      overflow-x: auto;
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge ${isTokenSet ? "badge-online" : "badge-warn"}">
        ${isTokenSet ? "● Bot Service Active" : "● Awaiting BOT_TOKEN"}
      </span>
      <h1>XBet Telegram Bot</h1>
      <p class="desc">Cloudflare D1 SQLite &amp; Grammy Bot runtime migrated to Node.js on port 3000</p>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Total Users</h3>
        <div class="val">${stats.totalUsers.toLocaleString()}</div>
      </div>
      <div class="card">
        <h3>Today's New Users</h3>
        <div class="val">${stats.todayUsers.toLocaleString()}</div>
      </div>
      <div class="card">
        <h3>Approved Deposits</h3>
        <div class="val" style="color: var(--success);">LKR ${stats.approvedDepositsVolume.toLocaleString()}</div>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem;">${stats.approvedDepositsCount} approved (${stats.pendingDeposits} pending)</p>
      </div>
      <div class="card">
        <h3>Approved Withdrawals</h3>
        <div class="val" style="color: #f43f5e;">LKR ${stats.approvedWithdrawalsVolume.toLocaleString()}</div>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem;">${stats.approvedWithdrawalsCount} approved (${stats.pendingWithdrawals} pending)</p>
      </div>
      <div class="card">
        <h3>Today's Deposit Volume</h3>
        <div class="val">LKR ${stats.todayDepositsVolume.toLocaleString()}</div>
      </div>
      <div class="card">
        <h3>Net Cash Flow</h3>
        <div class="val" style="color: ${stats.approvedDepositsVolume >= stats.approvedWithdrawalsVolume ? "var(--success)" : "#f43f5e"};">
          LKR ${(stats.approvedDepositsVolume - stats.approvedWithdrawalsVolume).toLocaleString()}
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Configuration &amp; Environment Status</h2>
      <div class="row">
        <span class="label">Server Port</span>
        <span class="val-text">${PORT}</span>
      </div>
      <div class="row">
        <span class="label">Telegram Bot Token</span>
        <span class="val-text" style="color: ${isTokenSet ? "var(--success)" : "var(--warning)"};">
          ${isTokenSet ? "Configured" : "Missing (Set BOT_TOKEN in .env)"}
        </span>
      </div>
      <div class="row">
        <span class="label">Admin IDs</span>
        <span class="val-text">${isAdminsSet ? env.ADMIN_IDS : "Not configured"}</span>
      </div>
      <div class="row">
        <span class="label">Operating Mode</span>
        <span class="val-text" style="color: ${usePolling ? "var(--success)" : "var(--primary)"};">
          ${usePolling ? "⚡ Long Polling (Active - Direct Telegram connection)" : "🌐 Webhook Mode (Port " + PORT + ")"}
        </span>
      </div>
      <div class="row">
        <span class="label">Database</span>
        <span class="val-text" style="color: var(--success);">SQLite (${dbPath})</span>
      </div>
      <div class="row">
        <span class="label">Channel Username</span>
        <span class="val-text">${env.CHANNEL_USERNAME}</span>
      </div>
      <div class="row">
        <span class="label">Min / Max Transaction</span>
        <span class="val-text">LKR ${Number(env.MIN_TRANSACTION_LKR).toLocaleString()} - ${Number(env.MAX_TRANSACTION_LKR).toLocaleString()}</span>
      </div>
      <div class="row">
        <span class="label">Cloudflare R2 Bucket</span>
        <span class="val-text" style="color: ${env.R2_BUCKET_NAME ? "var(--success)" : "var(--text-muted)"};">
          ${env.R2_BUCKET_NAME ? `Connected (${env.R2_BUCKET_NAME})` : "Optional / Ready (Set R2_* in .env)"}
        </span>
      </div>
      <div class="row">
        <span class="label">Supported Languages</span>
        <span class="val-text" style="color: var(--primary);">සිංහල (si) • English (en) • தமிழ் (ta)</span>
      </div>
      <div class="row">
        <span class="label">Supported Payment Gateways</span>
        <span class="val-text">🏦 Bank Transfer • 📱 eZ Cash • 📲 mCash • 💳 FriMi</span>
      </div>
    </div>

    <div class="section">
      <h2>🧹 Cloudflare R2 Log Retention & Storage Optimization</h2>
      <p class="desc">
        To prevent unbounded storage costs and keep audit logs lean, logs older than <strong>30 days</strong>
        are automatically deleted via a scheduled daily background task.
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1rem 0;">
        <div style="background: rgba(15,23,42,0.6); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Retention Policy</div>
          <div style="font-weight: 700; color: var(--success); font-size: 1.1rem; margin-top: 0.25rem;">30 Days</div>
        </div>
        <div style="background: rgba(15,23,42,0.6); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Execution Schedule</div>
          <div style="font-weight: 700; color: var(--primary); font-size: 1.1rem; margin-top: 0.25rem;">Daily (24h / 02:00 UTC)</div>
        </div>
        <div style="background: rgba(15,23,42,0.6); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border);">
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Status</div>
          <div id="cleanupStatusVal" style="font-weight: 700; color: var(--text); font-size: 1.1rem; margin-top: 0.25rem;">Active & Scheduled</div>
        </div>
      </div>
      <div style="display: flex; gap: 0.75rem; align-items: center; margin-top: 1rem;">
        <button id="btnRunCleanup" onclick="runCleanupNow()" style="background: #2563eb; hover: background: #1d4ed8; color: #ffffff; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;">
          🧹 Run Cleanup Now (>30d)
        </button>
        <span id="cleanupResultMsg" style="font-size: 0.9rem; color: var(--text-muted);"></span>
      </div>
      <script>
        async function runCleanupNow() {
          const btn = document.getElementById('btnRunCleanup');
          const msg = document.getElementById('cleanupResultMsg');
          btn.disabled = true;
          btn.innerText = '⏳ Cleaning up old logs...';
          msg.innerText = '';
          try {
            const res = await fetch('/api/cleanup/logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ retentionDays: 30 })
            });
            const data = await res.json();
            if (data.success) {
              msg.style.color = 'var(--success)';
              msg.innerText = '✅ Cleaned: ' + data.totalDeleted + ' logs deleted, ' + (data.bytesFreed / 1024).toFixed(2) + ' KB freed (' + data.durationMs + 'ms).';
            } else {
              msg.style.color = 'var(--warning)';
              msg.innerText = '⚠️ ' + (data.message || 'Notice: ' + (data.errors && data.errors[0] || 'Unknown response'));
            }
          } catch (e) {
            msg.style.color = '#ef4444';
            msg.innerText = '❌ Error: ' + e.message;
          } finally {
            btn.disabled = false;
            btn.innerText = '🧹 Run Cleanup Now (>30d)';
          }
        }
      </script>
    </div>

    <div class="section">
      <h2>Webhook Endpoint</h2>
      <p class="desc">Telegram updates should be posted to <code>/</code> or <code>/webhook</code>.</p>
      <code>curl -F "url=https://YOUR_DOMAIN/" https://api.telegram.org/bot&lt;BOT_TOKEN&gt;/setWebhook</code>
    </div>
  </div>
</body>
</html>`);
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error: " + err.message);
    }
    return;
  }

  if (method === "POST") {
    if (url === "/api/cleanup/logs") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        let days = 30;
        try {
          const parsed = JSON.parse(body || "{}");
          if (parsed.retentionDays && parsed.retentionDays > 0) {
            days = parsed.retentionDays;
          }
        } catch {}

        try {
          const result = await cleanupOldR2Logs(env, days);
          res.writeHead(result.success ? 200 : 500, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (usePolling) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, mode: "polling", message: "Bot is actively running in Long Polling mode." }));
      return;
    }

    if (!webhookHandler || !bot) {
      console.warn("[Webhook] Received POST request, but BOT_TOKEN is not configured.");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "BOT_TOKEN not configured" }));
      return;
    }

    try {
      await webhookHandler(req, res);
    } catch (err) {
      console.error("[Webhook Error]:", err);
      logBotError(env, {
        source: "NodeWebhookServer",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        context: {
          flow: "node_http_webhook",
        },
      });
      if (!res.writableEnded) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      }
    }
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("Method Not Allowed");
});

server.listen(PORT, HOST, () => {
  console.log(`[XBet Bot Server] Running on http://${HOST}:${PORT}`);
});
