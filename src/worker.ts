import { webhookCallback } from "grammy";
import { createBot, executionContextStorage } from "./bot";
import { logBotError } from "./logger";
import { cleanupOldR2Logs } from "./logCleanup";
import { runScheduledTip, runOddsApiHealthCheck, runControlledOddsRefresh, TIPS_CRONS } from "./tips";
import { settlePendingTips } from "./tipsSettlement";
import { upsertLiveScoreEvents, updateLiveScoresForActiveTips } from "./liveScores";
import { maybePostDailyPerformanceRecap } from "./tipsPerformance";
import { getPublicTips, publicTipsClientScript } from "./publicTips";
import { assertValidEnv, constantTimeEqual, validateEnv } from "./config";
import { landingPageSecurityHeaders, securityHeaders, webhookRequestAllowed } from "./security";
import { renderLandingPage, trustedPublicBaseUrl } from "./landingPage";
import { handleApiRequest, json } from "./apiRoutes";
import { getPublicStatus } from "./publicStatus";
import { buildSeoGuideSitemapEntries, renderSeoContentPage, resolveSeoGuidePath } from "./seoContentPages";
import { cleanupExpiredRateLimitBuckets } from "./db";
import { logEvent, requestId, withRequestId } from "./observability";
import type { Env, ExecutionContext, ScheduledEvent } from "./types";

export const WORKER_CRONS = {
  FREE_TIPS: [TIPS_CRONS.SL_0800, TIPS_CRONS.SL_1200, TIPS_CRONS.SL_1800] as const,
  R2_CLEANUP: "0 2 * * *" as const,
  // One combined trigger stays within the Workers Free five-cron account limit.
  // Settlement runs every five minutes; health checks run at :07/:22/:37/:52.
  MAINTENANCE: "*/5,7,22,37,52 * * * *" as const,
};

let botInstance: ReturnType<typeof createBot> | null = null;
let cachedToken: string | null = null;
let webhookHandler: ((request: Request) => Promise<Response>) | null = null;

const publicCommands = [
  { command: "start", description: "Start the bot" }, { command: "menu", description: "Open the main menu" },
  { command: "tips", description: "View latest free betting tips" }, { command: "scores", description: "Live match scores & results" },
  { command: "odds", description: "Best odds finder across bookmakers" }, { command: "deposit", description: "Start a cash deposit" },
  { command: "confirm_deposit", description: "Confirm a deposit" }, { command: "withdraw", description: "Start a cash withdrawal" },
  { command: "register", description: "Open 1xBet registration" }, { command: "referrals", description: "Open referral dashboard" },
  { command: "history", description: "View transaction history" }, { command: "dashboard", description: "Open your user dashboard" },
  { command: "ticket", description: "Create a support ticket" }, { command: "safety", description: "Responsible gaming settings" },
  { command: "id", description: "View your Telegram ID" }, { command: "language", description: "Change language" },
  { command: "help", description: "Open help and support" }, { command: "cancel", description: "Cancel current operation" },
];
const sinhalaCommands = [
  { command: "start", description: "Bot එක ආරම්භ කරන්න" }, { command: "menu", description: "ප්‍රධාන මෙනුව විවෘත කරන්න" },
  { command: "tips", description: "නවතම Free Betting Tips බලන්න" }, { command: "scores", description: "සජීවී තරග ලකුණු (Live Scores) බලන්න" },
  { command: "odds", description: "හොඳම Odds සසඳා බලන්න (Best Odds)" }, { command: "deposit", description: "මුදල් තැන්පතුවක් ආරම්භ කරන්න" },
  { command: "confirm_deposit", description: "තැන්පතුව තහවුරු කරන්න" }, { command: "withdraw", description: "මුදල් ලබාගැනීම ආරම්භ කරන්න" },
  { command: "register", description: "1xBet ලියාපදිංචිය විවෘත කරන්න" }, { command: "referrals", description: "Referral Dashboard විවෘත කරන්න" },
  { command: "history", description: "ගනුදෙනු ඉතිහාසය බලන්න" }, { command: "dashboard", description: "ඔබේ Dashboard එක බලන්න" },
  { command: "ticket", description: "Support ticket එකක් සාදන්න" }, { command: "safety", description: "වගකීම් සහගත ක්‍රීඩා" },
  { command: "id", description: "ඔබේ Telegram ID බලන්න" }, { command: "language", description: "භාෂාව වෙනස් කරන්න" },
  { command: "help", description: "උදව් සහ Support විවෘත කරන්න" }, { command: "cancel", description: "දැනට ඇති ක්‍රියාව අවලංගු කරන්න" },
];
const tamilCommands = [
  { command: "start", description: "போட்டை தொடங்கவும்" }, { command: "menu", description: "முதன்மை மெனுவைத் திறக்கவும்" },
  { command: "tips", description: "சமீபத்திய இலவச குறிப்புகளைப் பார்க்கவும்" }, { command: "scores", description: "நேரடி போட்டி முடிவுகள் (Live Scores)" },
  { command: "odds", description: "சிறந்த Odds ஒப்பீடு (Best Odds)" }, { command: "deposit", description: "பண வைப்பு தொடங்கவும்" },
  { command: "confirm_deposit", description: "வைப்பை உறுதிப்படுத்தவும்" }, { command: "withdraw", description: "பணம் பெறும் செயல்முறையை தொடங்கவும்" },
  { command: "register", description: "1xBet பதிவு திறக்கவும்" }, { command: "referrals", description: "Referral Dashboard திறக்கவும்" },
  { command: "history", description: "பரிவர்த்தனை வரலாற்றைப் பார்க்கவும்" }, { command: "dashboard", description: "உங்கள் Dashboard பார்க்கவும்" },
  { command: "ticket", description: "Support ticket உருவாக்கவும்" }, { command: "safety", description: "பொறுப்பான விளையாட்டு" },
  { command: "id", description: "உங்கள் Telegram ID பார்க்கவும்" }, { command: "language", description: "மொழியை மாற்றவும்" },
  { command: "help", description: "உதவி மற்றும் Support திறக்கவும்" }, { command: "cancel", description: "தற்போதைய செயல்முறையை ரத்து செய்யவும்" },
];

