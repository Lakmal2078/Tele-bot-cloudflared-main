/** Request validation and defense-in-depth security primitives. */

const MAX_WEBHOOK_BODY_BYTES = 512 * 1024;
const ADMIN_FAILURE_WINDOW_MS = 60_000;
const ADMIN_FAILURE_LIMIT = 10;

interface FailureBucket { count: number; resetAt: number; }
const adminFailures = new Map<string, FailureBucket>();

export function securityHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "X-DNS-Prefetch-Control": "off",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Origin-Agent-Cluster": "?1",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  };
}

export function landingPageSecurityHeaders(nonce?: string, options: { isHttps?: boolean } = {}): Record<string, string> {
  const isHttps = options.isHttps ?? true;
  const headers = { ...securityHeaders() };
  headers["Cache-Control"] = "public, max-age=1800, s-maxage=86400, stale-while-revalidate=86400";
  headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
  const scriptPolicy = nonce ? `'nonce-${nonce}'` : "'unsafe-inline'";
  const stylePolicy = nonce ? `'nonce-${nonce}' https://fonts.googleapis.com` : "'unsafe-inline' https://fonts.googleapis.com";
  return {
    ...headers,
    "Content-Security-Policy":
      "default-src 'none'; " +
      `script-src ${scriptPolicy}; ` +
      `style-src ${stylePolicy}; ` +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "base-uri 'none'; " +
      "object-src 'none'; " +
      (isHttps ? "upgrade-insecure-requests; " : "") +
      "form-action 'none'; " +
      "frame-ancestors 'none'",
  };
}

export function webhookRequestAllowed(request: Request): boolean {
  if (request.method !== "POST") return false;
  const contentLength = request.headers.get("Content-Length");
  if (contentLength) {
    const length = Number(contentLength);
    if (!Number.isFinite(length) || length < 0 || length > MAX_WEBHOOK_BODY_BYTES) return false;
  }
  const contentType = request.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
  return contentType === "application/json";
}

function clientKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown-client";
}
function normalizeNodeHeader(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() || "";
  return value?.trim() || "";
}
function clientKeyFromNodeHeaders(headers: Record<string, string | string[] | undefined>): string {
  return normalizeNodeHeader(headers["cf-connecting-ip"]) || "unknown-client";
}
function adminAttemptAllowedForKey(key: string, now: number): boolean {
  const bucket = adminFailures.get(key);
  if (!bucket || bucket.resetAt <= now) {
    adminFailures.set(key, { count: 0, resetAt: now + ADMIN_FAILURE_WINDOW_MS });
    return true;
  }
  return bucket.count < ADMIN_FAILURE_LIMIT;
}
function recordAdminFailureForKey(key: string, now: number): void {
  const bucket = adminFailures.get(key);
  if (!bucket || bucket.resetAt <= now) adminFailures.set(key, { count: 1, resetAt: now + ADMIN_FAILURE_WINDOW_MS });
  else bucket.count += 1;
  if (adminFailures.size > 5000) {
    for (const [entryKey, entry] of adminFailures) if (entry.resetAt <= now) adminFailures.delete(entryKey);
  }
}
export function adminAttemptAllowed(request: Request, now = Date.now()): boolean { return adminAttemptAllowedForKey(clientKey(request), now); }
export function recordAdminFailure(request: Request, now = Date.now()): void { recordAdminFailureForKey(clientKey(request), now); }
export function adminAttemptAllowedNode(headers: Record<string, string | string[] | undefined>, now = Date.now()): boolean {
  return adminAttemptAllowedForKey(clientKeyFromNodeHeaders(headers), now);
}
export function recordAdminFailureNode(headers: Record<string, string | string[] | undefined>, now = Date.now()): void {
  recordAdminFailureForKey(clientKeyFromNodeHeaders(headers), now);
}

export const SECURITY_LIMITS = { MAX_WEBHOOK_BODY_BYTES, ADMIN_FAILURE_WINDOW_MS, ADMIN_FAILURE_LIMIT } as const;

/**
 * Optional admin IP allowlist (Cloudflare `CF-Connecting-IP`).
 * When ADMIN_IP_ALLOWLIST is empty/unset, all IPs are allowed (secret still required).
 * When set, only listed IPs may call admin routes — defense in depth behind ADMIN_API_SECRET.
 */
export function isAdminIpAllowed(
  request: Request,
  env: { ADMIN_IP_ALLOWLIST?: string }
): boolean {
  const raw = env.ADMIN_IP_ALLOWLIST?.trim() || "";
  if (!raw) return true;
  const allowed = new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (allowed.size === 0) return true;
  const ip = request.headers.get("CF-Connecting-IP")?.trim() || "";
  if (!ip) return false;
  return allowed.has(ip);
}
