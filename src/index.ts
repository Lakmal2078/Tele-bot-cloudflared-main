import http from "node:http";
import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { createD1Database } from "./sqlite-d1";
import { logBotError } from "./logger";
import { validateEnv } from "./config";
import { landingPageSecurityHeaders } from "./security";
import { renderLandingPage } from "./landingPage";
import { handleApiRequest } from "./apiRoutes";
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

async function nodeToWebRequest(req: http.IncomingMessage, hostHeader: string): Promise<Request> {
  const url = new URL(req.url || "/", `http://${hostHeader}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) headers.append(k, item);
    } else {
      headers.set(k, v);
    }
  }

  const method = (req.method || "GET").toUpperCase();
  const init: RequestInit = { method, headers };

  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    init.body = Buffer.concat(chunks);
  }

  return new Request(url.toString(), init);
}

async function sendWebResponse(res: http.ServerResponse, webRes: Response): Promise<void> {
  res.statusCode = webRes.status;
  res.statusMessage = webRes.statusText;
  webRes.headers.forEach((val, key) => {
    res.setHeader(key, val);
  });
  if (webRes.body) {
    const buf = Buffer.from(await webRes.arrayBuffer());
    res.end(buf);
  } else {
    res.end();
  }
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
  const host = req.headers.host || `localhost:${PORT}`;

  try {
    const webReq = await nodeToWebRequest(req, host);

    // 1. Dispatch shared API routes (health, dashboard, tickets, schedule, receipts, cleanup)
    const apiResponse = await handleApiRequest(webReq, env, {
      runtime: "node",
      isPolling: usePolling,
    });
    if (apiResponse) {
      await sendWebResponse(res, apiResponse);
      return;
    }

    // 2. Telegram Webhook handling
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

    // 3. HTML landing page with CSP cryptographic nonce
    if (method === "GET" || method === "HEAD") {
      const nonce = crypto.randomUUID().replace(/-/g, "");
      const html = renderLandingPage(env, webReq, nonce);
      const headers = landingPageSecurityHeaders(nonce);
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
  } catch (err) {
    console.error("[Server Error]:", err);
    if (!res.writableEnded) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Internal Server Error" }));
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[XBet Bot Server] Running on http://${HOST}:${PORT}`);
});
