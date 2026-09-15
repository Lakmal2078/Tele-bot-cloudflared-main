import { webhookCallback } from "grammy";
import { createBot, executionContextStorage } from "./bot";
import { logBotError } from "./logger";
import { cleanupOldR2Logs } from "./logCleanup";
import { runScheduledTip } from "./tips";
import { assertValidEnv, constantTimeEqual } from "./config";
import { landingPageSecurityHeaders, securityHeaders, webhookRequestAllowed } from "./security";
import { renderLandingPage } from "./landingPage";
import { handleApiRequest, json } from "./apiRoutes";
import type { Env } from "./types";

export const WORKER_CRONS = {
  FREE_TIPS: ["30 2 * * *", "30 6 * * *", "30 12 * * *"] as const,
  R2_CLEANUP: "0 2 * * *" as const,
};

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
  { command: "dashboard", description: "Open your user dashboard" },
  { command: "ticket", description: "Create a support ticket" },
  { command: "safety", description: "Responsible gaming settings" },
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
  { command: "dashboard", description: "ඔබේ Dashboard එක බලන්න" },
  { command: "ticket", description: "Support ticket එකක් සාදන්න" },
  { command: "safety", description: "වගකීම් සහගත ක්‍රීඩා" },
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
  { command: "dashboard", description: "உங்கள் Dashboard பார்க்கவும்" },
  { command: "ticket", description: "Support ticket உருவாக்கவும்" },
  { command: "safety", description: "பொறுப்பான விளையாட்டு" },
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

export default {
  async fetch(request: Request, env: Env, ctx?: any): Promise<Response> {
    // 1. Dispatch shared API routes (health, dashboard, tickets, schedule, receipts, cleanup)
    const apiResponse = await handleApiRequest(request, env, { runtime: "cf-worker" });
    if (apiResponse) {
      return apiResponse;
    }

    // 2. Serve public Landing page for GET and HEAD requests
    if (request.method !== "POST") {
      const nonce = crypto.randomUUID().replace(/-/g, "");
      return new Response(
        renderLandingPage(env, request, nonce),
        { headers: { "Content-Type": "text/html; charset=utf-8", ...landingPageSecurityHeaders(nonce) } }
      );
    }

    // 3. Process POST requests (Telegram Webhook)
    try {
      assertValidEnv(env, "Cloudflare Worker");
    } catch (err) {
      console.error("[Worker Config Error]", err instanceof Error ? err.message : String(err));
      return json({
        ok: false,
        error: "Service configuration error",
        details: err instanceof Error ? err.message : String(err),
      }, 503);
    }

    if (!webhookRequestAllowed(request)) {
      return new Response("bad request", { status: 400, headers: securityHeaders() });
    }

    const incomingSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    const expectedSecret = env.WEBHOOK_SECRET?.trim() || "";
    if (!incomingSecret || !constantTimeEqual(incomingSecret, expectedSecret)) {
      return new Response("unauthorized", { status: 401, headers: securityHeaders() });
    }

    if (!botInstance || cachedToken !== env.BOT_TOKEN) {
      botInstance = createBot(env);
      cachedToken = env.BOT_TOKEN;
      webhookHandler = null;
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
  },

  async scheduled(event: any, env: Env, ctx: any): Promise<void> {
    assertValidEnv(env, "Cloudflare Worker cron");

    const cron = String(event?.cron || "").trim();
    console.log(`[Worker Cron] Scheduled event at ${new Date().toISOString()}: ${cron || "unknown"}`);

    const tasks: Promise<unknown>[] = [];
    if (WORKER_CRONS.FREE_TIPS.includes(cron as any)) {
      tasks.push(
        runScheduledTip(env, cron)
          .then((result) => console.log(`[Worker Cron] Free tip ${result.status} for ${result.slot} Sri Lanka time`))
          .catch((err) => console.error("[Worker Cron] Free tip publishing failed:", err))
      );
    } else if (cron === WORKER_CRONS.R2_CLEANUP) {
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
    } else {
      console.warn(`[Worker Cron ALERT] Unmapped scheduled cron trigger received: "${cron}". Check wrangler.toml triggers!`);
    }

    if (tasks.length === 0) {
      return;
    }

    const task = Promise.all(tasks).then(() => undefined);
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  },
};
