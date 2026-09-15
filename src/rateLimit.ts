/**
 * Global, per-user, and command-specific rate limiting middleware (in-memory sliding-window buckets).
 *
 * - Per-user bucket: caps how many updates one Telegram user may send per window.
 * - Global bucket: caps total updates across ALL users per window (flood/DoS protection).
 * - Scoped command buckets: dedicated strict rate limiting on high-value or resource-intensive
 *   commands (e.g. betting tip queries: /tips, /freetips, callback:view_free_tips) to prevent
 *   API spamming and automated abuse.
 * - In-memory Maps with lazy TTL sweep — safe on Cloudflare Workers (per-isolate) and Node.js.
 * - No external dependencies.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface ScopedRateLimitRule {
  /** Sliding window length in milliseconds for this scope. Default: 60_000 (1 minute). */
  windowMs?: number;
  /** Max executions allowed in this scope per user per window. */
  maxPerUser: number;
  /** Custom warning message when this specific scope is rate limited. */
  blockMessage?: string;
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
  /** Custom message sent when a user is rate limited by the general limiter. */
  blockMessage?: string;
  /** Optional rule applied to all Telegram slash commands if not explicitly matched. */
  defaultCommandLimit?: ScopedRateLimitRule;
  /** Custom rules keyed by normalized command name (e.g. 'tips', 'freetips', 'deposit'). */
  commandLimits?: Record<string, ScopedRateLimitRule>;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the blocking bucket resets (only set when blocked). */
  retryAfterMs?: number;
  /** Name of the scope or bucket that triggered the limit ('global' | 'user' | 'command:<name>'). */
  scope?: string;
  /** Contextual block message for the triggered scope. */
  blockMessage?: string;
}

const DEFAULT_BLOCK_MESSAGE =
  "⏳ ඔබ වේගය වැඩියෙන් යවමින් සිටියි. ටික වේලාවක් රැඳී සිට නැවත උත්සාහ කරන්න.\n" +
  "⏳ You are sending messages too quickly. Please slow down and try again in a moment.";

export const DEFAULT_TIPS_BLOCK_MESSAGE =
  "🎯 Sports Betting Tips නැරඹීමේ සීමාව ඉක්මවා ඇත. කරුණාකර තත්පර කිහිපයකින් නැවත උත්සාහ කරන්න හෝ අපගේ නිල Tips Channel වෙත පිවිසෙන්න.\n" +
  "⏳ Betting tips query limit reached. Please wait a moment before requesting again or check our official channel.";

export class RateLimiter {
  private userBuckets = new Map<number, Bucket>();
  private scopedBuckets = new Map<string, Bucket>();
  private globalBucket: Bucket = { count: 0, resetAt: 0 };
  private readonly windowMs: number;
  private readonly maxPerUser: number;
  private readonly maxGlobal: number;
  private readonly exemptUserIds: Set<number>;
  private readonly blockMessage: string;
  private readonly defaultCommandLimit?: ScopedRateLimitRule;
  private readonly commandLimits: Map<string, ScopedRateLimitRule>;

