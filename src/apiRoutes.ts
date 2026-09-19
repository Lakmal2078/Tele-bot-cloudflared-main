import type { Env } from "./types";
import { OG_IMAGE_PNG, OG_IMAGE_JPEG } from "./ogImage";
import { BRAND_LOGO_SVG, BRAND_LOGO_PNG_192 } from "./brandLogo";
import { FAVICON_PNG_BASE64 } from "./brandFaviconData";

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const PUBLIC_FAVICON_PNG: Uint8Array = decodeBase64(FAVICON_PNG_BASE64);
import { constantTimeEqual, isConfiguredAdminId, validateEnv } from "./config";
import { securityHeaders, adminAttemptAllowed, recordAdminFailure, isAdminIpAllowed } from "./security";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieHeader,
  clearedAdminSessionCookieHeader,
  createAdminSessionToken,
  hasValidAdminSession,
  readCookie,
} from "./adminSession";
import { getStats, getOperationsDashboard, getDailyFinancialTrends, getSupportTickets, updateSupportTicket, createScheduledChannelPost } from "./db";
import { cleanupOldR2Logs, getLastCleanupResult } from "./logCleanup";
import { getObject } from "./storage";
import { settlePendingTips, getTipsPerformanceStats } from "./tipsSettlement";
import { renderAdminPage, renderAdminLoginPage } from "./adminPage";

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

  return adminIdHeaderValid(request, env);
}

/** If the client identifies as a specific admin via X-Admin-Id, verify it. */
function adminIdHeaderValid(request: Request, env: Env): boolean {
  const adminIdHeader = request.headers.get("x-admin-id");
  if (!adminIdHeader) return true;
  const adminId = parseInt(adminIdHeader, 10);
  return Number.isInteger(adminId) && isConfiguredAdminId(adminId, env);
}

/** True when credentials arrive in a header OR a valid admin session cookie. */
export async function adminRequestAuthorized(request: Request, env: Env): Promise<boolean> {
  if (adminAuthorized(request, env)) return true;
  if (!(await hasValidAdminSession(request, env))) return false;
  return adminIdHeaderValid(request, env);
}

function adminCredentialSupplied(request: Request): boolean {
  return Boolean(
    request.headers.get("Authorization") ||
      request.headers.get("x-admin-secret") ||
      readCookie(request, ADMIN_SESSION_COOKIE)
  );
}

function tooManyAttemptsResponse(): Response {
  return new Response(JSON.stringify({ ok: false, error: "Too many attempts. Try again later." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60", ...securityHeaders() },
  });
}

/**
 * Brute-force protected admin gate. Returns a Response to send back when the
 * caller is not allowed, or null when the request may proceed.
 */
export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (!adminAttemptAllowed(request)) return tooManyAttemptsResponse();
  // Optional IP allowlist (ADMIN_IP_ALLOWLIST) — empty means no IP restriction.
  if (!isAdminIpAllowed(request, env)) {
    if (adminCredentialSupplied(request)) recordAdminFailure(request);
    return unauthorizedResponse();
  }
  if (await adminRequestAuthorized(request, env)) return null;
  if (adminCredentialSupplied(request)) recordAdminFailure(request);
  return unauthorizedResponse();
}
