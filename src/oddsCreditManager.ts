import type { Env } from "./types";
import { escapeMarkdown } from "./utils";

export type CreditBucket = "tips" | "scores" | "odds_refresh" | "on_demand" | "other";

export type CreditProtectionTier =
  | "NORMAL"
  | "WARN_800"
  | "RESTRICT_900"
  | "CRITICAL_950"
  | "HARD_STOP_1000";

export const MONTHLY_TOTAL_BUDGET = 1000;
export const MONTHLY_SAFETY_RESERVE = 81;
export const BUCKET_CAPS: Record<CreditBucket, number> = {
  tips: 519,
  scores: 160,
  odds_refresh: 160,
  on_demand: 80,
  other: 81,
};

export const CREDIT_THRESHOLDS = {
  WARN: 800,
  RESTRICT: 900,
  CRITICAL: 950,
  HARD_STOP: 1000,
} as const;

export interface KeyCreditSummary {
  keySlot: number;
  accountLimit: number;
  requestsUsed: number;
  requestsRemaining: number | null;
  lastRequestCost: number;
  totalCalls: number;
  failedCalls: number;
  lastStatus: number | null;
  lastEndpoint: string | null;
  lastError: string | null;
  updatedAt: string | null;
}

export interface MonthlyCreditSummary {
  monthUtc: string;
  totalBudget: number;
  totalUsed: number;
  remaining: number;
  tier: CreditProtectionTier;
  safetyReserve: number;
  buckets: Record<CreditBucket, { used: number; cap: number; calls: number }>;
  keys: KeyCreditSummary[];
  thresholds: {
    warned800: boolean;
    warned900: boolean;
    warned950: boolean;
    hardStopped1000: boolean;
  };
  dailyRecapDate: string | null;
}

export class OddsCreditBudgetError extends Error {
  readonly tier: CreditProtectionTier;
  readonly bucket: CreditBucket;
  readonly totalUsed: number;
  readonly totalBudget: number;

  constructor(
    message: string,
    info: { tier: CreditProtectionTier; bucket: CreditBucket; totalUsed: number; totalBudget: number }
  ) {
    super(message);
    this.name = "OddsCreditBudgetError";
    this.tier = info.tier;
    this.bucket = info.bucket;
    this.totalUsed = info.totalUsed;
    this.totalBudget = info.totalBudget;
  }
}

