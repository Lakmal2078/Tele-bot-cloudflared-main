import type { Env, ExecutionContext } from "./types";
import { normalizePublicBaseUrl } from "./landingPage";
import { OG_IMAGE_PNG, OG_IMAGE_JPEG } from "./ogImage";
import { BRAND_LOGO_SVG, BRAND_LOGO_PNG_192 } from "./brandLogo";
import { FAVICON_PNG_BASE64 } from "./brandFaviconData";
import { BOT_DESCRIPTION_IMAGE_BASE64 } from "./botDescriptionImageData";

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let cachedFaviconPng: Uint8Array | null = null;
function getPublicFaviconPng(): Uint8Array {
  if (!cachedFaviconPng) cachedFaviconPng = decodeBase64(FAVICON_PNG_BASE64);
  return cachedFaviconPng;
}

let cachedBotDescriptionJpeg: Uint8Array | null = null;
function getPublicBotDescriptionJpeg(): Uint8Array {
  if (!cachedBotDescriptionJpeg) cachedBotDescriptionJpeg = decodeBase64(BOT_DESCRIPTION_IMAGE_BASE64);
  return cachedBotDescriptionJpeg;
}

const MAX_ANALYTICS_BODY_BYTES = 8 * 1024;
const ANALYTICS_RATE_WINDOW_MS = 60_000;
const ANALYTICS_RATE_LIMIT = 120;
const MAX_ADMIN_LOGIN_BODY_BYTES = 4 * 1024;
const TIP_CLICK_RATE_WINDOW_MS = 60_000;
const TIP_CLICK_RATE_LIMIT = 30;
const BOT_DESCRIPTION_R2_KEY = "branding/bot-description-640x360.jpg";
const MAX_DESCRIPTION_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MiB

async function analyticsRequestAllowed(request: Request, env: Env, now = Date.now()): Promise<boolean> {
  const rawIp = request.headers.get("CF-Connecting-IP")?.trim() || "";
  const ipHash = rawIp ? await hashClientIp(rawIp, env) : null;
  const key = `analytics:${ipHash || "unknown-client"}`;
  const [bucket] = await consumeRateLimitBuckets(
    env.DB,
    [{ key, limit: ANALYTICS_RATE_LIMIT, windowMs: ANALYTICS_RATE_WINDOW_MS }],
    now
  );
  return Boolean(bucket?.consumed);
}

