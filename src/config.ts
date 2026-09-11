import type { Env } from "./types";

const MIN_SECRET_LENGTH = 16;
const MIN_ADMIN_API_SECRET_LENGTH = 24;

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePositiveNumber(name: string, value: unknown, errors: string[]): number | null {
  if (!nonEmpty(value)) {
    errors.push(`${name} is required`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push(`${name} must be a positive number`);
    return null;
  }
  return parsed;
}

/**
 * Validate security-sensitive production configuration without logging secret values.
 * This is intentionally fail-closed: a production runtime must not start with a
 * missing authentication secret or an invalid financial limit.
 */
export function validateEnv(env: Partial<Env>): string[] {
  const errors: string[] = [];

  for (const name of ["BOT_TOKEN", "ADMIN_IDS", "WEBHOOK_SECRET", "ADMIN_API_SECRET"] as const) {
    if (!nonEmpty(env[name])) errors.push(`${name} is required`);
  }

  const webhookSecret = env.WEBHOOK_SECRET?.trim() || "";
  if (webhookSecret && webhookSecret.length < MIN_SECRET_LENGTH) {
    errors.push(`WEBHOOK_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  const adminApiSecret = env.ADMIN_API_SECRET?.trim() || "";
  if (adminApiSecret && adminApiSecret.length < MIN_ADMIN_API_SECRET_LENGTH) {
    errors.push(`ADMIN_API_SECRET must be at least ${MIN_ADMIN_API_SECRET_LENGTH} characters`);
  }

  const adminIds = (env.ADMIN_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (adminIds.length > 0 && adminIds.some((value) => !/^\d+$/.test(value) || Number(value) <= 0)) {
    errors.push("ADMIN_IDS must contain only positive Telegram numeric IDs separated by commas");
  }

  if (!nonEmpty(env.CHANNEL_USERNAME) && !nonEmpty(env.CHANNEL_URL)) {
    errors.push("CHANNEL_USERNAME or CHANNEL_URL is required");
  }

  const min = parsePositiveNumber("MIN_TRANSACTION_LKR", env.MIN_TRANSACTION_LKR, errors);
  const max = parsePositiveNumber("MAX_TRANSACTION_LKR", env.MAX_TRANSACTION_LKR, errors);
  if (min !== null && max !== null && min > max) {
    errors.push("MIN_TRANSACTION_LKR must not exceed MAX_TRANSACTION_LKR");
  }

  // If automated tips are enabled, all of their required inputs must be present.
  const tipsEnabled = nonEmpty(env.TIPS_CHANNEL_ID) || nonEmpty(env.ODDS_API_KEY);
  if (tipsEnabled) {
    for (const name of ["TIPS_CHANNEL_ID", "ODDS_API_KEY", "TIPS_SPORTS", "TIPS_ODDS_REGIONS"] as const) {
      if (!nonEmpty(env[name])) errors.push(`${name} is required when automated tips are enabled`);
    }

    const tipMin = parsePositiveNumber("TIPS_MIN_ODDS", env.TIPS_MIN_ODDS, errors);
    const tipMax = parsePositiveNumber("TIPS_MAX_ODDS", env.TIPS_MAX_ODDS, errors);
    if (tipMin !== null && tipMax !== null && tipMin > tipMax) {
      errors.push("TIPS_MIN_ODDS must not exceed TIPS_MAX_ODDS");
    }

    parsePositiveNumber("TIPS_HOURS_AHEAD", env.TIPS_HOURS_AHEAD, errors);
  }

  return errors;
}

export function assertValidEnv(env: Partial<Env>, context = "runtime"): void {
  const errors = validateEnv(env);
  if (errors.length > 0) {
    throw new Error(`Invalid ${context} configuration:\n- ${errors.join("\n- ")}`);
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/** Authenticate private operational/diagnostic HTTP endpoints with a dedicated secret. */
export function isAuthorizedAdminRequest(request: Request, env: Partial<Env>): boolean {
  const expected = env.ADMIN_API_SECRET?.trim() || "";
  if (!expected) return false;

  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  const headerSecret = request.headers.get("X-Admin-Secret")?.trim() || "";
  const supplied = bearer || headerSecret;

  return Boolean(supplied) && constantTimeEqual(supplied, expected);
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "WWW-Authenticate": "Bearer",
    },
  });
}
