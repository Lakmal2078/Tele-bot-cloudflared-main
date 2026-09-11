import { webhookCallback } from "grammy";
import { createBot, executionContextStorage } from "./bot";
import { logBotError } from "./logger";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { runScheduledTip } from "./tips";
import { assertValidEnv, isAuthorizedAdminRequest, unauthorizedResponse } from "./config";
import type { Env } from "./types";

let botInstance: ReturnType<typeof createBot> | null = null;
let cachedToken: string | null = null;
let webhookHandler: ((request: Request) => Promise<Response>) | null = null;

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    const url = new URL(request.url);

    // Public liveness only. Never expose configuration, secret presence, storage state,
    // admin IDs, database state, or tip configuration from an unauthenticated endpoint.
    if (url.pathname === "/health" || url.pathname === "/api/health") {
      return json({ status: "ok", service: "telegram-bot" });
    }

    // All operational/diagnostic endpoints are private and use a dedicated admin API secret.
    if (url.pathname === "/api/cleanup/logs/status") {
      if (!isAuthorizedAdminRequest(request, env)) return unauthorizedResponse();
      const last = getLastCleanupResult();
      return json({
        status: "ok",
        retentionPolicyDays: 30,
        schedule: "Daily at 02:00 UTC (Cloudflare Cron)",
        lastCleanup: last,
      });
    }

    if (url.pathname === "/api/cleanup/logs" && request.method === "POST") {
      if (!isAuthorizedAdminRequest(request, env)) return unauthorizedResponse();

      let days = 30;
      try {
        const body = (await request.json().catch(() => ({}))) as { retentionDays?: number };
        if (body?.retentionDays && body.retentionDays > 0 && body.retentionDays <= 3650) {
          days = Math.floor(body.retentionDays);
        }
      } catch {}

      const cleanupPromise = cleanupOldR2Logs(env, days);
      if (ctx?.waitUntil) ctx.waitUntil(cleanupPromise);
      const result = await cleanupPromise;

      return json(result, result.success ? 200 : 500);
    }

    // Fail closed before accepting any webhook traffic.
    try {
      assertValidEnv(env, "Cloudflare Worker");
    } catch (err) {
      console.error("[Worker Config Error]", err instanceof Error ? err.message : String(err));
      return json({ ok: false, error: "Service configuration error" }, 503);
    }

    if (request.method === "POST") {
      const incomingSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
      const expectedSecret = env.WEBHOOK_SECRET.trim();

      // Telegram webhook authentication is fail-closed: missing, empty, or incorrect
      // secrets are all rejected. This prevents accidental public webhook exposure.
      if (!incomingSecret || incomingSecret !== expectedSecret) {
        return new Response("unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
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
        return json({ ok: true });
      }
    }

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Telegram Bot</title></head><body><h2>Telegram Bot</h2><p>Worker is online.</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    );
  },

  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
    // Cron executions are internal Cloudflare events, but configuration is still
    // validated so a broken deployment fails loudly instead of running partially.
    assertValidEnv(env, "Cloudflare Worker cron");

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
