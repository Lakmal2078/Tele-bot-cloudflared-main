import { webhookCallback } from "grammy";
import { createBot, executionContextStorage } from "./bot";
import { logBotError } from "./logger";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { hasR2Binding, hasS3Credentials } from "./storage";
import { runScheduledTip } from "./tips";
import type { Env } from "./types";

let botInstance: ReturnType<typeof createBot> | null = null;
let cachedToken: string | null = null;
let webhookHandler: ((request: Request) => Promise<Response>) | null = null;

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health" || url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          runtime: "cloudflare-workers",
          botConfigured: Boolean(env.BOT_TOKEN),
          databaseBound: Boolean(env.DB),
          storage: hasR2Binding(env) ? "r2-binding" : hasS3Credentials(env) ? "r2-s3-api" : "none",
          webhookSecretSet: Boolean(env.WEBHOOK_SECRET),
          tipsConfigured: Boolean(env.TIPS_CHANNEL_ID && env.ODDS_API_KEY),
          time: new Date().toISOString(),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.pathname === "/api/cleanup/logs/status") {
      const last = getLastCleanupResult();
      return new Response(
        JSON.stringify({
          status: "ok",
          retentionPolicyDays: 30,
          schedule: "Daily at 02:00 UTC (Cloudflare Cron)",
          lastCleanup: last,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.pathname === "/api/cleanup/logs" && request.method === "POST") {
      let days = 30;
      try {
        const body = (await request.json().catch(() => ({}))) as { retentionDays?: number };
        if (body?.retentionDays && body.retentionDays > 0) days = body.retentionDays;
      } catch {}

      const cleanupPromise = cleanupOldR2Logs(env, days);
      if (ctx?.waitUntil) ctx.waitUntil(cleanupPromise);
      const result = await cleanupPromise;

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      if (!env.BOT_TOKEN) {
        return new Response(JSON.stringify({ ok: false, error: "BOT_TOKEN not configured" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const incomingSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
      const expectedSecret = (env.WEBHOOK_SECRET || "").trim();
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
        return await executionContextStorage.run(ctx, async () => await webhookHandler!(request));
      } catch (err) {
        console.error("[Worker Webhook Error]:", err);
        logBotError(
          env,
          {
            source: "WorkerWebhookFetch",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            context: { flow: "worker_webhook_fetch" },
          },
          ctx?.waitUntil?.bind(ctx)
        );
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

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
    <p style="margin-top: 1.5rem; font-size: 0.9rem; color: #94a3b8;">Send POST requests with Telegram Webhook payloads to this URL.</p>
  </div>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  },

  /**
   * Cloudflare Cron Trigger handler.
   * 02:30 / 06:30 / 12:30 UTC are 08:00 / 12:00 / 18:00 in Sri Lanka (UTC+05:30).
   * The legacy 02:00 UTC R2 cleanup remains handled on any non-tip cron only when configured separately.
   */
  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
    const cron = String(event?.cron || "");
    console.log(`[Worker Cron] Scheduled event at ${new Date().toISOString()}: ${cron || "unknown"}`);

    const tasks: Promise<unknown>[] = [];

    if (["30 2 * * *", "30 6 * * *", "30 12 * * *"].includes(cron)) {
      tasks.push(
        runScheduledTip(env, cron)
          .then((result) => console.log(`[Worker Cron] Free tip ${result.status} for ${result.slot} Sri Lanka time`))
          .catch((err) => console.error("[Worker Cron] Free tip publishing failed:", err))
      );
    }

    // Keep daily R2 retention cleanup at 02:00 UTC without interfering with tip slots.
    if (cron === "0 2 * * *") {
      tasks.push(
        cleanupOldR2Logs(env, 30)
          .then((res) => {
            console.log(
              `[Worker Cron] R2 cleanup: scanned=${res.totalScanned}, deleted=${res.totalDeleted}, freed=${(
                res.bytesFreed / 1024
              ).toFixed(2)}KB, duration=${res.durationMs}ms`
            );
          })
          .catch((err) => console.error("[Worker Cron] R2 cleanup failed:", err))
      );
    }

    if (tasks.length === 0) {
      console.warn(`[Worker Cron] No scheduled task mapped to cron: ${cron}`);
      return;
    }

    const task = Promise.all(tasks).then(() => undefined);
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  },
};
