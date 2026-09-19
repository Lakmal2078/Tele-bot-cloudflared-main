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
  headers["Cache-Control"] = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
  headers["Vary"] = "Accept-Language";
  headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
  const scriptPolicy = nonce ? `'nonce-${nonce}'` : "'unsafe-inline'";
  const stylePolicy = nonce ? `'nonce-${nonce}'` : "'unsafe-inline'";
  return {
    ...headers,
    "Content-Security-Policy":
      "default-src 'none'; " +
      `script-src ${scriptPolicy}; ` +
      `style-src ${stylePolicy}; ` +
      "font-src 'self'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "base-uri 'none'; " +
      "object-src 'none'; " +
      (isHttps ? "upgrade-insecure-requests; " : "") +
      "form-action 'none'; " +
      "frame-ancestors 'none'",
  };
}

export function isAdminFailureLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = adminFailures.get(ip);
  if (!bucket || now > bucket.resetAt) return false;
  return bucket.count >= ADMIN_FAILURE_LIMIT;
}

export function recordAdminFailure(ip: string): void {
  const now = Date.now();
  const bucket = adminFailures.get(ip);
  if (!bucket || now > bucket.resetAt) {
    adminFailures.set(ip, { count: 1, resetAt: now + ADMIN_FAILURE_WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clearAdminFailures(ip: string): void {
  adminFailures.delete(ip);
}

export function maxWebhookBodyBytes(): number {
  return MAX_WEBHOOK_BODY_BYTES;
}
