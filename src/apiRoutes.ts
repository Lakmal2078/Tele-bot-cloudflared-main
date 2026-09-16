import type { Env } from "./types";
import { OG_IMAGE_PNG, OG_IMAGE_JPEG } from "./ogImage";
import { BRAND_LOGO_SVG, BRAND_FAVICON_PNG, BRAND_LOGO_PNG_192 } from "./brandLogo";
import { constantTimeEqual, isConfiguredAdminId, validateEnv } from "./config";
import { securityHeaders } from "./security";
import { getStats, getOperationsDashboard, getDailyFinancialTrends, getSupportTickets, updateSupportTicket, createScheduledChannelPost } from "./db";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { getObject } from "./storage";
import { settlePendingTips, getTipsPerformanceStats } from "./tipsSettlement";
import { renderAdminPage } from "./adminPage";

export function adminAuthorized(request: Request, env: Env): boolean {
  const secret = (env.ADMIN_API_SECRET || "").trim();
  if (!secret) return false;

  const authHeader = request.headers.get("Authorization");
  const directHeader = request.headers.get("x-admin-secret");

  let candidate = "";
  try {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    if (querySecret) {
      candidate = querySecret.trim();
    }
  } catch {
    // Ignore invalid URL
  }

  if (!candidate && directHeader) {
    candidate = directHeader.trim();
  } else if (!candidate && authHeader?.toLowerCase().startsWith("bearer ")) {
    candidate = authHeader.slice(7).trim();
  }

  if (!candidate || !constantTimeEqual(candidate, secret)) {
    return false;
  }

  // If client identifies as a specific admin via X-Admin-Id, verify against ADMIN_IDS
  const adminIdHeader = request.headers.get("x-admin-id");
  if (adminIdHeader) {
    const adminId = parseInt(adminIdHeader, 10);
    if (!Number.isInteger(adminId) || !isConfiguredAdminId(adminId, env)) {
      return false;
    }
  }

  return true;
}

