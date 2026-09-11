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
  // Cloudflare supplies CF-Connecting-IP at the edge. Fall back to a shared key for
  // local/Node runtimes where that header is unavailable.
  return request.headers.get("CF-Connecting-IP")?.trim() || "unknown-client";
}

/**
 * Lightweight per-isolate protection against repeated invalid admin credentials.
 * This is deliberately defense-in-depth; production should also use Cloudflare
 * WAF/Rate Limiting for a distributed limit across Worker isolates.
 */
export function adminAttemptAllowed(request: Request, now = Date.now()): boolean {
  const key = clientKey(request);
  const bucket = adminFailures.get(key);

  if (!bucket || bucket.resetAt <= now) {
    adminFailures.set(key, { count: 0, resetAt: now + ADMIN_FAILURE_WINDOW_MS });
    return true;
  }

  return bucket.count < ADMIN_FAILURE_LIMIT;
}

export function recordAdminFailure(request: Request, now = Date.now()): void {
  const key = clientKey(request);
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

export const SECURITY_LIMITS = {
  MAX_WEBHOOK_BODY_BYTES,
  ADMIN_FAILURE_WINDOW_MS,
  ADMIN_FAILURE_LIMIT,
} as const;
