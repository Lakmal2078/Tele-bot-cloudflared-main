import type { D1Database } from "./types";
import * as db from "./db";

export interface FraudCheckResult {
  /** false only for rate-limit blocks — everything else is a non-blocking flag for admin review. */
  allowed: boolean;
  /** Human-readable warning lines to prepend to the admin notification. */
  flags: string[];
  /** Shown to the user when `allowed` is false. */
  blockMessage?: string;
}

const DEPOSIT_RATE_LIMIT = { windowMinutes: 10, maxRequests: 3 };
const WITHDRAWAL_RATE_LIMIT = { windowMinutes: 10, maxRequests: 3 };

/**
 * Rate-limit repeated submissions from the same Telegram user.
 * Returns `allowed: false` (with a bilingual `blockMessage`) once the limit is exceeded.
 */
export async function checkRateLimit(
  database: D1Database,
  userId: number,
  table: "deposits" | "withdrawals"
): Promise<FraudCheckResult> {
  const limit = table === "deposits" ? DEPOSIT_RATE_LIMIT : WITHDRAWAL_RATE_LIMIT;
  const count = await db.countRecentSubmissions(database, userId, table, limit.windowMinutes);

  if (count >= limit.maxRequests) {
    const kind = table === "deposits" ? "තැන්පතු (deposit)" : "මුදල් ලබාගැනීමේ (withdrawal)";
    return {
      allowed: false,
      flags: [],
      blockMessage:
        `⏳ ඔබ මිනිත්තු ${limit.windowMinutes} ක් ඇතුළත ${kind} ඉල්ලීම් ${limit.maxRequests}ක් යවා අවසන්ය.\n` +
        `කරුණාකර ටික වේලාවක් රැඳී සිට නැවත උත්සාහ කරන්න.\n\n` +
        `⏳ You've submitted too many requests in the last ${limit.windowMinutes} minutes. Please wait a bit and try again.`,
    };
  }
  return { allowed: true, flags: [] };
}

/**
 * Non-blocking fraud checks for a new deposit: duplicate receipt screenshot +
 * player ID already used by another Telegram account. Flags are surfaced to admins only.
 */
export async function checkDepositFraud(
  database: D1Database,
  userId: number,
  playerId: string,
  photoFileId: string | null
): Promise<FraudCheckResult> {
  const flags: string[] = [];

  if (photoFileId) {
    const dupes = await db.findDuplicateReceipt(database, photoFileId, userId);
    if (dupes.length > 0) {
      const others = dupes.map((d) => `#${d.id} (user ${d.user_id})`).join(", ");
      flags.push(`🚨 *DUPLICATE RECEIPT:* Same screenshot previously submitted as ${others}.`);
    }
  }

  const otherOwners = await db.getPlayerIdOwners(database, playerId, userId);
  if (otherOwners.length > 0) {
    flags.push(`⚠️ *SHARED PLAYER ID:* \`${playerId}\` was also used by Telegram user(s): ${otherOwners.join(", ")}.`);
  }

  return { allowed: true, flags };
}

/**
 * Non-blocking fraud checks for a new withdrawal: player ID already used by another
 * Telegram account (no receipt exists for withdrawals, so duplicate-photo check is skipped).
 */
export async function checkWithdrawalFraud(
  database: D1Database,
  userId: number,
  playerId: string
): Promise<FraudCheckResult> {
  const otherOwners = await db.getPlayerIdOwners(database, playerId, userId);
  if (otherOwners.length > 0) {
    return {
      allowed: true,
      flags: [`⚠️ *SHARED PLAYER ID:* \`${playerId}\` was also used by Telegram user(s): ${otherOwners.join(", ")}.`],
    };
  }
  return { allowed: true, flags: [] };
}

/** Build the ⚠️ warning banner prepended to an admin notification, or "" if there are no flags. */
export function formatFraudBanner(flags: string[]): string {
  if (!flags || flags.length === 0) return "";
  return `━━━━━━━━━━━━━━━━━━━━━━━━━\n🛡️ *FRAUD REVIEW FLAGS*\n${flags.join("\n")}\n`;
}