  constructor(options: RateLimitOptions = {}) {
    this.windowMs = options.windowMs ?? 60_000;
    this.maxPerUser = options.maxPerUser ?? 20;
    this.maxGlobal = options.maxGlobal ?? 300;
    this.exemptUserIds = new Set(options.exemptUserIds ?? []);
    this.blockMessage = options.blockMessage || DEFAULT_BLOCK_MESSAGE;
    this.defaultCommandLimit = options.defaultCommandLimit;
    this.commandLimits = new Map();
    if (options.commandLimits) {
      for (const [cmd, rule] of Object.entries(options.commandLimits)) {
        this.commandLimits.set(cmd.toLowerCase().replace(/^\//, ""), rule);
      }
    }
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
    // Lazy cleanup so Maps cannot grow unbounded on long-running processes.
    if (this.userBuckets.size > 5000 || this.scopedBuckets.size > 5000) this.sweep(now);

    // Admins / exempt users bypass limiting entirely.
    if (userId !== undefined && this.exemptUserIds.has(userId)) {
      return { allowed: true };
    }

    // Global bucket check.
    if (this.globalBucket.count >= this.maxGlobal) {
      return {
        allowed: false,
        retryAfterMs: Math.max(0, this.globalBucket.resetAt - now),
        scope: "global",
        blockMessage: this.blockMessage,
      };
    }

    // Per-user bucket check.
    if (userId !== undefined) {
      const bucket = this.userBucketFor(userId, now);
      if (bucket.count >= this.maxPerUser) {
        return {
          allowed: false,
          retryAfterMs: Math.max(0, bucket.resetAt - now),
          scope: "user",
          blockMessage: this.blockMessage,
        };
      }
    }

    // Both buckets have room — consume one slot from each.
    this.globalBucket.count++;
    if (userId !== undefined) {
      this.userBucketFor(userId, now).count++;
    }
    return { allowed: true };
  }

  /**
   * Check a specific scoped action or command (e.g. 'tips', 'deposit') for a user.
   * Increments the scoped bucket count only when allowed.
   * Does NOT consume from general per-user/global buckets (call check() for that,
   * or use checkScoped() which validates the specific scope).
   */
  checkScope(
    scopeName: string,
    userId: number | undefined,
    rule: ScopedRateLimitRule,
    now: number = Date.now()
  ): RateLimitResult {
    // Admins / exempt users bypass limiting entirely.
    if (userId !== undefined && this.exemptUserIds.has(userId)) {
      return { allowed: true };
    }

    if (userId === undefined) {
      return { allowed: true };
    }

    const windowMs = rule.windowMs ?? this.windowMs;
    const key = `${scopeName}:${userId}`;
    let bucket = this.scopedBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.scopedBuckets.set(key, bucket);
    }

    if (bucket.count >= rule.maxPerUser) {
      return {
        allowed: false,
        retryAfterMs: Math.max(0, bucket.resetAt - now),
        scope: `scope:${scopeName}`,
        blockMessage: rule.blockMessage || this.blockMessage,
      };
    }

    bucket.count++;
    return { allowed: true };
  }

  /**
   * Check a command by name against configured commandLimits or defaultCommandLimit.
   */
  checkCommand(
    commandName: string,
    userId: number | undefined,
    now: number = Date.now()
  ): RateLimitResult {
    const cleanCmd = commandName.toLowerCase().replace(/^\//, "").trim();
    const rule = this.commandLimits.get(cleanCmd) || this.defaultCommandLimit;
    if (!rule) {
      return { allowed: true };
    }
    return this.checkScope(`cmd:${cleanCmd}`, userId, rule, now);
  }

  /**
   * Extract command name from a grammY Context if the update is a command.
   */
  static extractCommand(ctx: any): string | null {
    if (ctx?.message?.text) {
      const text = ctx.message.text.trimStart();
      if (text.startsWith("/")) {
        const match = text.match(/^\/([a-zA-Z0-9_]+)/);
        if (match) {
          return match[1].toLowerCase();
        }
      }
    }
    return null;
  }

  /**
   * Create dedicated middleware for a specific high-value command or action
   * (e.g. betting tips queries). Can be attached directly to a command or callback.
   */
  scopeMiddleware(scopeName: string, rule: ScopedRateLimitRule) {
    return async (ctx: any, next: () => Promise<void>): Promise<void> => {
      const userId: number | undefined = ctx?.from?.id;
      const result = this.checkScope(scopeName, userId, rule);
      if (!result.allowed) {
        const secs = Math.max(1, Math.ceil((result.retryAfterMs ?? 1000) / 1000));
        const msg = result.blockMessage || this.blockMessage;
        try {
          if (ctx?.callbackQuery && typeof ctx.answerCallbackQuery === "function") {
            await ctx.answerCallbackQuery({
              text: `⏳ ${secs}s: ${msg.split("\n")[0].replace(/[🎯*]/gu, "").slice(0, 150)}`,
              show_alert: true,
            });
          } else if (typeof ctx?.reply === "function") {
            await ctx.reply(msg);
          }
        } catch {
          // Never let rate-limit notifications throw unhandled errors.
        }
        return; // blocked — do not call next()
      }
      await next();
    };
  }

  /**
   * grammY middleware — register BEFORE all command handlers.
   * 1. Performs global and per-user message rate limiting.
   * 2. If the message contains a command, performs specific command rate limiting.
   */
  middleware() {
    return async (ctx: any, next: () => Promise<void>): Promise<void> => {
      const userId: number | undefined = ctx?.from?.id;

      // 1. General per-user & global rate limit check
      const globalResult = this.check(userId);
      if (!globalResult.allowed) {
        await this.handleBlocked(ctx, globalResult);
        return; // blocked
      }

      // 2. If this update is a slash command, check against configured command limits
      const cmd = RateLimiter.extractCommand(ctx);
      if (cmd) {
        const cmdResult = this.checkCommand(cmd, userId);
        if (!cmdResult.allowed) {
          await this.handleBlocked(ctx, cmdResult);
          return; // blocked command
        }
      }

      await next();
    };
  }

  private async handleBlocked(ctx: any, result: RateLimitResult): Promise<void> {
    const secs = Math.max(1, Math.ceil((result.retryAfterMs ?? 1000) / 1000));
    const msg = result.blockMessage || this.blockMessage;
    try {
      if (ctx?.callbackQuery && typeof ctx.answerCallbackQuery === "function") {
        await ctx.answerCallbackQuery({
          text: `⏳ ${secs}s`,
          show_alert: result.scope?.startsWith("scope:") ?? false,
        });
      } else if (typeof ctx?.reply === "function") {
        await ctx.reply(msg);
      }
    } catch {
      // Never let a rate-limit reply break the update pipeline.
    }
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
    for (const [key, bucket] of this.scopedBuckets) {
      if (bucket.resetAt <= now) this.scopedBuckets.delete(key);
    }
  }
}

