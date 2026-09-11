import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { createD1Database } from "./sqlite-d1";
import { getStats } from "./db";
import { logBotError } from "./logger";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { assertValidEnv } from "./config";
import type { Env } from "./types";

try {
  if (typeof (process as any).loadEnvFile === "function") (process as any).loadEnvFile();
} catch {
  // .env is optional for the loader; strict validation below remains mandatory.
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
  ADMIN_API_SECRET: process.env.ADMIN_API_SECRET || "",
  CHANNEL_USERNAME: process.env.CHANNEL_USERNAME || "",
  CHANNEL_URL: process.env.CHANNEL_URL || "",
  TIPS_CHANNEL_ID: process.env.TIPS_CHANNEL_ID || "",
  TIPS_CHANNEL_URL: process.env.TIPS_CHANNEL_URL || "",
  ODDS_API_KEY: process.env.ODDS_API_KEY || "",
  TIPS_SPORTS: process.env.TIPS_SPORTS || "",
  TIPS_ODDS_REGIONS: process.env.TIPS_ODDS_REGIONS || "",
  TIPS_MIN_ODDS: process.env.TIPS_MIN_ODDS || "",
  TIPS_MAX_ODDS: process.env.TIPS_MAX_ODDS || "",
  TIPS_HOURS_AHEAD: process.env.TIPS_HOURS_AHEAD || "",
  XBET_LINK: process.env.XBET_LINK || "",
  XBET_PROMO_CODE: process.env.XBET_PROMO_CODE || "",
  MIN_TRANSACTION_LKR: process.env.MIN_TRANSACTION_LKR || "",
  MAX_TRANSACTION_LKR: process.env.MAX_TRANSACTION_LKR || "",
  DEPOSIT_INSTRUCTIONS: process.env.DEPOSIT_INSTRUCTIONS || "",
  WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || "",
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "",
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "",
  R2_PUBLIC_DOMAIN: process.env.R2_PUBLIC_DOMAIN || "",
  BANK_DETAILS: process.env.BANK_DETAILS || "",
  EZCASH_NUMBER: process.env.EZCASH_NUMBER || "",
  MCASH_NUMBER: process.env.MCASH_NUMBER || "",
  FRIMI_NUMBER: process.env.FRIMI_NUMBER || "",
};

// Fail closed. The process must not run a partially configured financial bot.
assertValidEnv(env, "Node runtime");

const usePolling =
  process.env.USE_POLLING === "true" ||
  process.env.BOT_MODE === "polling" ||
  (process.env.BOT_MODE !== "webhook" && process.env.USE_POLLING !== "false");

let bot: ReturnType<typeof createBot> | null = null;
let webhookHandler: ((req: http.IncomingMessage, res: http.ServerResponse) => Promise<unknown>) | null = null;

bot = createBot(env);
if (usePolling) {
  bot.api
    .deleteWebhook({ drop_pending_updates: false })
    .then(() => {
      console.log("[Bot] Cleared existing webhook; Telegram updates will be received via Long Polling.");
    })
    .catch((err) => console.warn("[Bot] Notice deleting webhook:", err?.message || err))
    .finally(() => {
      if (!bot) return;
      bot
        .start({
          drop_pending_updates: false,
          onStart: (botInfo) => {
            console.log(`[Bot] Long Polling started successfully as @${botInfo.username}`);
          },
        })
        .catch((err) => console.error("[Bot] Long Polling error:", err));
    });
} else {
  webhookHandler = webhookCallback(bot, "http", {
    // Grammy rejects requests without the exact Telegram secret token.
    secretToken: env.WEBHOOK_SECRET,
  });
}

function isAuthorizedAdminRequest(req: http.IncomingMessage): boolean {
  const expected = env.ADMIN_API_SECRET.trim();
  if (!expected) return false;

  const authorization = String(req.headers.authorization || "");
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim() || "";
  const headerSecret = String(req.headers["x-admin-secret"] || "").trim();
  const supplied = bearer || headerSecret;
  if (!supplied) return false;

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function writeJson(res: http.ServerResponse, body: unknown, status = 200): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const method = (req.method || "GET").toUpperCase();
  const url = (req.url || "/").split("?")[0];

  // Public liveness endpoint contains no operational/configuration data.
  if (url === "/health" || url === "/api/health") {
    if (method === "HEAD") {
      res.writeHead(200, { "Cache-Control": "no-store" });
      res.end();
    } else {
      writeJson(res, { status: "ok", service: "telegram-bot" });
    }
    return;
  }

  // All operational diagnostics are private.
  if (url === "/api/cleanup/logs/status" && (method === "GET" || method === "HEAD")) {
    if (!isAuthorizedAdminRequest(req)) {
      writeJson(res, { ok: false, error: "Unauthorized" }, 401);
      return;
    }
    const last = getLastCleanupResult();
    if (method === "HEAD") {
      res.writeHead(200, { "Cache-Control": "no-store" });
      res.end();
    } else {
      writeJson(res, {
        status: "ok",
        retentionPolicyDays: 30,
        schedule: "Daily at 02:00 UTC",
        lastCleanup: last,
      });
    }
    return;
  }

  // Authenticated admin diagnostics. Sensitive identifiers and secrets are intentionally omitted.
  if (url === "/api/admin/status" && (method === "GET" || method === "HEAD")) {
    if (!isAuthorizedAdminRequest(req)) {
      writeJson(res, { ok: false, error: "Unauthorized" }, 401);
      return;
    }
    if (method === "HEAD") {
      res.writeHead(200, { "Cache-Control": "no-store" });
      res.end();
      return;
    }
    const stats = await getStats(env.DB);
    writeJson(res, {
      status: "ok",
      runtime: "node",
      mode: usePolling ? "polling" : "webhook",
      stats,
    });
    return;
  }

  if (url === "/api/cleanup/logs" && method === "POST") {
    if (!isAuthorizedAdminRequest(req)) {
      writeJson(res, { ok: false, error: "Unauthorized" }, 401);
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy();
    });
    req.on("end", async () => {
      let days = 30;
      try {
        const parsed = JSON.parse(body || "{}");
        if (parsed.retentionDays && parsed.retentionDays > 0 && parsed.retentionDays <= 3650) {
          days = Math.floor(parsed.retentionDays);
        }
      } catch {
        writeJson(res, { ok: false, error: "Invalid JSON body" }, 400);
        return;
      }

      try {
        const result = await cleanupOldR2Logs(env, days);
        writeJson(res, result, result.success ? 200 : 500);
      } catch (err: any) {
        writeJson(res, { success: false, error: err?.message || "Cleanup failed" }, 500);
      }
    });
    return;
  }

  // In polling mode POSTs are not webhook updates.
  if (method === "POST" && usePolling) {
    writeJson(res, { ok: true, mode: "polling" });
    return;
  }

  if (method === "POST") {
    if (!webhookHandler || !bot) {
      writeJson(res, { ok: false, error: "Webhook is not configured" }, 503);
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
        context: { flow: "node_http_webhook" },
      });
      if (!res.writableEnded) writeJson(res, { ok: true });
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
  res.end("Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`[XBet Bot Server] Running on http://${HOST}:${PORT}`);
});