async function registerBotCommands(bot: ReturnType<typeof createBot>): Promise<void> {
  await Promise.all([
    bot.api.setMyCommands(publicCommands),
    bot.api.setMyCommands(sinhalaCommands, { language_code: "si" }),
    bot.api.setMyCommands(tamilCommands, { language_code: "ta" }),
  ]);
}

/**
 * Validates critical environment variables at startup before processing requests.
 * Throws a descriptive configuration error if mandatory keys or bindings are missing.
 */
export function validateWorkerStartupEnv(env: Partial<Env>): void {
  const criticalErrors: string[] = [];

  if (!env || typeof env !== "object") {
    throw new Error("[Worker Startup Validation Error] Worker environment bindings object is missing or invalid.");
  }

  // 1. Mandatory Telegram Bot & Webhook secrets
  if (!env.BOT_TOKEN || typeof env.BOT_TOKEN !== "string" || !env.BOT_TOKEN.trim()) {
    criticalErrors.push("BOT_TOKEN is missing or empty. Please set it via `wrangler secret put BOT_TOKEN` or environment variables.");
  }
  if (!env.WEBHOOK_SECRET || typeof env.WEBHOOK_SECRET !== "string" || !env.WEBHOOK_SECRET.trim()) {
    criticalErrors.push("WEBHOOK_SECRET is missing or empty. Please set it via `wrangler secret put WEBHOOK_SECRET` (min 16 characters).");
  } else if (env.WEBHOOK_SECRET.trim().length < 16) {
    criticalErrors.push(`WEBHOOK_SECRET must be at least 16 characters long (current length: ${env.WEBHOOK_SECRET.trim().length}).`);
  }

  // 2. Mandatory Admin configuration
  if (!env.ADMIN_IDS || typeof env.ADMIN_IDS !== "string" || !env.ADMIN_IDS.trim()) {
    criticalErrors.push("ADMIN_IDS is missing or empty. Provide comma-separated numeric Telegram admin user IDs.");
  }

  // 3. Mandatory D1 Database binding
  if (!env.DB || typeof env.DB.prepare !== "function") {
    criticalErrors.push("DB (Cloudflare D1 Database binding) is missing or unconfigured. Verify `[[d1_databases]]` in wrangler.toml.");
  }

  // 4. Run general environment validation for formatting & dependencies
  const generalValidationErrors = validateEnv(env);
  for (const err of generalValidationErrors) {
    if (!criticalErrors.includes(err)) {
      criticalErrors.push(err);
    }
  }

  if (criticalErrors.length > 0) {
    const formattedErrors = criticalErrors.map((err) => `  • ${err}`).join("\n");
    throw new Error(`[Worker Startup Validation Error] Critical configuration missing or invalid:\n${formattedErrors}`);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const id = requestId();
    const started = Date.now();
    const finish = (response: Response): Response => {
      logEvent({ event: "request", requestId: id, method: request.method, route: new URL(request.url).pathname, status: response.status, durationMs: Date.now() - started });
      return withRequestId(response, id);
    };

    try {
      // Perform worker startup validation check before dispatching routes
      validateWorkerStartupEnv(env);
    } catch (startupErr) {
      console.error("[Worker Startup Failure]", startupErr instanceof Error ? startupErr.message : String(startupErr));
      return finish(json({
        ok: false,
        error: "Worker Startup Configuration Error",
        message: startupErr instanceof Error ? startupErr.message : "Required environment variables or bindings are missing.",
        requestId: id,
      }, 503));
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method.toUpperCase();

      // Normalize locale route spelling to one canonical URL per language.
      if ((method === "GET" || method === "HEAD") && /^\/(si|en|ta)\/?$/i.test(path)) {
        const locale = path.split("/").filter(Boolean)[0].toLowerCase();
        const canonicalPath = locale === "si" ? "/" : "/" + locale + "/";
        if (path !== canonicalPath) {
          url.pathname = canonicalPath;
          return finish(new Response(null, {
            status: 301,
            headers: { Location: url.toString(), "Cache-Control": "public, max-age=86400" },
          }));
        }
      }

      // Permanently migrate legacy query-string locale URLs to clean locale paths.
      if (path === "/" && (method === "GET" || method === "HEAD")) {
        const legacyLang = url.searchParams.get("lang")?.toLowerCase();
        if (legacyLang === "en" || legacyLang === "ta" || legacyLang === "si") {
          url.searchParams.delete("lang");
          url.pathname = legacyLang === "si" ? "/" : `/${legacyLang}/`;
          return finish(new Response(null, {
            status: 301,
            headers: { Location: url.toString(), "Cache-Control": "public, max-age=86400" },
          }));
        }
      }

      // Serve localized, server-rendered SEO guides before static-asset fallback.
      if (method === "GET" || method === "HEAD") {
        const guideRoute = resolveSeoGuidePath(path);
        if (guideRoute && path !== guideRoute.canonicalPath) {
          url.pathname = guideRoute.canonicalPath;
          return finish(new Response(null, {
            status: 301,
            headers: { Location: url.toString(), "Cache-Control": "public, max-age=86400" },
          }));
        }
        if (guideRoute) {
          if (env.BOT_MODE === "production" && !trustedPublicBaseUrl(env, request)) {
            return finish(new Response("Service configuration error", { status: 503, headers: securityHeaders() }));
          }
          const nonce = crypto.randomUUID().replace(/-/g, "");
          const html = renderSeoContentPage(env, request, nonce);
          if (html) {
            const headers = { "Content-Type": "text/html; charset=utf-8", ...landingPageSecurityHeaders(nonce, { isHttps: url.protocol === "https:" }) };
            return finish(new Response(method === "HEAD" ? null : html, { status: 200, headers }));
          }
        }
      }

      if (path === "/api/status" && (method === "GET" || method === "HEAD")) {
        const headers = { "Cache-Control": "no-store", ...securityHeaders() };
        if (method === "HEAD") return finish(new Response(null, { status: 200, headers }));
        return finish(json(getPublicStatus(env, "cf-worker"), 200, headers));
      }

      // Robots directive (/robots.txt) dynamically generated based on PUBLIC_BASE_URL for SEO indexing
      if (path === "/robots.txt" && (method === "GET" || method === "HEAD")) {
        const baseUrl = (env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "") || trustedPublicBaseUrl(env, request) || "https://fastxbet.lk";
        const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /panel
Disallow: /api/
Disallow: /go/

Sitemap: ${baseUrl}/sitemap.xml
`;
        const headers: Record<string, string> = {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
          "Access-Control-Allow-Origin": "*",
        };
        if (method === "HEAD") return finish(new Response(null, { status: 200, headers }));
        return finish(new Response(body, { status: 200, headers }));
      }

      // XML Sitemap (/sitemap.xml) dynamically generated based on PUBLIC_BASE_URL with hreflang tags
      if (path === "/sitemap.xml" && (method === "GET" || method === "HEAD")) {
        const baseUrl = (env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "") || trustedPublicBaseUrl(env, request) || "https://fastxbet.lk";
        const homeUrls = [
          { lang: "si", url: `${baseUrl}/` },
          { lang: "en", url: `${baseUrl}/en/` },
          { lang: "ta", url: `${baseUrl}/ta/` },
        ];
        const alternates = [
          ...homeUrls.map(({ lang, url }) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${url}"/>`),
          `<xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/"/>`,
        ].join("\n    ");
        const homeEntries = homeUrls.map(({ url }) => `  <url>
    <loc>${url}</loc>
    ${alternates}
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`).join("\n");
        const guideEntries = buildSeoGuideSitemapEntries(baseUrl);
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${homeEntries}
  <url>
    <loc>${baseUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
${guideEntries}
</urlset>`;
        const headers: Record<string, string> = {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
          "Access-Control-Allow-Origin": "*",
        };
        if (method === "HEAD") return finish(new Response(null, { status: 200, headers }));
        return finish(new Response(body, { status: 200, headers }));
      }

      // Public read-only landing-page feed. Only sanitized tip fields and a 7-day
      // settlement summary are exposed; no Telegram IDs, payment data, or secrets.
      if (path === "/api/tips/preview" && (method === "GET" || method === "HEAD")) {
        const headers = { "Cache-Control": "no-store", ...securityHeaders() };
        if (method === "HEAD") return finish(new Response(null, { status: 200, headers }));
        const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "12", 10);
        const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 20)) : 12;
        return finish(json(await getPublicTips(env, limit), 200, headers));
      }

      const apiResponse = await handleApiRequest(request, env, { runtime: "cf-worker", ...(ctx ? { executionContext: ctx } : {}) });
      if (apiResponse) return finish(apiResponse);

      if (method === "GET" || method === "HEAD") {
        const isLocaleLanding = /^\/(si|en|ta)\/?$/i.test(path);
        if (path !== "/" && !isLocaleLanding) {
          if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
            try {
              const assetRes = await env.ASSETS.fetch(request);
              if (assetRes && assetRes.status !== 404) {
                const headers = new Headers(assetRes.headers);
                const currentCache = headers.get("Cache-Control");
                if (!currentCache || currentCache.includes("max-age=0") || currentCache.includes("no-cache")) {
                  headers.set("Cache-Control", "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400");
                }
                return finish(new Response(assetRes.body, { status: assetRes.status, headers }));
              }
            } catch {}
          }
          const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...securityHeaders() };
          return finish(new Response(method === "HEAD" ? null : "Not Found", { status: 404, headers }));
        }
        if (env.BOT_MODE === "production" && !trustedPublicBaseUrl(env, request)) {
          return finish(new Response("Service configuration error", { status: 503, headers: securityHeaders() }));
        }
        const nonce = crypto.randomUUID().replace(/-/g, "");
        const html = renderLandingPage(env, request, nonce).replace(
          "</body>",
          publicTipsClientScript(nonce) + "</body>"
        );
        return finish(new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8", ...landingPageSecurityHeaders(nonce, { isHttps: new URL(request.url).protocol === "https:" }) },
        }));
      }

      try {
        assertValidEnv(env, "Cloudflare Worker");
      } catch (err) {
        console.error("[Worker Config Error]", err instanceof Error ? err.message : String(err));
        return finish(json({ ok: false, error: "Service configuration error" }, 503));
      }

      if (!webhookRequestAllowed(request)) return finish(new Response("bad request", { status: 400, headers: securityHeaders() }));

      const incomingSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
      const expectedSecret = env.WEBHOOK_SECRET?.trim() || "";
      if (!incomingSecret || !constantTimeEqual(incomingSecret, expectedSecret)) {
        return finish(new Response("unauthorized", { status: 401, headers: securityHeaders() }));
      }

      if (!botInstance || cachedToken !== env.BOT_TOKEN) {
        botInstance = createBot(env);
        cachedToken = env.BOT_TOKEN;
        webhookHandler = webhookCallback(botInstance, "cloudflare-mod", { timeoutMilliseconds: 25000 }) as (request: Request) => Promise<Response>;
        const commandRegistration = registerBotCommands(botInstance).catch((err) => console.error("[Telegram Commands] Registration failed:", err));
        if (ctx?.waitUntil) ctx.waitUntil(commandRegistration);
      }

      try {
        const store = { ...(ctx ?? {}), env };
        return finish(await executionContextStorage.run(store, async () => await webhookHandler!(request)));
      } catch (err) {
        console.error("[Worker Webhook Error]:", err);
        logBotError(env, { source: "WorkerWebhookFetch", message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined, context: { flow: "worker_webhook_fetch" } }, ctx?.waitUntil?.bind(ctx));
        // Telegram retries webhook updates when it receives a 5xx response.
        // Acknowledge only successful processing; returning 200 here silently drops failed updates.
        return finish(json({ ok: false, error: "Webhook processing failed", requestId: id }, 500));
      }
    } catch (err) {
      logEvent({ event: "error", requestId: id, method: request.method, route: new URL(request.url).pathname, status: 500, durationMs: Date.now() - started, error: err instanceof Error ? err.message : String(err) });
      return finish(json({ ok: false, error: "Internal server error", requestId: id }, 500));
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx?: ExecutionContext): Promise<void> {
    assertValidEnv(env, "Cloudflare Worker cron");
    const cron = String(event?.cron || "").trim();
    logEvent({ event: "cron", cron });

    const tasks: Promise<unknown>[] = [];
    if ((WORKER_CRONS.FREE_TIPS as readonly string[]).includes(cron)) {
      tasks.push(runScheduledTip(env, cron)
        .then((result) => console.log(`[Worker Cron] Free tip ${result.status} for ${result.slot} Sri Lanka time`))
        .catch((err) => console.error("[Worker Cron] Free tip publishing failed:", err)));
    } else if (cron === WORKER_CRONS.MAINTENANCE) {
      const minute = new Date(event.scheduledTime).getUTCMinutes();
      // Run Odds API score settlement once per hour (:37) with a 95-minute kickoff maturity gate
      // so live matches aren't polled every 5 minutes and free-plan credits aren't burned.
      if (minute === 37) {
        tasks.push(
          settlePendingTips(env, { minMatchAgeMinutes: 95, maxMatchAgeHours: 76 })
            .then(async (summary) => {
              console.log(`[Worker Cron] Tips settlement completed: posts=${summary.settledPosts}/${summary.checkedPosts}, won=${summary.wonPicks}, lost=${summary.lostPicks}, void=${summary.voidPicks}, tgUpdates=${summary.editedTelegramMessages}, retryQueued=${summary.requeuedBackoff}`);
              if (summary.fetchedScoreEvents && summary.fetchedScoreEvents.length > 0) {
                await upsertLiveScoreEvents(env, summary.fetchedScoreEvents)
                  .catch((err) => console.warn("[Worker Cron] Live scores cache upsert warning:", err));
              }
              await updateLiveScoresForActiveTips(env, new Set(summary.fetchedSports || []))
                .then((res) => console.log(`[Worker Cron] Hourly live scores: tracked=${res.trackedMatches}, fetched=${res.sportsFetched}, channelUpdates=${res.channelNotifications}`))
                .catch((err) => console.warn("[Worker Cron] Hourly live scores warning:", err));
              await maybePostDailyPerformanceRecap(env)
                .then((recap) => { if (recap.posted) console.log(`[Worker Cron] Nightly performance recap posted for ${recap.date}`); })
                .catch((err) => console.warn("[Worker Cron] Daily performance recap warning:", err));
              await runControlledOddsRefresh(env)
                .then((ref) => { if (ref.refreshed) console.log(`[Worker Cron] Controlled odds refresh: snapshots=${ref.snapshotsSaved}, alerts=${ref.alertsSent}`); })
                .catch((err) => console.warn("[Worker Cron] Controlled odds refresh warning:", err));
            })
            .catch((err) => console.error("[Worker Cron] Tips settlement failed:", err))
        );
      }

      if ([7, 22, 37, 52].includes(minute)) {
        tasks.push(runOddsApiHealthCheck(env)
          .then(() => console.log("[Worker Cron] Odds API health check completed"))
          .catch((err) => console.error("[Worker Cron] Odds API health check failed:", err)));
      }
    } else if (cron === WORKER_CRONS.R2_CLEANUP) {
      tasks.push(cleanupOldR2Logs(env, 30)
        .then((res) => console.log(`[Worker Cron] R2 cleanup: scanned=${res.totalScanned}, deleted=${res.totalDeleted}, freed=${(res.bytesFreed / 1024).toFixed(2)}KB, duration=${res.durationMs}ms`))
        .catch((err) => console.error("[Worker Cron] R2 cleanup failed:", err)));
      tasks.push(cleanupExpiredRateLimitBuckets(env.DB)
        .then((deleted) => console.log(`[Worker Cron] Rate-limit bucket cleanup: deleted=${deleted}`))
        .catch((err) => console.error("[Worker Cron] Rate-limit bucket cleanup failed:", err)));
    } else {
      console.warn(`[Worker Cron ALERT] Unmapped scheduled cron trigger received: "${cron}". Check wrangler.toml triggers!`);
    }
    if (tasks.length === 0) return;
    const task = Promise.all(tasks).then(() => undefined);
    if (ctx?.waitUntil) ctx.waitUntil(task); else await task;
  },
};
