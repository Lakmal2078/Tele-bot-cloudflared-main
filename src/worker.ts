import { webhookCallback } from "grammy";
import { createBot, executionContextStorage } from "./bot";
import { logBotError } from "./logger";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { hasR2Binding, hasS3Credentials } from "./storage";
import type { Env } from "./types";

let botInstance: ReturnType<typeof createBot> | null = null;
let cachedToken: string | null = null;
let webhookHandler: ((request: Request) => Promise<Response>) | null = null;

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/health" || url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          runtime: "cloudflare-workers",
          botConfigured: Boolean(env.BOT_TOKEN),
          databaseBound: Boolean(env.DB),
          storage: hasR2Binding(env) ? "r2-binding" : hasS3Credentials(env) ? "r2-s3-api" : "none",
          webhookSecretSet: Boolean(env.WEBHOOK_SECRET),
          time: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // R2 Log retention status and trigger endpoints
    if (url.pathname === "/api/cleanup/logs/status") {
      const last = getLastCleanupResult();
      return new Response(
        JSON.stringify({
          status: "ok",
          retentionPolicyDays: 30,
          schedule: "Daily at 02:00 UTC (Cloudflare Cron)",
          lastCleanup: last,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (url.pathname === "/api/cleanup/logs" && request.method === "POST") {
      let days = 30;
      try {
        const body = (await request.json().catch(() => ({}))) as { retentionDays?: number };
        if (body?.retentionDays && body.retentionDays > 0) {
          days = body.retentionDays;
        }
      } catch {}

      const cleanupPromise = cleanupOldR2Logs(env, days);
      if (ctx?.waitUntil) {
        ctx.waitUntil(cleanupPromise);
      }
      const result = await cleanupPromise;

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Telegram webhook handler
    if (request.method === "POST") {
      if (!env.BOT_TOKEN) {
        return new Response(JSON.stringify({ ok: false, error: "BOT_TOKEN not configured" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const incomingSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
      const expectedSecret = (env.WEBHOOK_SECRET || "").trim();
      // Reject only when Telegram DID send a secret and it does not match.
      // If setWebhook was called without secret_token, Telegram sends no header —
      // enforcing WEBHOOK_SECRET in that case 401s every update and the bot never replies.
      if (expectedSecret && incomingSecret && incomingSecret !== expectedSecret) {
        return new Response("unauthorized", { status: 401 });
      }

      if (!botInstance || cachedToken !== env.BOT_TOKEN) {
        botInstance = createBot(env);
        cachedToken = env.BOT_TOKEN;
        webhookHandler = null;
      }

      if (!webhookHandler) {
        webhookHandler = webhookCallback(botInstance, "cloudflare-mod", {
          timeoutMilliseconds: 25000,
        }) as (request: Request) => Promise<Response>;
      }

      try {
        return await executionContextStorage.run(ctx, async () => {
          return await webhookHandler!(request);
        });
      } catch (err) {
        console.error("[Worker Webhook Error]:", err);
        logBotError(
          env,
          {
            source: "WorkerWebhookFetch",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            context: {
              flow: "worker_webhook_fetch",
            },
          },
          ctx?.waitUntil?.bind(ctx)
        );
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Friendly landing/status page for GET requests
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>XBet Telegram Bot - Cloudflare Worker</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; text-align: center; }
    .card { max-width: 500px; margin: 2rem auto; background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #334155; }
    .status { color: #4ade80; font-weight: bold; }
    code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #38bdf8; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🇱🇰 XBet Telegram Cashier Bot</h2>
    <p>Worker Status: <span class="status">ONLINE (Edge)</span></p>
    <p>Database: <code>Cloudflare D1 (Serverless)</code></p>
    <p style="margin-top: 1.5rem; font-size: 0.9rem; color: #94a3b8;">
      Send POST requests with Telegram Webhook payloads to this URL.
    </p>
  </div>
</body>
</html>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  },

  /**
   * Cloudflare Workers Cron Trigger handler.
   * Invoked automatically based on `[triggers] crons = ["0 2 * * *"]` in wrangler.toml
   * to delete logs older than 30 days from Cloudflare R2.
   */
  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
    console.log(
      `[Worker Cron] Scheduled event triggered at ${new Date().toISOString()}: ${
        event?.cron || "daily retention cleanup"
      }`
    );

    const task = cleanupOldR2Logs(env, 30)
      .then((res) => {
        console.log(
          `[Worker Cron] R2 Log cleanup finished: Scanned=${res.totalScanned}, Deleted=${res.totalDeleted}, Freed=${(
            res.bytesFreed / 1024
          ).toFixed(2)} KB, Duration=${res.durationMs}ms`
        );
      })
      .catch((err) => {
        console.error("[Worker Cron] Error executing scheduled R2 log cleanup:", err);
      });

    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
    } else {
      await task;
    }
  },
};