export function currentUtcMonth(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function classifyProtectionTier(totalUsed: number, totalBudget = MONTHLY_TOTAL_BUDGET): CreditProtectionTier {
  if (totalUsed >= totalBudget || totalUsed >= CREDIT_THRESHOLDS.HARD_STOP) return "HARD_STOP_1000";
  if (totalUsed >= CREDIT_THRESHOLDS.CRITICAL) return "CRITICAL_950";
  if (totalUsed >= CREDIT_THRESHOLDS.RESTRICT) return "RESTRICT_900";
  if (totalUsed >= CREDIT_THRESHOLDS.WARN) return "WARN_800";
  return "NORMAL";
}

function emptyMonthlySummary(monthUtc: string): MonthlyCreditSummary {
  return {
    monthUtc,
    totalBudget: MONTHLY_TOTAL_BUDGET,
    totalUsed: 0,
    remaining: MONTHLY_TOTAL_BUDGET,
    tier: "NORMAL",
    safetyReserve: MONTHLY_SAFETY_RESERVE,
    buckets: {
      tips: { used: 0, cap: BUCKET_CAPS.tips, calls: 0 },
      scores: { used: 0, cap: BUCKET_CAPS.scores, calls: 0 },
      odds_refresh: { used: 0, cap: BUCKET_CAPS.odds_refresh, calls: 0 },
      on_demand: { used: 0, cap: BUCKET_CAPS.on_demand, calls: 0 },
      other: { used: 0, cap: BUCKET_CAPS.other, calls: 0 },
    },
    keys: [],
    thresholds: {
      warned800: false,
      warned900: false,
      warned950: false,
      hardStopped1000: false,
    },
    dailyRecapDate: null,
  };
}

export async function getMonthlyCreditSummary(env: Partial<Env>, monthUtc = currentUtcMonth()): Promise<MonthlyCreditSummary> {
  const summary = emptyMonthlySummary(monthUtc);
  if (!env.DB || typeof env.DB.prepare !== "function") return summary;

  try {
    const guardRow = await env.DB.prepare(
      `SELECT total_budget, warned_800, warned_900, warned_950, hard_stopped_1000, daily_recap_date
       FROM odds_credit_guard_state WHERE month_utc = ?`
    ).bind(monthUtc).first<{
      total_budget?: number;
      warned_800?: number;
      warned_900?: number;
      warned_950?: number;
      hard_stopped_1000?: number;
      daily_recap_date?: string | null;
    }>();

    if (guardRow) {
      const parsedBudget = Number(guardRow.total_budget);
      if (Number.isFinite(parsedBudget) && parsedBudget > 0) summary.totalBudget = parsedBudget;
      summary.thresholds = {
        warned800: Number(guardRow.warned_800 || 0) === 1,
        warned900: Number(guardRow.warned_900 || 0) === 1,
        warned950: Number(guardRow.warned_950 || 0) === 1,
        hardStopped1000: Number(guardRow.hard_stopped_1000 || 0) === 1,
      };
      summary.dailyRecapDate = guardRow.daily_recap_date || null;
    }

    const bucketRows = (await env.DB.prepare(
      `SELECT bucket, credits_used, call_count FROM odds_credit_buckets WHERE month_utc = ?`
    ).bind(monthUtc).all<{ bucket?: string; credits_used?: number; call_count?: number }>()).results || [];

    let bucketTotalUsed = 0;
    for (const row of bucketRows) {
      const b = String(row?.bucket || "") as CreditBucket;
      const used = Math.max(0, Number(row?.credits_used || 0) || 0);
      const calls = Math.max(0, Number(row?.call_count || 0) || 0);
      if (b in summary.buckets) {
        summary.buckets[b].used = used;
        summary.buckets[b].calls = calls;
      }
      bucketTotalUsed += used;
    }

    const keyRows = (await env.DB.prepare(
      `SELECT key_slot, account_limit, requests_used, requests_remaining, last_request_cost,
              total_calls, failed_calls, last_status, last_endpoint, last_error, updated_at
       FROM odds_credit_monthly WHERE month_utc = ? ORDER BY key_slot ASC`
    ).bind(monthUtc).all<Record<string, unknown>>()).results || [];

    const keys: KeyCreditSummary[] = [];
    for (const row of keyRows) {
      if (row?.key_slot === undefined || row?.key_slot === null) continue;
      keys.push({
        keySlot: Number(row.key_slot),
        accountLimit: Math.max(1, Number(row.account_limit || 500) || 500),
        requestsUsed: Math.max(0, Number(row.requests_used || 0) || 0),
        requestsRemaining: row.requests_remaining !== null && row.requests_remaining !== undefined && Number.isFinite(Number(row.requests_remaining))
          ? Number(row.requests_remaining)
          : null,
        lastRequestCost: Math.max(0, Number(row.last_request_cost || 0) || 0),
        totalCalls: Math.max(0, Number(row.total_calls || 0) || 0),
        failedCalls: Math.max(0, Number(row.failed_calls || 0) || 0),
        lastStatus: row.last_status !== null && row.last_status !== undefined ? Number(row.last_status) : null,
        lastEndpoint: row.last_endpoint ? String(row.last_endpoint) : null,
        lastError: row.last_error ? String(row.last_error) : null,
        updatedAt: row.updated_at ? String(row.updated_at) : null,
      });
    }
    summary.keys = keys;

    // Detect if keys appear to share one 1,000-credit account vs two separate 500-credit accounts.
    // Separate 500-credit keys have observed (used + remaining <= 550) per key, so their independent
    // usages sum up. If a key reports > 550 combined capacity, it is a single shared pool.
    let headerTotalUsed = 0;
    const isSingleSharedPool = keys.some((k) =>
      k.requestsRemaining !== null && (k.requestsUsed + k.requestsRemaining) > 550
    );
    if (isSingleSharedPool) {
      headerTotalUsed = keys.reduce((max, k) => Math.max(max, k.requestsUsed), 0);
    } else {
      headerTotalUsed = keys.reduce((sum, k) => sum + k.requestsUsed, 0);
    }

    summary.totalUsed = Math.max(bucketTotalUsed, headerTotalUsed);
    summary.remaining = Math.max(0, summary.totalBudget - summary.totalUsed);
    summary.tier = classifyProtectionTier(summary.totalUsed, summary.totalBudget);
  } catch (err) {
    console.warn("[OddsCreditManager] Failed to load credit summary:", err instanceof Error ? err.message : err);
  }

  return summary;
}

export async function canMakeOddsRequest(
  env: Partial<Env>,
  bucket: CreditBucket,
  estimatedCost: number,
  options?: { isSettlementRetry?: boolean }
): Promise<{ allowed: boolean; reason?: string; summary: MonthlyCreditSummary }> {
  const summary = await getMonthlyCreditSummary(env);
  const cost = Math.max(0, Math.floor(estimatedCost));

  // 0-credit endpoints (/v4/sports, /v4/sports/{sport}/events) are always allowed.
  if (cost === 0) {
    return { allowed: true, summary };
  }

  // 1,000 hard stop blocks ALL paid requests.
  if (summary.totalUsed >= summary.totalBudget || summary.totalUsed + cost > summary.totalBudget) {
    return {
      allowed: false,
      reason: `Monthly Odds API hard stop reached (${summary.totalUsed}/${summary.totalBudget} credits used).`,
      summary,
    };
  }

  // 950+ critical tier: stop value alerts/extra refreshes and on-demand commands.
  if (summary.tier === "CRITICAL_950" && (bucket === "on_demand" || bucket === "odds_refresh")) {
    return {
      allowed: false,
      reason: `Critical credit reserve active (${summary.totalUsed}/${summary.totalBudget}); extra refreshes and on-demand requests paused.`,
      summary,
    };
  }

  // 900+ restrict tier: stop non-essential refreshes and non-settlement live score refreshes.
  if (summary.tier === "RESTRICT_900") {
    if (bucket === "odds_refresh") {
      return {
        allowed: false,
        reason: `Credit restriction active (${summary.totalUsed}/${summary.totalBudget}); extra odds refresh paused.`,
        summary,
      };
    }
    if (bucket === "scores" && options?.isSettlementRetry === false) {
      return {
        allowed: false,
        reason: `Credit restriction active (${summary.totalUsed}/${summary.totalBudget}); live-only score polling paused.`,
        summary,
      };
    }
  }

  // Enforce individual feature bucket caps for add-on features so Scheduled Tips keeps its 519 + 81 reserve.
  if (bucket === "odds_refresh" || bucket === "on_demand" || bucket === "scores") {
    const bState = summary.buckets[bucket];
    if (bState.used + cost > bState.cap) {
      return {
        allowed: false,
        reason: `Monthly ${bucket} allocation reached (${bState.used}/${bState.cap} credits).`,
        summary,
      };
    }
  }

  return { allowed: true, summary };
}

async function dispatchCreditAlert(env: Partial<Env>, message: string): Promise<void> {
  if (!env.BOT_TOKEN) return;
  const targets: string[] = [];
  if (env.ADMIN_CHANNEL_ID) targets.push(env.ADMIN_CHANNEL_ID.replace(/^id:\s*/i, "").trim());
  if (env.ADMIN_IDS) {
    for (const raw of env.ADMIN_IDS.split(",")) {
      const trimmed = raw.trim();
      if (trimmed && /^-?\d+$/.test(trimmed)) targets.push(trimmed);
    }
  }
  for (const chatId of [...new Set(targets)]) {
    try {
      await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });
    } catch {}
  }
}

