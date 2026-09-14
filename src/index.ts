import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { createD1Database } from "./sqlite-d1";
import { getStats, getOperationsDashboard, getSupportTickets, updateSupportTicket, createScheduledChannelPost } from "./db";
import { logBotError } from "./logger";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { validateEnv } from "./config";
import { adminAttemptAllowedNode, recordAdminFailureNode, landingPageSecurityHeaders } from "./security";
import { renderLandingPage } from "./landingPage";
import type { Env } from "./types";

try {
  if (typeof (process as any).loadEnvFile === "function") (process as any).loadEnvFile();
} catch {
  // .env is optional for the loader; validation below remains non-fatal for dev preview.
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

const envErrors = validateEnv(env);
if (envErrors.length > 0) {
  console.warn(`[XBet Bot Server] Environment note:\n- ${envErrors.join("\n- ")}`);
  console.warn("[XBet Bot Server] Running in preview showcase mode. Provide credentials in environment settings to enable live bot polling.");
}

const usePolling =
  process.env.USE_POLLING === "true" ||
  process.env.BOT_MODE === "polling" ||
  (process.env.BOT_MODE !== "webhook" && process.env.USE_POLLING !== "false");

let bot: ReturnType<typeof createBot> | null = null;
let webhookHandler: ((req: http.IncomingMessage, res: http.ServerResponse) => Promise<unknown>) | null = null;

if (env.BOT_TOKEN && env.BOT_TOKEN.trim().length > 0) {
  try {
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
        secretToken: env.WEBHOOK_SECRET,
      });
    }
  } catch (err) {
    console.error("[Bot] Could not initialize bot with provided token:", err);
  }
} else {
  console.log("[Bot] BOT_TOKEN not configured. Live Telegram bot polling is standby; Web showcase and APIs active.");
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

function adminAuthorized(req: http.IncomingMessage): boolean {
  if (!adminAttemptAllowedNode(req.headers)) return false;
  const authorized = isAuthorizedAdminRequest(req);
  if (!authorized) recordAdminFailureNode(req.headers);
  return authorized;
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

  if (url === "/health" || url === "/api/health") {
    if (method === "HEAD") {
      res.writeHead(200, { "Cache-Control": "no-store" });
      res.end();
    } else {
      writeJson(res, { status: "ok", service: "telegram-bot" });
    }
    return;
  }

  if (url === "/api/cleanup/logs/status" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(req)) {
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

  if (url === "/api/admin/status" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(req)) {
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

  if (url === "/api/admin/dashboard" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(req)) {
      writeJson(res, { ok: false, error: "Unauthorized" }, 401);
      return;
    }
    if (method === "HEAD") {
      res.writeHead(200, { "Cache-Control": "no-store" });
      res.end();
      return;
    }
    try {
      const dashboard = await getOperationsDashboard(env.DB);
      writeJson(res, { ok: true, ...dashboard });
    } catch (error) {
      console.error("[Admin Dashboard] query failed", error);
      writeJson(res, { ok: false, error: "Dashboard data unavailable" }, 503);
    }
    return;
  }

  if (url === "/api/admin/tickets") {
    if (!adminAuthorized(req)) {
      writeJson(res, { ok: false, error: "Unauthorized" }, 401);
      return;
    }
    if (method === "GET") {
      const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const status = parsedUrl.searchParams.get("status") as "OPEN" | "PENDING" | "CLOSED" | null;
      const tickets = await getSupportTickets(env.DB, status || undefined);
      writeJson(res, { ok: true, tickets });
      return;
    }
    if (method === "PATCH") {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", async () => {
        try {
          const parsed = JSON.parse(body || "{}");
          if (!parsed.id || !parsed.status || !parsed.adminId) {
            writeJson(res, { ok: false, error: "id, status and adminId are required" }, 400);
            return;
          }
          const updated = await updateSupportTicket(env.DB, parsed.id, parsed.status, parsed.reply || null, parsed.adminId);
          writeJson(res, { ok: updated }, updated ? 200 : 404);
        } catch {
          writeJson(res, { ok: false, error: "Invalid JSON" }, 400);
        }
      });
      return;
    }
    writeJson(res, { ok: false, error: "Method Not Allowed" }, 405);
    return;
  }

  if (url === "/api/admin/schedule") {
    if (!adminAuthorized(req)) {
      writeJson(res, { ok: false, error: "Unauthorized" }, 401);
      return;
    }
    if (method !== "POST") {
      writeJson(res, { ok: false, error: "Method Not Allowed" }, 405);
      return;
    }
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        if (!parsed.title || !parsed.body || !parsed.scheduledFor || !parsed.createdBy) {
          writeJson(res, { ok: false, error: "title, body, scheduledFor and createdBy are required" }, 400);
          return;
        }
        const id = await createScheduledChannelPost(env.DB, {
          title: parsed.title,
          body: parsed.body,
          mediaUrl: parsed.mediaUrl,
          ctaText: parsed.ctaText,
          ctaUrl: parsed.ctaUrl,
          language: parsed.language,
          scheduledFor: parsed.scheduledFor,
          createdBy: parsed.createdBy,
        });
        writeJson(res, { ok: true, id }, 201);
      } catch {
        writeJson(res, { ok: false, error: "Invalid JSON" }, 400);
      }
    });
    return;
  }

  if (url === "/api/cleanup/logs" && method === "POST") {
    if (!adminAuthorized(req)) {
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

  // HTML landing page for all web browsers and preview frames
  if (method === "GET" || method === "HEAD") {
    const host = req.headers.host || `localhost:${PORT}`;
    const fullUrl = `http://${host}${req.url || "/"}`;
    const webReq = new Request(fullUrl, {
      method,
      headers: req.headers as Record<string, string>,
    });
    const html = renderLandingPage(env, webReq);
    const headers = landingPageSecurityHeaders();
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      ...headers,
    });
    if (method === "HEAD") {
      res.end();
    } else {
      res.end(html);
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
  res.end("Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`[XBet Bot Server] Running on http://${HOST}:${PORT}`);
});