async function readBoundedText(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readBoundedBytes(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function detectImageSignature(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
import { constantTimeEqual, validateEnv } from "./config";
import { securityHeaders, landingPageSecurityHeaders, isAdminIpAllowed, SECURITY_LIMITS } from "./security";
import {
  adminSessionCookieHeader,
  clearedAdminSessionCookieHeader,
  createAdminSessionToken,
  hasValidAdminSession,
} from "./adminSession";
import { getStats, getOperationsDashboard, getDailyFinancialTrends, getSupportTickets, updateSupportTicket, createScheduledChannelPost, recordAnalyticsEvent, getAttributionFunnelStats, consumeRateLimitBuckets, getRateLimitBucket, recordRateLimitFailure, clearRateLimitBucket } from "./db";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { getObject, putObject, deleteObjects, isR2Configured } from "./storage";
import { getR2StorageAnalytics } from "./r2";
import { settlePendingTips, overrideTipSettlement, getTipsPerformanceStats } from "./tipsSettlement";
import { checkTelegramBotConnection } from "./telegramStatus";
import { renderAdminPage, renderAdminLoginPage } from "./adminPage";
import { renderPrivacyPage } from "./privacyPage";
import { trustedPublicBaseUrl } from "./landingPage";
import { buildSeoGuideSitemapEntries } from "./seoContentPages";

/**
 * Header-only admin credential check.
 *
 * The secret is accepted from `Authorization: Bearer ...` or `X-Admin-Secret`
 * only. It is deliberately NOT read from the URL query string: query strings
 * leak into access logs, browser history and intermediary caches.
 */
export function adminAuthorized(request: Request, env: Env): boolean {
  const secret = (env.ADMIN_API_SECRET || "").trim();
  if (!secret) return false;

  const authHeader = request.headers.get("Authorization");
  const directHeader = request.headers.get("x-admin-secret");

  let candidate = "";
  if (directHeader) {
    candidate = directHeader.trim();
  } else if (authHeader?.toLowerCase().startsWith("bearer ")) {
    candidate = authHeader.slice(7).trim();
  }

  if (!candidate || !constantTimeEqual(candidate, secret)) {
    return false;
  }

  // A shared API secret authenticates the service account, not an individual
  // Telegram operator. Never treat a caller-supplied X-Admin-Id as identity.
  return true;
}

/** True when credentials arrive in a header OR a valid admin session cookie. */
export async function adminRequestAuthorized(request: Request, env: Env): Promise<boolean> {
  return adminAuthorized(request, env) || hasValidAdminSession(request, env);
}

function tooManyAttemptsResponse(): Response {
  return new Response(JSON.stringify({ ok: false, error: "Too many attempts. Try again later." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60", ...securityHeaders() },
  });
}

async function adminFailureBucketKey(request: Request, env: Env): Promise<string> {
  const rawIp = request.headers.get("CF-Connecting-IP")?.trim() || "unknown-client";
  const ipHash = await hashClientIp(rawIp, env);
  return `admin:failed:${ipHash || "unknown-client"}`;
}

async function isAdminBlockedPersistent(request: Request, env: Env): Promise<boolean> {
  const bucket = await getRateLimitBucket(env.DB, await adminFailureBucketKey(request, env));
  return Boolean(
    bucket &&
    bucket.reset_at > Date.now() &&
    bucket.count >= SECURITY_LIMITS.ADMIN_FAILURE_LIMIT
  );
}

async function recordAdminFailurePersistent(request: Request, env: Env): Promise<void> {
  await recordRateLimitFailure(
    env.DB,
    await adminFailureBucketKey(request, env),
    SECURITY_LIMITS.ADMIN_FAILURE_LIMIT,
    SECURITY_LIMITS.ADMIN_FAILURE_WINDOW_MS
  );
}

async function clearAdminFailurePersistent(request: Request, env: Env): Promise<void> {
  await clearRateLimitBucket(env.DB, await adminFailureBucketKey(request, env));
}

/**
 * Brute-force protected admin gate. Returns a Response to send back when the
 * caller is not allowed, or null when the request may proceed.
 */
export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (await isAdminBlockedPersistent(request, env)) return tooManyAttemptsResponse();
  // Enforce optional IP allowlist before accepting credentials.
  if (!isAdminIpAllowed(request, env)) {
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  if (await adminRequestAuthorized(request, env)) {
    await clearAdminFailurePersistent(request, env);
    return null;
  }
  await recordAdminFailurePersistent(request, env);
  return unauthorizedResponse();
}

/**
 * Salted HMAC-SHA256 of the client IP, truncated. Used only to spot repeated
 * clicks from the same client without storing the raw IP.
 */
export async function hashClientIp(rawIp: string, env: Env): Promise<string | null> {
  const salt = (env.ADMIN_API_SECRET || env.WEBHOOK_SECRET || "").trim();
  if (!salt) return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(salt),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawIp.trim()));
    return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  } catch {
    return null;
  }
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

function adminHtmlHeaders(nonce: string): Record<string, string> {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}' 'unsafe-inline'; img-src 'self' data: https:; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none';`,
  };
}

export async function handleApiRequest(
  request: Request,
  env: Env,
  options?: { runtime?: "cf-worker" | "node"; isPolling?: boolean; executionContext?: Pick<ExecutionContext, "waitUntil"> }
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // Health / readiness check — returns 503 when configuration is invalid so
  // deployment health gates and load balancers treat the worker as unhealthy.
  if ((path === "/health" || path === "/api/health") && (method === "GET" || method === "HEAD")) {
    const envErrors = validateEnv(env);
    const healthy = envErrors.length === 0;
    const statusCode = healthy ? 200 : 503;
    if (method === "HEAD") {
      return new Response(null, {
        status: statusCode,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    // Public response is coarse; detailed credential flags are admin-only.
    return json(
      {
        status: healthy ? "ok" : "error",
        service: "telegram-bot",
        runtime: options?.runtime || "cf-worker",
        timestamp: new Date().toISOString(),
        configuration: { healthy },
      },
      statusCode
    );
  }

  // Public worker status endpoint for the landing page. A successful response means this worker is reachable now.
  if (path === "/api/status" && (method === "GET" || method === "HEAD")) {
    const headers = { "Cache-Control": "no-store", ...securityHeaders() };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return json({ status: "online", service: "telegram-bot", runtime: options?.runtime || "cf-worker", checkedAt: new Date().toISOString() }, 200, headers);
  }

  // Telegram Bot Live Status & API Connection Ping (/api/bot/status, /api/telegram/status)
  // Pings Telegram API getMe using BOT_TOKEN to verify connection & response latency
  if ((path === "/api/bot/status" || path === "/api/telegram/status") && (method === "GET" || method === "HEAD")) {
    const headers = { "Cache-Control": "no-store, no-cache, must-revalidate", ...securityHeaders() };
    if (method === "HEAD") return new Response(null, { status: 200, headers });

    const timeoutParam = parseInt(url.searchParams.get("timeout") || "5000", 10);
    const safeTimeout = Math.max(1000, Math.min(timeoutParam, 10000));
    const botStatus = await checkTelegramBotConnection(env, safeTimeout);

    return json(botStatus, 200, headers);
  }

  // Telegram webhook management (authenticated, mutation via POST only).
  // GET returns a sanitized status summary; setWebhook requires admin auth + POST.
  if (path === "/api/telegram/webhook" || path === "/api/setup-webhook") {
    if (method !== "GET" && method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    // All management actions require admin authentication.
    const denied = await requireAdmin(request, env);
    if (denied) return denied;

    // Enforce optional admin IP allowlist (defense in depth).
    if (!isAdminIpAllowed(request, env)) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    if (!env.BOT_TOKEN) {
      return json({
        ok: false,
        error: "BOT_TOKEN is not configured",
      }, 400);
    }

    const configuredBase = (env.PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
    const webhookSecret = env.WEBHOOK_SECRET?.trim() || "";

    // Mutations (setWebhook) are POST-only and must target the configured public origin.
    if (method === "POST" && (url.searchParams.get("action") === "set" || !url.searchParams.has("action"))) {
      if (!webhookSecret) {
        return json({
          ok: false,
          error: "WEBHOOK_SECRET is not configured",
        }, 400);
      }
      if (!configuredBase) {
        return json({
          ok: false,
          error: "PUBLIC_BASE_URL is required to register a webhook",
        }, 400);
      }
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: configuredBase,
            secret_token: webhookSecret,
            drop_pending_updates: false,
            allowed_updates: ["message", "callback_query"],
          }),
        });
        const tgData = (await tgRes.json()) as { ok?: boolean; description?: string };
        // Sanitize: do not leak full Telegram error payloads to callers.
        return json({
          ok: Boolean(tgData?.ok),
          action: "setWebhook",
          targetUrl: configuredBase,
          telegramOk: Boolean(tgData?.ok),
        });
      } catch {
        return json({ ok: false, error: "Internal server error" }, 500);
      }
    }

    // GET (or non-set POST) returns sanitized webhook status only.
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
      const tgData = (await tgRes.json()) as {
        ok?: boolean;
        result?: { url?: string; has_custom_certificate?: boolean; pending_update_count?: number; last_error_message?: string };
      };
      const result = tgData?.result || {};
      return json({
        ok: true,
        action: "getWebhookInfo",
        configuredPublicUrl: configuredBase || null,
        webhookUrlSet: Boolean(result.url),
        pendingUpdateCount: typeof result.pending_update_count === "number" ? result.pending_update_count : null,
        hasLastError: Boolean(result.last_error_message),
      });
    } catch {
      return json({ ok: false, error: "Internal server error" }, 500);
    }
  }

  // OpenGraph Image JPEG (1200x630 bitmap optimized for WhatsApp & mobile chat previews)
  if ((path === "/og-image.jpg" || path === "/og-image.jpeg") && (method === "GET" || method === "HEAD")) {
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes && assetRes.status === 200) {
          const headers = new Headers(assetRes.headers);
          const currentCache = headers.get("Cache-Control");
          if (!currentCache || currentCache.includes("max-age=0") || currentCache.includes("no-cache")) {
            headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
          }
          return new Response(assetRes.body, { status: assetRes.status, headers });
        }
      } catch {}
    }
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

  // Telegram BotFather Description Photo (640x360 JPEG for "What can this bot do?" card)
  if ((path === "/bot-description-640x360.jpg" || path === "/api/bot/description-photo") && (method === "GET" || method === "HEAD")) {
    if (isR2Configured(env)) {
      try {
        const customObj = await getObject(env, BOT_DESCRIPTION_R2_KEY);
        if (customObj && customObj.body) {
          const headers: Record<string, string> = {
            "Content-Type": customObj.contentType || "image/jpeg",
            "Content-Disposition": "inline; filename=\"bot-description-640x360.jpg\"",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300, must-revalidate",
            "X-Content-Type-Options": "nosniff",
            "X-Description-Photo-Source": "custom",
          };
          if (typeof customObj.size === "number") {
            headers["Content-Length"] = String(customObj.size);
          }
          if (method === "HEAD") return new Response(null, { status: 200, headers });
          return new Response(customObj.body, { status: 200, headers });
        }
      } catch (err) {
        console.warn("[Bot Description Photo] R2 lookup failed, falling back to default:", err);
      }
    }
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes && assetRes.status === 200) {
          const headers = new Headers(assetRes.headers);
          const currentCache = headers.get("Cache-Control");
          if (!currentCache || currentCache.includes("max-age=0") || currentCache.includes("no-cache")) {
            headers.set("Cache-Control", "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400");
          }
          headers.set("X-Description-Photo-Source", "default");
          return new Response(assetRes.body, { status: assetRes.status, headers });
        }
      } catch {}
    }
    const botDescJpeg = getPublicBotDescriptionJpeg();
    const headers: Record<string, string> = {
      "Content-Type": "image/jpeg",
      "Content-Length": String(botDescJpeg.byteLength),
      "Content-Disposition": "inline; filename=\"bot-description-640x360.jpg\"",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "X-Description-Photo-Source": "default",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(botDescJpeg, { status: 200, headers });
  }

  // OpenGraph Image PNG (1200x630 bitmap for WhatsApp, Telegram, Facebook, Twitter social previews)
  if (path === "/og-image.png" && (method === "GET" || method === "HEAD")) {
    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Content-Length": String(OG_IMAGE_PNG.byteLength),
      "Content-Disposition": "inline; filename=\"og-image.png\"",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
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
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    };
    if (method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }
    return new Response(svg, { status: 200, headers });
  }

  // Web App Manifest (/manifest.json, /site.webmanifest)
  if ((path === "/manifest.json" || path === "/site.webmanifest") && (method === "GET" || method === "HEAD")) {
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes && assetRes.status === 200) {
          const headers = new Headers(assetRes.headers);
          const currentCache = headers.get("Cache-Control");
          if (!currentCache || currentCache.includes("max-age=0") || currentCache.includes("no-cache")) {
            headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
          }
          return new Response(assetRes.body, { status: assetRes.status, headers });
        }
      } catch {}
    }
    const manifest = JSON.stringify({
      name: "Fast xBet Cash 🇱🇰",
      short_name: "Fast xBet",
      description: "Telegram-first sports previews, guided support and multilingual assistance",
      start_url: "/?source=pwa",
      display: "standalone",
      background_color: "#070B12",
      theme_color: "#070B12",
      icons: [
        {
          src: "/favicon.png",
          sizes: "192x192 512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    }, null, 2);
    const headers: Record<string, string> = {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(manifest, { status: 200, headers });
  }

  // Privacy-safe daily salted hash for visitor analytics
  async function hashIpForPrivacy(ip: string | null): Promise<string | null> {
    if (!ip) return null;
    const day = new Date().toISOString().slice(0, 10);
    // HMAC with a high-entropy server secret; daily context limits linkability.
    return hashClientIp(`${day}:${ip}`, env);
  }

  // Conversion & Click-through Analytics Beacon (/api/analytics/event)
  if (path === "/api/analytics/event" && (method === "POST" || method === "GET" || method === "OPTIONS")) {
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (!(await analyticsRequestAllowed(request, env))) {
      return new Response(JSON.stringify({ ok: false, error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
    if (method === "GET" && request.url.length > MAX_ANALYTICS_BODY_BYTES) {
      return new Response(JSON.stringify({ ok: false, error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const contentLength = Number(request.headers.get("Content-Length"));
    if (method === "POST" && request.headers.has("Content-Length") &&
        (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_ANALYTICS_BODY_BYTES)) {
      return new Response(JSON.stringify({ ok: false, error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const analyticsBody = method === "POST" ? await readBoundedText(request.clone(), MAX_ANALYTICS_BODY_BYTES) : "";
    if (analyticsBody === null) {
      return new Response(JSON.stringify({ ok: false, error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const persistTask = async () => {
      try {
        let payload: any = {};
        if (method === "POST") {
          if (analyticsBody) payload = JSON.parse(analyticsBody);
        } else if (method === "GET") {
          payload = Object.fromEntries(url.searchParams.entries());
        }

        const clientIp =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          null;
        const ipHash = await hashIpForPrivacy(clientIp);
        const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

        const eventName = String(
          payload?.event || payload?.event_name || (payload?.cta ? "cta_click" : "page_view")
        ).slice(0, 64);
        const sessionId = payload?.sessionId || payload?.session_id || null;
        const source = payload?.source || payload?.utm_source || url.searchParams.get("utm_source") || null;
        const campaign = payload?.campaign || payload?.utm_campaign || url.searchParams.get("utm_campaign") || null;
        const subId =
          payload?.subId ||
          payload?.sub_id ||
          payload?.subid ||
          url.searchParams.get("subid") ||
          url.searchParams.get("sub_id") ||
          null;
        const landingPath = payload?.href || payload?.path || payload?.landingPath || url.pathname || "/";
        const language = payload?.lang || payload?.language || "si";

        if (env.DB && typeof env.DB.prepare === "function") {
          await recordAnalyticsEvent(env.DB, {
            eventName,
            sessionId: sessionId ? String(sessionId).slice(0, 100) : null,
            source: source ? String(source).slice(0, 100) : null,
            campaign: campaign ? String(campaign).slice(0, 100) : null,
            subId: subId ? String(subId).slice(0, 100) : null,
            landingPath: String(landingPath).slice(0, 500),
            language: String(language).slice(0, 10),
            details: JSON.stringify(payload).slice(0, 2000),
            ipHash,
            userAgent,
          });
        }
      } catch (err) {
        console.error("[Analytics Beacon] Failed to persist event:", err);
      }
    };

    if (options?.executionContext && typeof options.executionContext.waitUntil === "function") {
      options.executionContext.waitUntil(persistTask());
    } else {
      await persistTask().catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Official Brand Favicon (.ico / .png) - Served via Cloudflare Static Assets (public/favicon.png)
  if ((path === "/favicon.ico" || path === "/favicon.png") && (method === "GET" || method === "HEAD")) {
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      try {
        const assetRes = await env.ASSETS.fetch(request);
        if (assetRes && assetRes.status === 200) {
          const headers = new Headers(assetRes.headers);
          const currentCache = headers.get("Cache-Control");
          if (!currentCache || currentCache.includes("max-age=0") || currentCache.includes("no-cache")) {
            headers.set("Cache-Control", "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400");
          }
          return new Response(assetRes.body, { status: assetRes.status, headers });
        }
      } catch {
        // Fall back to embedded buffer if asset fetch is not available in mock/testing environments
      }
    }

    const faviconPng = getPublicFaviconPng();
    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Content-Length": String(faviconPng.byteLength),
      "Content-Disposition": "inline; filename=\"favicon.png\"",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(faviconPng, { status: 200, headers });
  }

  // Official Brand Logo / Favicon SVG (/favicon.svg, /logo.svg)
  if ((path === "/favicon.svg" || path === "/logo.svg") && (method === "GET" || method === "HEAD")) {
    const headers: Record<string, string> = {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
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
      "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(BRAND_LOGO_PNG_192, { status: 200, headers });
  }

  // Search Engine Robots Directive (/robots.txt)
  if (path === "/robots.txt" && (method === "GET" || method === "HEAD")) {
    const origin = (env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "") || trustedPublicBaseUrl(env, request) || "https://fastxbet.lk";
    const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /panel
Disallow: /api/
Disallow: /go/

Sitemap: ${origin}/sitemap.xml
`;
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(body, { status: 200, headers });
  }

  // XML Sitemap for Search Engines (/sitemap.xml)
  if (path === "/sitemap.xml" && (method === "GET" || method === "HEAD")) {
    const origin = (env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "") || trustedPublicBaseUrl(env, request) || "https://fastxbet.lk";
    const homeUrls = [
      { lang: "si", url: `${origin}/` },
      { lang: "en", url: `${origin}/en/` },
      { lang: "ta", url: `${origin}/ta/` },
    ];
    const alternates = [
      ...homeUrls.map(({ lang, url }) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${url}"/>`),
      `<xhtml:link rel="alternate" hreflang="x-default" href="${origin}/"/>`,
    ].join("\n    ");
    const homeEntries = homeUrls.map(({ url }) => `  <url>
    <loc>${url}</loc>
    ${alternates}
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`).join("\n");
    const guideEntries = buildSeoGuideSitemapEntries(origin);
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${homeEntries}
  <url>
    <loc>${origin}/privacy</loc>
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
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(body, { status: 200, headers });
  }

  // Consolidate historical privacy aliases onto the canonical legal URL.
  if ((path === "/privacy-policy" || path === "/legal/privacy") && (method === "GET" || method === "HEAD")) {
    return new Response(null, {
      status: 301,
      headers: { Location: `${normalizePublicBaseUrl(env.PUBLIC_BASE_URL) || new URL(request.url).origin}/privacy`, "Cache-Control": "public, max-age=86400" },
    });
  }

  // Public Privacy Policy Page (/privacy)
  if (path === "/privacy" && (method === "GET" || method === "HEAD")) {
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const html = renderPrivacyPage(env, request, nonce);
    const headers = landingPageSecurityHeaders(nonce, { isHttps: request.url.startsWith("https://") });
    delete headers["X-Frame-Options"];
    headers["Content-Security-Policy"] = headers["Content-Security-Policy"].replace(/;\s*frame-ancestors\s+'none'/, "");
    headers["Content-Type"] = "text/html; charset=utf-8";
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(html, { status: 200, headers });
  }

  // Affiliate Click Tracking & 302 Redirect for Tip Picks (/go/tip/:id)
  const tipClickMatch = path.match(/^\/go\/tip\/([^/]+)$/);
  if (tipClickMatch && (method === "GET" || method === "HEAD")) {
    const rawTipId = tipClickMatch[1];
    const tipPostId = Number(rawTipId);
    const eventId = url.searchParams.get("event") || url.searchParams.get("event_id") || "";
    const selection = url.searchParams.get("pick") || url.searchParams.get("selection") || "";
    const customUrl = url.searchParams.get("url") || "";

    if (!/^\d+$/.test(rawTipId) || !Number.isSafeInteger(tipPostId) || tipPostId <= 0) {
      return json({ ok: false, error: "Invalid tip id" }, 400);
    }
    if (eventId.length > 128 || selection.length > 128 || customUrl.length > 2048) {
      return json({ ok: false, error: "Tracking parameters are too long" }, 400);
    }

    if (method === "GET" && env.DB) {
      const rawIp = request.headers.get("CF-Connecting-IP")?.trim() || "";
      const ipHash = rawIp ? await hashClientIp(rawIp, env) : null;
      const [bucket] = await consumeRateLimitBuckets(
        env.DB,
        [{
          key: `tip-click:${ipHash || "unknown-client"}`,
          limit: TIP_CLICK_RATE_LIMIT,
          windowMs: TIP_CLICK_RATE_WINDOW_MS,
        }]
      );
      if (!bucket?.consumed) {
        return json({ ok: false, error: "Too many clicks. Try again later." }, 429, { "Retry-After": "60" });
      }
    }

    const defaultBase = env.XBET_LINK?.trim() || "";
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
        if (parsed.protocol === "https:" && isAllowed) {
          destinationUrl = customUrl;
        }
      } catch {}
    }

    if (!destinationUrl) {
      return new Response(JSON.stringify({ ok: false, error: "Tip destination is not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...securityHeaders() },
      });
    }

    // Enforce HTTPS for both the configured default and any custom destination.
    let destObj: URL;
    try {
      destObj = new URL(destinationUrl);
    } catch {
      return json({ ok: false, error: "Tip destination is invalid" }, 503, { "Cache-Control": "no-store" });
    }
    if (destObj.protocol !== "https:") {
      return json({ ok: false, error: "Tip destination must use HTTPS" }, 503, { "Cache-Control": "no-store" });
    }

    // Attach tracking parameters.
    if (rawTipId) destObj.searchParams.set("sub1", `tip_${rawTipId}`);
    if (eventId) destObj.searchParams.set("sub2", eventId);
    destinationUrl = destObj.toString();

    // Asynchronously log click to DB
    if (env.DB && method === "GET") {
      const userAgent = request.headers.get("user-agent") || "";
      const referer = request.headers.get("referer") || "";
      const rawIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
      const ipHash = rawIp ? await hashClientIp(rawIp, env) : null;

      const clickLog = env.DB.prepare(`
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

      if (options?.executionContext) {
        options.executionContext.waitUntil(clickLog);
      } else {
        await clickLog;
      }
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

  // Admin BotFather Description Photo upload / reset (stored in R2)
  if (path === "/api/admin/bot/description-photo" && (method === "POST" || method === "DELETE")) {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    if (!isR2Configured(env)) {
      return json({ ok: false, error: "Cloudflare R2 storage is not configured" }, 503);
    }

    if (method === "DELETE") {
      try {
        const failed = await deleteObjects(env, [BOT_DESCRIPTION_R2_KEY]);
        if (failed.length > 0) {
          return json({ ok: false, error: "Failed to reset custom description photo" }, 500);
        }
        return json({
          ok: true,
          source: "default",
          url: `/bot-description-640x360.jpg?v=${Date.now()}`,
        });
      } catch (err) {
        console.error("[Admin Description Photo Reset]", err);
        return json({ ok: false, error: "Failed to reset description photo" }, 500);
      }
    }

    const contentLength = request.headers.get("Content-Length");
    if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_DESCRIPTION_PHOTO_BYTES)) {
      return json({ ok: false, error: "Image must be 2 MiB or smaller" }, 413);
    }

    const bytes = await readBoundedBytes(request, MAX_DESCRIPTION_PHOTO_BYTES);
    if (bytes === null) {
      return json({ ok: false, error: "Image must be 2 MiB or smaller" }, 413);
    }
    if (bytes.byteLength === 0) {
      return json({ ok: false, error: "Image body is empty" }, 400);
    }

    const detectedMime = detectImageSignature(bytes);
    if (!detectedMime) {
      return json({ ok: false, error: "Unsupported image format. Use JPEG, PNG, or WebP." }, 415);
    }

    try {
      const saved = await putObject(env, BOT_DESCRIPTION_R2_KEY, bytes, detectedMime);
      if (!saved) {
        return json({ ok: false, error: "Failed to store description photo" }, 500);
      }
      return json({
        ok: true,
        source: "custom",
        mimeType: detectedMime,
        sizeBytes: bytes.byteLength,
        url: `/bot-description-640x360.jpg?v=${Date.now()}`,
      });
    } catch (err) {
      console.error("[Admin Description Photo Upload]", err);
      return json({ ok: false, error: "Failed to store description photo" }, 500);
    }
  }

  // Admin-triggered settlement sweep. historicalSweep bypasses retry timers but keeps score validation strict.
  if (path === "/api/tips/settle" && method === "POST") {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    try {
      const body = await request.json().catch(() => ({})) as { historicalSweep?: boolean; maxPosts?: number };
      const summary = await settlePendingTips(env, {
        bypassBackoff: body.historicalSweep === true,
        maxPosts: Math.max(1, Math.min(Number(body.maxPosts) || (body.historicalSweep ? 100 : 10), 100)),
      });
      return json({ ok: true, summary });
    } catch (error) {
      console.error("[Admin Settlement Sweep]", error);
      return json({ ok: false, error: "Settlement sweep failed" }, 500);
    }
  }

  // Explicit admin-only historical result override. Requires both admin API auth and a configured admin ID.
  if (path === "/api/admin/tips/settlement/override" && method === "POST") {
    const denied = await requireAdmin(request, env);
    if (denied) return denied;
    // Never trust a caller-supplied Telegram ID as proof of the actor. This
    // endpoint authenticates the shared admin credential, so audit it as such.
    const adminId = "shared-admin-secret";
    try {
      const body = await request.json() as {
        tipPostId?: number; eventId?: string; outcome?: "WON" | "LOST" | "VOID"; note?: string; scoreHome?: string; scoreAway?: string;
      };
      if (!Number.isSafeInteger(body.tipPostId) || !body.eventId?.trim() ||
          !["WON", "LOST", "VOID"].includes(String(body.outcome)) || !body.note?.trim()) {
        return json({ ok: false, error: "tipPostId, eventId, outcome (WON|LOST|VOID), and audit note are required" }, 400);
      }
      const applied = await overrideTipSettlement(env, {
        tipPostId: Number(body.tipPostId), eventId: body.eventId,
        outcome: body.outcome as "WON" | "LOST" | "VOID",
        note: body.note, adminId, scoreHome: body.scoreHome, scoreAway: body.scoreAway,
      });
      return json({ ok: applied }, applied ? 200 : 404);
    } catch (error) {
      console.error("[Admin Settlement Override]", error);
      return json({ ok: false, error: "Override failed" }, 500);
    }
  }
  if (path === "/api/cleanup/logs/status" && (method === "GET" || method === "HEAD")) {
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }
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
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }
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
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }
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
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }
    if (method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "Cache-Control": "no-store", ...securityHeaders() },
      });
    }
    try {
      const [dashboard, r2, funnel] = await Promise.all([
        getOperationsDashboard(env.DB),
        getR2StorageAnalytics(env).catch(() => null),
        getAttributionFunnelStats(env.DB).catch(() => null),
      ]);
      return json({ ok: true, r2, funnel, ...dashboard });
    } catch (error) {
      console.error("[Admin Dashboard] query failed", error);
      return json({ ok: false, error: "Dashboard data unavailable" }, 503);
    }
  }

  // Admin R2 storage & dashboard analytics polling API (/api/admin/r2-analytics, /api/admin/analytics)
  if ((path === "/api/admin/r2-analytics" || path === "/api/admin/analytics") && (method === "GET" || method === "HEAD")) {
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }
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
      const continuation = request.headers.get("X-R2-Analytics-Continuation");
      if (continuation && continuation.length > 16_384) {
        return json({ ok: false, error: "Invalid analytics continuation" }, 400);
      }

      const [r2, stats, trends, dashboard, funnel] = await Promise.all([
        getR2StorageAnalytics(env, continuation),
        getStats(env.DB),
        getDailyFinancialTrends(env.DB, safeDays),
        getOperationsDashboard(env.DB).catch(() => null),
        getAttributionFunnelStats(env.DB, safeDays).catch(() => null),
      ]);

      const totalDepVol = trends.reduce((sum, d) => sum + d.depositVolume, 0);
      const totalWdVol = trends.reduce((sum, d) => sum + d.withdrawalVolume, 0);
      const totalDepCnt = trends.reduce((sum, d) => sum + d.depositCount, 0);
      const totalWdCnt = trends.reduce((sum, d) => sum + d.withdrawalCount, 0);

      return json({
        ok: true,
        r2,
        stats,
        trends,
        funnel,
        days: safeDays,
        metric,
        summary: {
          totalDepositVolume: totalDepVol,
          totalWithdrawalVolume: totalWdVol,
          netVolume: Math.round((totalDepVol - totalWdVol) * 100) / 100,
          totalDepositCount: totalDepCnt,
          totalWithdrawalCount: totalWdCnt,
        },
        ticketsCount: dashboard?.tickets?.length || 0,
        alertsCount: dashboard?.alerts?.length || 0,
        polledAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("continuation")) {
        return json({ ok: false, error: "Invalid analytics continuation" }, 400);
      }
      console.error("[Admin R2 Analytics] query failed", error);
      return json({ ok: false, error: "Analytics data unavailable" }, 503);
    }
  }

  // Admin financial trends API (/api/admin/trends)
  if (path === "/api/admin/trends" && (method === "GET" || method === "HEAD")) {
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }
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

  // Admin login: the secret is POSTed once and exchanged for a signed,
  // HttpOnly session cookie so it never appears in a URL.
  if ((path === "/admin/login" || path === "/panel/login") && method === "POST") {
    if (!isAdminIpAllowed(request, env)) return json({ ok: false, error: "Forbidden" }, 403);
    if (await isAdminBlockedPersistent(request, env)) return tooManyAttemptsResponse();

    const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/x-www-form-urlencoded") {
      return json({ ok: false, error: "Unsupported Media Type" }, 415);
    }
    const contentLength = request.headers.get("Content-Length");
    if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_ADMIN_LOGIN_BODY_BYTES)) {
      return json({ ok: false, error: "Request body too large" }, 413);
    }

    const bodyText = await readBoundedText(request, MAX_ADMIN_LOGIN_BODY_BYTES);
    if (bodyText === null) return json({ ok: false, error: "Request body too large" }, 413);
    const form = new URLSearchParams(bodyText);
    const suppliedValues = form.getAll("secret");
    const supplied = suppliedValues.length === 1 ? suppliedValues[0].trim() : "";
    const secret = (env.ADMIN_API_SECRET || "").trim();

    if (!secret || !supplied || !constantTimeEqual(supplied, secret)) {
      await recordAdminFailurePersistent(request, env);
      const nonce = crypto.randomUUID().replace(/-/g, "");
      return new Response(renderAdminLoginPage(env, nonce, { error: "Invalid admin secret." }), {
        status: 401,
        headers: adminHtmlHeaders(nonce),
      });
    }

    await clearAdminFailurePersistent(request, env);
    const token = await createAdminSessionToken(secret);
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin",
        "Cache-Control": "no-store",
        "Set-Cookie": adminSessionCookieHeader(request, token),
      },
    });
  }

  if ((path === "/admin/logout" || path === "/panel/logout") && method === "POST") {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/admin",
        "Cache-Control": "no-store",
        "Set-Cookie": clearedAdminSessionCookieHeader(request),
      },
    });
  }

  // Admin panel web interface (/admin, /admin/, /panel)
  if ((path === "/admin" || path === "/admin/" || path === "/panel") && (method === "GET" || method === "HEAD")) {
    if (!isAdminIpAllowed(request, env)) return json({ ok: false, error: "Forbidden" }, 403);
    // Fail closed: with no ADMIN_API_SECRET configured nobody is authorized.
    if (await isAdminBlockedPersistent(request, env)) return tooManyAttemptsResponse();
    const isAuth = await adminRequestAuthorized(request, env);
    if (isAuth) await clearAdminFailurePersistent(request, env);

    // Unauthenticated visitors never see business/financial data: no DB
    // queries are run, and only a bare login form is rendered.
    if (!isAuth) {
      const nonce = crypto.randomUUID().replace(/-/g, "");
      const html = renderAdminLoginPage(env, nonce);
      const headers: Record<string, string> = adminHtmlHeaders(nonce);
      if (method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(html, { status: 200, headers });
    }

    const daysParam = parseInt(url.searchParams.get("days") || "7", 10);
    const safeDays = Math.max(1, Math.min(daysParam, 90));
    const metricParam = url.searchParams.get("metric") === "count" ? "count" : "volume";

    try {
      const [stats, trends, dashboard, r2Analytics, funnel] = await Promise.all([
        getStats(env.DB),
        getDailyFinancialTrends(env.DB, safeDays),
        getOperationsDashboard(env.DB).catch(() => null),
        getR2StorageAnalytics(env).catch(() => undefined),
        getAttributionFunnelStats(env.DB, safeDays).catch(() => undefined),
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
          r2Analytics,
          tickets: dashboard?.tickets || [],
          alerts: dashboard?.alerts || [],
          tips: dashboard?.tips || [],
          funnel,
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

      const headers: Record<string, string> = adminHtmlHeaders(nonce);

      if (method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(html, { status: 200, headers });
    } catch (err) {
      console.error("[Admin Panel] render error", err);
      return json({ ok: false, error: "Admin panel error" }, 500);
    }
  }

  // Admin tickets
  if (path === "/api/admin/tickets") {
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }

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
        };

        if (!body.id || !body.status) {
          return json({ ok: false, error: "id and status are required" }, 400);
        }

        // HTTP admin access uses one shared credential, not an individually
        // authenticated Telegram identity. Record the shared actor sentinel.
        const updated = await updateSupportTicket(
          env.DB,
          body.id,
          body.status,
          body.reply || null,
          0
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
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }

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
      };

      if (!body.title || !body.body || !body.scheduledFor) {
        return json(
          { ok: false, error: "title, body and scheduledFor are required" },
          400
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
        // 0 identifies actions authenticated by the shared admin credential.
        createdBy: 0,
      });

      // Channel scheduling is currently draft-only: no worker publishes these rows.
      // Return 201 with an explicit status so operators are not misled into
      // believing the post will be delivered automatically.
      return json(
        {
          ok: true,
          id,
          status: "DRAFT",
          note: "Channel schedule is draft-only; automatic publishing is not yet implemented. Posts will not be sent to Telegram until a publisher job is added.",
        },
        201
      );
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }
  }

  // Admin receipts (P0 #2: Authenticated receipt viewing)
  if ((path === "/api/admin/receipts" || path === "/api/receipts/get") && (method === "GET" || method === "HEAD")) {
    {
      const denied = await requireAdmin(request, env);
      if (denied) return denied;
    }

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
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response(obj.body, {
      status: 200,
      headers: {
        "Content-Type": obj.contentType,
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  }

  // Any other /api/* path is an unknown API route: return a proper 404 JSON
  // response instead of falling through to the landing page (which the
  // Worker serves for any unmatched GET/HEAD request).
  if (path.startsWith("/api/")) {
    return json({ ok: false, error: "Not found" }, 404, securityHeaders());
  }

  // Not handled by the API dispatcher; callers serve the root landing page
  // or return a 404 for unknown paths.
  return null;
}
