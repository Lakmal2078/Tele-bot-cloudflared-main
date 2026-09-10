/**
 * Global & per-user rate limiting middleware (in-memory sliding-window buckets).
 *
 * - Per-user bucket: caps how many updates one Telegram user may send per window.
 * - Global bucket: caps total updates across ALL users per window (flood/DoS protection).
 * - In-memory Maps with lazy TTL sweep — safe on Cloudflare Workers (per-isolate) and Node.js.
 * - No external dependencies.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Sliding window length in milliseconds. Default: 60_000 (1 minute). */
  windowMs?: number;
  /** Max updates a single user may send per window. Default: 20. */
  maxPerUser?: number;
  /** Max updates across ALL users per window. Default: 300. */
  maxGlobal?: number;
  /** User IDs exempt from limiting (e.g. bot admins). */
  exemptUserIds?: number[];
  /** Custom message sent when a user is rate limited. */
  blockMessage?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the blocking bucket resets (only set when blocked). */
  retryAfterMs?: number;
}

const DEFAULT_BLOCK_MESSAGE =
  "⏳ ඔබ වේගය වැඩියෙන් යවමින් සිටියි. ටික වේලාවක් රැඳී සිට නැවත උත්සාහ කරන්න.\n" +
  "⏳ You are sending messages too quickly. Please slow down and try again in a moment.";

export class RateLimiter {
  private userBuckets = new Map<number, Bucket>();
  private globalBucket: Bucket = { count: 0, resetAt: 0 };
  private readonly windowMs: number;
  private readonly maxPerUser: number;
  private readonly maxGlobal: number;
  private readonly exemptUserIds: Set<number>;
  private readonly blockMessage: string;

  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.maxPerUser = options.maxPerUser ?? 20;
    this.maxGlobal = options.maxGlobal ?? 300;
    this.exemptUserIds = new Set(options.exemptUserIds ?? []);
    this.blockMessage = options.blockMessage || DEFAULT_BLOCK_MESSAGE;
  }

  /**
   * Pure decision function — increments counters when allowed.
   * `now` is injectable for deterministic unit testing.
   */
  check(userId: number | undefined, now: number = Date.now()): RateLimitResult {
    // Reset the global window if it expired.
    if (this.globalBucket.resetAt <= now) {
      this.globalBucket = { count: 0, resetAt: now + this.windowMs };
    }
    // Lazy cleanup so the Map cannot grow unbounded on long-running processes.
    if (this.userBuckets.size > 5000) this.sweep(now);

    // Admins / exempt users bypass limiting entirely.
    if (userId !== undefined && this.exemptUserIds.has(userId)) {
      return { allowed: true };
    }

    // Global bucket check.
    if (this.globalBucket.count >= this.maxGlobal) {
      return { allowed: false, retryAfterMs: this.globalBucket.resetAt - now };
    }

    // Per-user bucket check.
    if (userId !== undefined) {
      const bucket = this.userBucketFor(userId, now);
      if (bucket.count >= this.maxPerUser) {
        return { allowed: false, retryAfterMs: bucket.resetAt - now };
      }
    }

    // Both buckets have room — consume one slot from each.
    this.globalBucket.count++;
    if (userId !== undefined) {
      this.userBucketFor(userId, now).count++;
    }
    return { allowed: true };
  }

  /** grammY middleware — register BEFORE all command handlers. */
  middleware() {
    return async (ctx: any, next: () => Promise<void>): Promise<void> => {
      const userId: number | undefined = ctx?.from?.id;
      const result = this.check(userId);
      if (!result.allowed) {
        const secs = Math.max(1, Math.ceil((result.retryAfterMs ?? 1000) / 1000));
        try {
          if (ctx?.callbackQuery && typeof ctx.answerCallbackQuery === "function") {
            await ctx.answerCallbackQuery({ text: `⏳ ${secs}s`, show_alert: false });
          } else if (typeof ctx?.reply === "function") {
            await ctx.reply(this.blockMessage);
          }
        } catch {
          // Never let a rate-limit reply break the update pipeline.
        }
        return; // blocked — do not call next()
      }
      await next();
    };
  }

  private userBucketFor(userId: number, now: number): Bucket {
    let bucket = this.userBuckets.get(userId);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.userBuckets.set(userId, bucket);
    }
    return bucket;
  }

  private sweep(now: number): void {
    for (const [id, bucket] of this.userBuckets) {
      if (bucket.resetAt <= now) this.userBuckets.delete(id);
    }
  }
}