export function renderOgImageSvg(env: Env): string {
  const channelName = env.CHANNEL_USERNAME?.trim() || "@fast_xbet_official_tips";
  const botUsername = env.BOT_USERNAME?.trim() || "@fast_1xbetcash_bot";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070b12"/>
      <stop offset="60%" stop-color="#0c1424"/>
      <stop offset="100%" stop-color="#070b12"/>
    </linearGradient>
    <radialGradient id="glow-green" cx="20%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#00e676" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#00e676" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-blue" cx="80%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#00b0ff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#00b0ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="title-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="65%" stop-color="#00e676"/>
      <stop offset="100%" stop-color="#00b0ff"/>
    </linearGradient>
    <linearGradient id="card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#162032" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0d1522" stop-opacity="0.9"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow-green)"/>
  <rect width="1200" height="630" fill="url(#glow-blue)"/>

  <!-- Border Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>

  <!-- Top Badge -->
  <g transform="translate(60, 60)">
    <rect width="440" height="42" rx="21" fill="rgba(0, 230, 118, 0.12)" stroke="rgba(0, 230, 118, 0.3)" stroke-width="1.5"/>
    <circle cx="24" cy="21" r="5" fill="#00e676"/>
    <text x="40" y="27" fill="#00e676" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" letter-spacing="1">🇱🇰 SRI LANKA'S #1 CASH AGENT &amp; TIPS</text>
  </g>

  <!-- 18+ Badge -->
  <g transform="translate(1030, 60)">
    <rect width="110" height="42" rx="21" fill="rgba(255, 82, 82, 0.12)" stroke="rgba(255, 82, 82, 0.4)" stroke-width="1.5"/>
    <text x="55" y="27" text-anchor="middle" fill="#ff5252" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800">🔞 18+</text>
  </g>

  <!-- Main Headline -->
  <text x="60" y="195" fill="url(#title-grad)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" letter-spacing="-1">
    Fast xBet Cash 🇱🇰
  </text>
  
  <text x="60" y="255" fill="#f1f5f9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700">
    Instant Deposit &amp; Withdraw · 24/7 Automated Free Tips
  </text>

  <text x="60" y="295" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="500">
    ශ්‍රී ලංකාවේ වේගවත්ම Telegram Cash Agent සේවාව සහ නොමිලේ Betting Tips
  </text>

  <!-- Key Metrics / Feature Cards -->
  <g transform="translate(60, 345)">
    <!-- Card 1 -->
    <rect x="0" y="0" width="250" height="120" rx="16" fill="url(#card-grad)" stroke="rgba(0,230,118,0.25)" stroke-width="1"/>
    <text x="24" y="44" fill="#00e676" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">⚡ 2–5 Min</text>
    <text x="24" y="78" fill="#f1f5f9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600">Average Processing</text>
    <text x="24" y="100" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">ඉක්මන් ගනුදෙනු</text>

    <!-- Card 2 -->
    <rect x="275" y="0" width="250" height="120" rx="16" fill="url(#card-grad)" stroke="rgba(0,176,255,0.25)" stroke-width="1"/>
    <text x="299" y="44" fill="#00b0ff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">👥 10,000+</text>
    <text x="299" y="78" fill="#f1f5f9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600">Active Telegram Users</text>
    <text x="299" y="100" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">විශ්වාසනීය පිරිසක්</text>

    <!-- Card 3 -->
    <rect x="550" y="0" width="250" height="120" rx="16" fill="url(#card-grad)" stroke="rgba(255,215,0,0.25)" stroke-width="1"/>
    <text x="574" y="44" fill="#ffd700" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">🎯 Daily Tips</text>
    <text x="574" y="78" fill="#f1f5f9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600">EPL, UCL, NBA, ATP</text>
    <text x="574" y="100" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">දිනකට 3 වතාවක්</text>

    <!-- Card 4 -->
    <rect x="825" y="0" width="255" height="120" rx="16" fill="url(#card-grad)" stroke="rgba(0,230,118,0.25)" stroke-width="1"/>
    <text x="849" y="44" fill="#00e676" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800">🛡️ 0% Fee</text>
    <text x="849" y="78" fill="#f1f5f9" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600">Zero Extra Charges</text>
    <text x="849" y="100" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13">අමතර ගාස්තු නැත</text>
  </g>

  <!-- Bottom Bar: Payments & Telegram handles -->
  <g transform="translate(60, 510)">
    <text x="0" y="32" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600">
      💳 Supported: eZ Cash · mCash · FriMi · Bank Transfer (Commercial, Sampath, BOC, HNB)
    </text>
    <text x="1080" y="32" text-anchor="end" fill="#00b0ff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="700">
      ${botUsername} · ${channelName}
    </text>
  </g>
</svg>`;
}

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...securityHeaders(),
      ...extraHeaders,
    },
  });
}

export function unauthorizedResponse(): Response {
  return json({ ok: false, error: "Unauthorized" }, 401);
}

export async function handleApiRequest(
  request: Request,
  env: Env,
  options?: { runtime?: "cf-worker" | "node"; isPolling?: boolean }
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // Health check
  if ((path === "/health" || path === "/api/health") && (method === "GET" || method === "HEAD")) {
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    const envErrors = validateEnv(env);
    return json({
      status: "ok",
      service: "telegram-bot",
      runtime: options?.runtime || "cf-worker",
      timestamp: new Date().toISOString(),
      configuration: {
        healthy: envErrors.length === 0,
        issues: envErrors,
        hasBotToken: Boolean(env.BOT_TOKEN && env.BOT_TOKEN.length > 10),
        hasWebhookSecret: Boolean(env.WEBHOOK_SECRET && env.WEBHOOK_SECRET.length >= 16),
        hasAdminIds: Boolean(env.ADMIN_IDS),
        hasAdminApiSecret: Boolean(env.ADMIN_API_SECRET || env.WEBHOOK_SECRET),
        hasOddsApiKey: Boolean(env.ODDS_API_KEY),
      },
    });
  }

  // Public worker status endpoint for the landing page. A successful response means this worker is reachable now.
  if (path === "/api/status" && (method === "GET" || method === "HEAD")) {
    const headers = { "Cache-Control": "no-store", ...securityHeaders() };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return json({ status: "online", service: "telegram-bot", runtime: options?.runtime || "cf-worker", checkedAt: new Date().toISOString() }, 200, headers);
  }

  // Telegram webhook setup & status endpoint
  if ((path === "/api/telegram/webhook" || path === "/api/setup-webhook") && (method === "GET" || method === "POST")) {
    const isPost = method === "POST";
    const autoSet = url.searchParams.get("action") === "set" || isPost;

    if (!env.BOT_TOKEN) {
      return json({
        ok: false,
        error: "BOT_TOKEN is not configured",
        help: "Set BOT_TOKEN in Cloudflare Secrets: npx wrangler secret put BOT_TOKEN",
      }, 400);
    }

    const workerOrigin = url.origin;
    const webhookSecret = env.WEBHOOK_SECRET?.trim() || "";

    if (autoSet) {
      if (!webhookSecret) {
        return json({
          ok: false,
          error: "WEBHOOK_SECRET is not configured",
          help: "Set WEBHOOK_SECRET (minimum 16 characters) in Cloudflare Secrets: npx wrangler secret put WEBHOOK_SECRET",
        }, 400);
      }
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: workerOrigin,
            secret_token: webhookSecret,
            drop_pending_updates: false,
            allowed_updates: ["message", "callback_query"],
          }),
        });
        const tgData = await tgRes.json();
        return json({
          ok: true,
          action: "setWebhook",
          targetUrl: workerOrigin,
          telegramResponse: tgData,
        });
      } catch (err) {
        return json({ ok: false, error: String(err) }, 500);
      }
    }

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
      const tgData = await tgRes.json();
      return json({
        ok: true,
        action: "getWebhookInfo",
        currentWorkerUrl: workerOrigin,
        telegramWebhook: tgData,
        instruction: "To register or update this worker URL as Telegram webhook, visit /api/setup-webhook?action=set or send POST to /api/setup-webhook",
      });
    } catch (err) {
      return json({ ok: false, error: String(err) }, 500);
    }
  }

  // OpenGraph Image JPEG (1200x630 bitmap optimized for WhatsApp & mobile chat previews)
  if ((path === "/og-image.jpg" || path === "/og-image.jpeg") && (method === "GET" || method === "HEAD")) {
    const headers: Record<string, string> = {
      "Content-Type": "image/jpeg",
      "Content-Length": String(OG_IMAGE_JPEG.byteLength),
      "Content-Disposition": "inline; filename=\"og-image.jpg\"",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(OG_IMAGE_JPEG, { status: 200, headers });
  }

  // OpenGraph Image PNG (1200x630 bitmap for WhatsApp, Telegram, Facebook, Twitter social previews)
  if (path === "/og-image.png" && (method === "GET" || method === "HEAD")) {
    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Content-Length": String(OG_IMAGE_PNG.byteLength),
      "Content-Disposition": "inline; filename=\"og-image.png\"",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(OG_IMAGE_PNG, { status: 200, headers });
  }

  // OpenGraph Image (1200x630 vector graphic for Telegram / WhatsApp / Twitter social previews)
  if ((path === "/og-image.svg" || path === "/api/og") && (method === "GET" || method === "HEAD")) {
    const svg = renderOgImageSvg(env);
    const headers: Record<string, string> = {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    };
    if (method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }
    return new Response(svg, { status: 200, headers });
  }

  // Official Brand Favicon (.ico / .png) - Dollar + Lightning circular badge
  if ((path === "/favicon.ico" || path === "/favicon.png") && (method === "GET" || method === "HEAD")) {
    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Content-Length": String(BRAND_FAVICON_PNG.byteLength),
      "Content-Disposition": "inline; filename=\"favicon.ico\"",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(BRAND_FAVICON_PNG, { status: 200, headers });
  }

  // Official Brand Logo / Favicon SVG (/favicon.svg, /logo.svg)
  if ((path === "/favicon.svg" || path === "/logo.svg") && (method === "GET" || method === "HEAD")) {
    const headers: Record<string, string> = {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(BRAND_LOGO_SVG, { status: 200, headers });
  }

  // Official Brand Logo 192x192 PNG (/logo.png, /apple-touch-icon.png)
  if ((path === "/logo.png" || path === "/apple-touch-icon.png" || path === "/apple-touch-icon-precomposed.png") && (method === "GET" || method === "HEAD")) {
    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Content-Length": String(BRAND_LOGO_PNG_192.byteLength),
      "Content-Disposition": "inline; filename=\"logo.png\"",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(BRAND_LOGO_PNG_192, { status: 200, headers });
  }

  // Affiliate Click Tracking & 302 Redirect for Tip Picks (/go/tip/:id)
  const tipClickMatch = path.match(/^\/go\/tip\/([a-zA-Z0-9_-]+)/);
  if (tipClickMatch && (method === "GET" || method === "HEAD")) {
    const rawTipId = tipClickMatch[1];
    const tipPostId = parseInt(rawTipId, 10);
    const eventId = url.searchParams.get("event") || url.searchParams.get("event_id") || "";
    const selection = url.searchParams.get("pick") || url.searchParams.get("selection") || "";
    const customUrl = url.searchParams.get("url") || "";

    const defaultBase = env.XBET_LINK?.trim() || "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622";
    let destinationUrl = defaultBase;

    // Validate safe affiliate destination to prevent open-redirect vulnerabilities
    if (customUrl) {
      try {
        const parsed = new URL(customUrl);
        const allowedHosts = ["reffpa.com", "1xbet.com", "1x-bet.mobi", "1xpartner.com"];
        if (env.XBET_LINK) {
          try {
            allowedHosts.push(new URL(env.XBET_LINK).hostname);
          } catch {}
        }
        const isAllowed = allowedHosts.some(
          (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
        );
        if (isAllowed) {
          destinationUrl = customUrl;
        }
      } catch {}
    }

    // Attach tracking parameters
    try {
      const destObj = new URL(destinationUrl);
      if (rawTipId) destObj.searchParams.set("sub1", `tip_${rawTipId}`);
      if (eventId) destObj.searchParams.set("sub2", eventId);
      destinationUrl = destObj.toString();
    } catch {}

    // Asynchronously log click to DB
    if (env.DB) {
      const userAgent = request.headers.get("user-agent") || "";
      const referer = request.headers.get("referer") || "";
      const rawIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
      const ipHash = rawIp ? crypto.randomUUID().slice(0, 8) : null;

      env.DB.prepare(`
        INSERT INTO tip_clicks (tip_post_id, event_id, selection, target_url, user_agent, referer, ip_hash, clicked_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        Number.isInteger(tipPostId) ? tipPostId : null,
        eventId || null,
        selection || null,
        destinationUrl,
        userAgent.slice(0, 500) || null,
        referer.slice(0, 500) || null,
        ipHash
      ).run().catch((err) => {
        console.warn("[Tip Click Log Error]:", err);
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: destinationUrl,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // Tips Performance & Click Statistics API (/api/tips/stats)
  if (path === "/api/tips/stats" && (method === "GET" || method === "HEAD")) {
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    const days = parseInt(url.searchParams.get("days") || "7", 10);
    const safeDays = Math.max(1, Math.min(days, 90));
    const stats = await getTipsPerformanceStats(env, safeDays);

    let clickCount = 0;
    if (env.DB) {
      try {
        const clickRow = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM tip_clicks WHERE clicked_at >= datetime('now', ? || ' days')
        `).bind(`-${safeDays}`).first<{ count: number }>();
        clickCount = clickRow?.count || 0;
      } catch {}
    }

    return json({
      ok: true,
      windowDays: safeDays,
      tips: stats,
      totalClicks: clickCount,
    });
  }

  // Trigger manual or admin tips settlement (/api/tips/settle)
  if (path === "/api/tips/settle" && method === "POST") {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    try {
      const summary = await settlePendingTips(env);
      return json({ ok: true, summary });
    } catch (err) {
      return json({ ok: false, error: String(err) }, 500);
    }
  }
  if (path === "/api/cleanup/logs/status" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    const last = getLastCleanupResult();
    return json({
      status: "ok",
      retentionPolicyDays: 30,
      schedule: "Daily at 02:00 UTC",
      lastCleanup: last,
    });
  }

  // Cleanup logs run
  if (path === "/api/cleanup/logs" && method === "POST") {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    let days = 30;
    try {
      const body = (await request.json()) as { retentionDays?: number };
      if (body?.retentionDays && body.retentionDays > 0 && body.retentionDays <= 3650) {
        days = Math.floor(body.retentionDays);
      }
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    try {
      const summary = await cleanupOldR2Logs(env, days);
      return json({ ok: true, summary });
    } catch (err) {
      console.error("[Cleanup API Error]:", err);
      return json({ ok: false, error: "Cleanup failed" }, 500);
    }
  }

  // Admin status
  if (path === "/api/admin/status" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    const stats = await getStats(env.DB);
    return json({
      status: "ok",
      runtime: options?.runtime || "cf-worker",
      mode: options?.isPolling ? "polling" : "webhook",
      stats,
      paymentMethods: {
        bank: env.BANK_DETAILS || "Not Configured",
        ezcash: env.EZCASH_NUMBER || "Not Configured",
        mcash: env.MCASH_NUMBER || "Not Configured",
        frimi: env.FRIMI_NUMBER || "Not Configured",
        ipay: env.IPAY_NUMBER || "Not Configured",
        whatsapp: env.WHATSAPP_NUMBER || "Not Configured",
      },
    });
  }

  // Admin dashboard
  if (path === "/api/admin/dashboard" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    try {
      const dashboard = await getOperationsDashboard(env.DB);
      return json({ ok: true, ...dashboard });
    } catch (error) {
      console.error("[Admin Dashboard] query failed", error);
      return json({ ok: false, error: "Dashboard data unavailable" }, 503);
    }
  }

  // Admin financial trends API (/api/admin/trends)
  if (path === "/api/admin/trends" && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    try {
      const daysParam = parseInt(url.searchParams.get("days") || "7", 10);
      const safeDays = Math.max(1, Math.min(daysParam, 90));
      const metric = url.searchParams.get("metric") === "count" ? "count" : "volume";
      const trends = await getDailyFinancialTrends(env.DB, safeDays);

      const totalDepVol = trends.reduce((sum, d) => sum + d.depositVolume, 0);
      const totalWdVol = trends.reduce((sum, d) => sum + d.withdrawalVolume, 0);
      const totalDepCnt = trends.reduce((sum, d) => sum + d.depositCount, 0);
      const totalWdCnt = trends.reduce((sum, d) => sum + d.withdrawalCount, 0);

      return json({
        ok: true,
        days: safeDays,
        metric,
        trends,
        summary: {
          totalDepositVolume: totalDepVol,
          totalWithdrawalVolume: totalWdVol,
          netVolume: Math.round((totalDepVol - totalWdVol) * 100) / 100,
          totalDepositCount: totalDepCnt,
          totalWithdrawalCount: totalWdCnt,
        },
      });
    } catch (error) {
      console.error("[Admin Trends] query failed", error);
      return json({ ok: false, error: "Trends data unavailable" }, 503);
    }
  }

  // Admin panel web interface (/admin, /admin/, /panel)
  if ((path === "/admin" || path === "/admin/" || path === "/panel") && (method === "GET" || method === "HEAD")) {
    const isAuth = adminAuthorized(request, env) || (!env.ADMIN_API_SECRET && !env.WEBHOOK_SECRET);
    const daysParam = parseInt(url.searchParams.get("days") || "7", 10);
    const safeDays = Math.max(1, Math.min(daysParam, 90));
    const metricParam = url.searchParams.get("metric") === "count" ? "count" : "volume";

    try {
      const [stats, trends, dashboard] = await Promise.all([
        getStats(env.DB),
        getDailyFinancialTrends(env.DB, safeDays),
        getOperationsDashboard(env.DB).catch(() => null),
      ]);

      const nonce = crypto.randomUUID().replace(/-/g, "");
      const html = renderAdminPage(
        env,
        request,
        {
          stats,
          trends,
          days: safeDays,
          metric: metricParam,
          isAuthorized: isAuth,
          tickets: dashboard?.tickets || [],
          alerts: dashboard?.alerts || [],
          tips: dashboard?.tips || [],
          paymentMethods: {
            bank: env.BANK_DETAILS || "Not Configured",
            ezcash: env.EZCASH_NUMBER || "Not Configured",
            mcash: env.MCASH_NUMBER || "Not Configured",
            frimi: env.FRIMI_NUMBER || "Not Configured",
            ipay: env.IPAY_NUMBER || "Not Configured",
            whatsapp: env.WHATSAPP_NUMBER || "Not Configured",
          }
        },
        nonce
      );

      const headers: Record<string, string> = {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}' 'unsafe-inline'; img-src 'self' data: https:; font-src https://fonts.gstatic.com;`,
      };

      if (method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(html, { status: 200, headers });
    } catch (err) {
      console.error("[Admin Panel] render error", err);
      return json({ ok: false, error: "Admin panel error" }, 500);
    }
  }

  // Admin tickets
  if (path === "/api/admin/tickets") {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();

    if (method === "GET") {
      const statusParam = url.searchParams.get("status") as "OPEN" | "PENDING" | "CLOSED" | null;
      const tickets = await getSupportTickets(env.DB, statusParam || undefined);
      return json({ ok: true, tickets });
    }

    if (method === "PATCH") {
      try {
        const body = (await request.json()) as {
          id?: number;
          status?: "OPEN" | "PENDING" | "CLOSED";
          reply?: string;
          adminId?: number;
        };

        if (!body.id || !body.status || !body.adminId) {
          return json({ ok: false, error: "id, status and adminId are required" }, 400);
        }

        // P1 #5: Validate adminId against server-side ADMIN_IDS
        if (!isConfiguredAdminId(body.adminId, env)) {
          return json(
            { ok: false, error: "Forbidden: adminId must be a registered ID in ADMIN_IDS" },
            403
          );
        }

        const updated = await updateSupportTicket(
          env.DB,
          body.id,
          body.status,
          body.reply || null,
          body.adminId
        );
        return json({ ok: updated }, updated ? 200 : 404);
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }
    }

    return json({ ok: false, error: "Method Not Allowed" }, 405);
  }

  // Admin schedule
  if (path === "/api/admin/schedule") {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();

    if (method !== "POST") {
      return json({ ok: false, error: "Method Not Allowed" }, 405);
    }

    try {
      const body = (await request.json()) as {
        title?: string;
        body?: string;
        mediaUrl?: string;
        ctaText?: string;
        ctaUrl?: string;
        language?: "si" | "en" | "ta";
        scheduledFor?: string;
        createdBy?: number;
      };

      if (!body.title || !body.body || !body.scheduledFor || !body.createdBy) {
        return json(
          { ok: false, error: "title, body, scheduledFor and createdBy are required" },
          400
        );
      }

      // P1 #5: Validate createdBy against server-side ADMIN_IDS
      if (!isConfiguredAdminId(body.createdBy, env)) {
        return json(
          { ok: false, error: "Forbidden: createdBy must be a registered ID in ADMIN_IDS" },
          403
        );
      }

      const id = await createScheduledChannelPost(env.DB, {
        title: body.title,
        body: body.body,
        mediaUrl: body.mediaUrl,
        ctaText: body.ctaText,
        ctaUrl: body.ctaUrl,
        language: body.language,
        scheduledFor: body.scheduledFor,
        createdBy: body.createdBy,
      });

      return json({ ok: true, id }, 201);
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }
  }

  // Admin receipts (P0 #2: Authenticated receipt viewing)
  if ((path === "/api/admin/receipts" || path === "/api/receipts/get") && (method === "GET" || method === "HEAD")) {
    if (!adminAuthorized(request, env)) return unauthorizedResponse();

    const key = url.searchParams.get("key");
    if (!key || !key.startsWith("receipts/") || key.includes("..")) {
      return json({ ok: false, error: "Invalid or unsafe storage key parameter" }, 400);
    }

    const obj = await getObject(env, key);
    if (!obj) {
      return json({ ok: false, error: "Receipt not found in storage" }, 404);
    }

    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: {
          "Content-Type": obj.contentType,
          "Content-Security-Policy": "default-src 'none'",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    return new Response(obj.body, {
      status: 200,
      headers: {
        "Content-Type": obj.contentType,
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // Not handled by API dispatcher
  return null;
}