export async function recordOddsApiCall(
  env: Partial<Env>,
  input: {
    keySlot: number;
    bucket: CreditBucket;
    endpoint: string;
    estimatedCost: number;
    actualCostHeader?: number | null;
    remainingHeader?: number | null;
    usedHeader?: number | null;
    status: number;
    error?: string | null;
  }
): Promise<MonthlyCreditSummary> {
  const monthUtc = currentUtcMonth();
  const db = env.DB;
  if (!db || typeof db.prepare !== "function") {
    return emptyMonthlySummary(monthUtc);
  }

  const effectiveCost = input.status >= 200 && input.status < 300
    ? Math.max(0, input.actualCostHeader ?? input.estimatedCost)
    : 0;
  const isFailure = input.status < 200 || input.status >= 300 ? 1 : 0;

  try {
    await db.batch([
      db.prepare(`
        INSERT INTO odds_credit_guard_state (month_utc, total_budget)
        VALUES (?, ?)
        ON CONFLICT(month_utc) DO NOTHING
      `).bind(monthUtc, MONTHLY_TOTAL_BUDGET),
      db.prepare(`
        INSERT INTO odds_credit_monthly (
          month_utc, key_slot, account_limit, requests_used, requests_remaining,
          last_request_cost, total_calls, failed_calls, last_status, last_endpoint, last_error, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(month_utc, key_slot) DO UPDATE SET
          account_limit = CASE
            WHEN excluded.requests_remaining IS NOT NULL AND (COALESCE(excluded.requests_used, 0) + excluded.requests_remaining) > 550
            THEN MAX(odds_credit_monthly.account_limit, COALESCE(excluded.requests_used, 0) + excluded.requests_remaining)
            ELSE odds_credit_monthly.account_limit
          END,
          requests_used = CASE
            WHEN ? IS NOT NULL THEN ?
            ELSE odds_credit_monthly.requests_used + excluded.last_request_cost
          END,
          requests_remaining = COALESCE(excluded.requests_remaining, odds_credit_monthly.requests_remaining),
          last_request_cost = excluded.last_request_cost,
          total_calls = odds_credit_monthly.total_calls + 1,
          failed_calls = odds_credit_monthly.failed_calls + excluded.failed_calls,
          last_status = excluded.last_status,
          last_endpoint = excluded.last_endpoint,
          last_error = excluded.last_error,
          updated_at = datetime('now')
      `).bind(
        monthUtc,
        input.keySlot,
        500,
        input.usedHeader !== null && input.usedHeader !== undefined ? Math.max(0, input.usedHeader) : effectiveCost,
        input.remainingHeader ?? null,
        effectiveCost,
        isFailure,
        input.status,
        input.endpoint.slice(0, 140),
        input.error ? input.error.slice(0, 300) : null,
        input.usedHeader ?? null,
        input.usedHeader !== null && input.usedHeader !== undefined ? Math.max(0, input.usedHeader) : 0
      ),
      db.prepare(`
        INSERT INTO odds_credit_buckets (month_utc, bucket, credits_used, call_count, updated_at)
        VALUES (?, ?, ?, 1, datetime('now'))
        ON CONFLICT(month_utc, bucket) DO UPDATE SET
          credits_used = odds_credit_buckets.credits_used + excluded.credits_used,
          call_count = odds_credit_buckets.call_count + 1,
          updated_at = datetime('now')
      `).bind(monthUtc, input.bucket, effectiveCost),
    ]);

    const summary = await getMonthlyCreditSummary(env, monthUtc);

    // One-time per-month Admin warnings on 800, 900, 950, and 1000 thresholds
    const checkAndAlert = async (
      threshold: number,
      column: "warned_800" | "warned_900" | "warned_950" | "hard_stopped_1000",
      alreadyFlagged: boolean,
      title: string,
      body: string
    ) => {
      if (summary.totalUsed < threshold || alreadyFlagged) return;
      const claim = await db.prepare(
        `UPDATE odds_credit_guard_state SET ${column} = 1, updated_at = datetime('now') WHERE month_utc = ? AND ${column} = 0`
      ).bind(monthUtc).run();
      if ((claim.meta?.changes ?? 0) === 1) {
        await dispatchCreditAlert(
          env,
          `${title}\n📊 *Usage:* ${summary.totalUsed} / ${summary.totalBudget} credits\n📅 *Month:* \`${monthUtc}\`\n${escapeMarkdown(body)}`
        );
      }
    };

    await checkAndAlert(
      CREDIT_THRESHOLDS.HARD_STOP,
      "hard_stopped_1000",
      summary.thresholds.hardStopped1000,
      "🛑 *[ODDS API HARD STOP — 1,000 CREDITS]*",
      "All paid Odds API requests are automatically paused until next UTC month to protect your quota."
    );
    await checkAndAlert(
      CREDIT_THRESHOLDS.CRITICAL,
      "warned_950",
      summary.thresholds.warned950,
      "🚨 *[ODDS API CRITICAL — 950 CREDITS]*",
      "Extra odds refreshes, Value Alerts, and on-demand /scores & /odds live refreshes are now paused."
    );
    await checkAndAlert(
      CREDIT_THRESHOLDS.RESTRICT,
      "warned_900",
      summary.thresholds.warned900,
      "⚠️ *[ODDS API RESTRICTED — 900 CREDITS]*",
      "Non-essential background odds refreshes paused to preserve remaining scheduled tips & settlement credits."
    );
    await checkAndAlert(
      CREDIT_THRESHOLDS.WARN,
      "warned_800",
      summary.thresholds.warned800,
      "⚠️ *[ODDS API WARNING — 800 CREDITS]*",
      "80% of your 1,000 monthly credit budget has been used."
    );

    return summary;
  } catch (err) {
    console.warn("[OddsCreditManager] Failed to record credit usage:", err instanceof Error ? err.message : err);
    return emptyMonthlySummary(monthUtc);
  }
}
