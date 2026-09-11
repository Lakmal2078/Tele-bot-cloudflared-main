/** Phase 4 security primitives for request validation and lightweight abuse protection. */

const MAX_WEBHOOK_BODY_BYTES = 512 * 1024;
const ADMIN_FAILURE_WINDOW_MS = 60_000;
const ADMIN_FAILURE_LIMIT = 10;

interface FailureBucket {
  count: number;
  resetAt: number;
}

const adminFailures = new Map<string, FailureBucket>();

export function securityHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
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
  if (!bucket || bucket.resetAt <= now) {
    adminFailures.set(key, { count: 1, resetAt: now + ADMIN_FAILURE_WINDOW_MS });
  } else {
    bucket.count += 1;
  }

  if (adminFailures.size > 5000) {
    for (const [entryKey, entry] of adminFailures) {
      if (entry.resetAt <= now) adminFailures.delete(entryKey);
    }
  }
}

/**
 * Lightweight per-isolate protection against repeated invalid admin credentials.
 * This is defense-in-depth; production should also use Cloudflare WAF/Rate Limiting
 * for a distributed limit across Worker isolates.
 */
export function adminAttemptAllowed(request: Request, now = Date.now()): boolean {
  return adminAttemptAllowedForKey(clientKey(request), now);
}

export function recordAdminFailure(request: Request, now = Date.now()): void {
  recordAdminFailureForKey(clientKey(request), now);
}

/** Node.js runtime parity for the same admin credential throttle. */
export function adminAttemptAllowedNode(
  headers: Record<string, string | string[] | undefined>,
  now = Date.now()
): boolean {
  return adminAttemptAllowedForKey(clientKeyFromNodeHeaders(headers), now);
}

export function recordAdminFailureNode(
  headers: Record<string, string | string[] | undefined>,
  now = Date.now()
): void {
  recordAdminFailureForKey(clientKeyFromNodeHeaders(headers), now);
}

export const SECURITY_LIMITS = {
  MAX_WEBHOOK_BODY_BYTES,
  ADMIN_FAILURE_WINDOW_MS,
  ADMIN_FAILURE_LIMIT,
} as const;
