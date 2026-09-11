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

const publicCommands = [
  { command: "start", description: "Start the bot" },
  { command: "menu", description: "Open the main menu" },
  { command: "deposit", description: "Start a cash deposit" },
  { command: "confirm_deposit", description: "Confirm a deposit" },
  { command: "withdraw", description: "Start a cash withdrawal" },
  { command: "register", description: "Open 1xBet registration" },
  { command: "referrals", description: "Open referral dashboard" },
  { command: "history", description: "View transaction history" },
  { command: "id", description: "View your Telegram ID" },
  { command: "language", description: "Change language" },
  { command: "help", description: "Open help and support" },
  { command: "cancel", description: "Cancel current operation" },
];

const sinhalaCommands = [
  { command: "start", description: "Bot එක ආරම්භ කරන්න" },
  { command: "menu", description: "ප්‍රධාන මෙනුව විවෘත කරන්න" },
  { command: "deposit", description: "මුදල් තැන්පතුවක් ආරම්භ කරන්න" },
  { command: "confirm_deposit", description: "තැන්පතුව තහවුරු කරන්න" },
  { command: "withdraw", description: "මුදල් ලබාගැනීම ආරම්භ කරන්න" },
  { command: "register", description: "1xBet ලියාපදිංචිය විවෘත කරන්න" },
  { command: "referrals", description: "Referral Dashboard විවෘත කරන්න" },
  { command: "history", description: "ගනුදෙනු ඉතිහාසය බලන්න" },
  { command: "id", description: "ඔබේ Telegram ID බලන්න" },
  { command: "language", description: "භාෂාව වෙනස් කරන්න" },
  { command: "help", description: "උදව් සහ Support විවෘත කරන්න" },
  { command: "cancel", description: "දැනට ඇති ක්‍රියාව අවලංගු කරන්න" },
];

const tamilCommands = [
  { command: "start", description: "போட்டை தொடங்கவும்" },
  { command: "menu", description: "முதன்மை மெனுவைத் திறக்கவும்" },
  { command: "deposit", description: "பண வைப்பு தொடங்கவும்" },
  { command: "confirm_deposit", description: "வைப்பை உறுதிப்படுத்தவும்" },
  { command: "withdraw", description: "பணம் பெறும் செயல்முறையை தொடங்கவும்" },
  { command: "register", description: "1xBet பதிவு திறக்கவும்" },
  { command: "referrals", description: "Referral Dashboard திறக்கவும்" },
  { command: "history", description: "பரிவர்த்தனை வரலாற்றைப் பார்க்கவும்" },
  { command: "id", description: "உங்கள் Telegram ID பார்க்கவும்" },
  { command: "language", description: "மொழியை மாற்றவும்" },
  { command: "help", description: "உதவி மற்றும் Support திறக்கவும்" },
  { command: "cancel", description: "தற்போதைய செயல்முறையை ரத்து செய்யவும்" },
];

async function registerBotCommands(bot: ReturnType<typeof createBot>): Promise<void> {
  await Promise.all([
    bot.api.setMyCommands(publicCommands),
    bot.api.setMyCommands(sinhalaCommands, { language_code: "si" }),
    bot.api.setMyCommands(tamilCommands, { language_code: "ta" }),
  ]);
}

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

        // Register Telegram's slash-command menu once per Worker isolate/token. This is
        // intentionally best-effort and runs in waitUntil so webhook latency is unaffected.
        const commandRegistration = registerBotCommands(botInstance).catch((err) => {
          console.error("[Telegram Commands] Registration failed:", err);
        });
        if (ctx?.waitUntil) ctx.waitUntil(commandRegistration);
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
