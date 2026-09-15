import { describe, it, expect } from "vitest";
import { RateLimiter } from "../src/rateLimit";

/** Deterministic clock helper — starts at a fixed epoch, advances manually. */
function makeClock(start = 1_700_000_000_000) {
  let now = start;
  return {
    tick(ms: number) {
      now += ms;
      return now;
    },
    now: () => now,
  };
}

describe("RateLimiter (global rate limiting)", () => {
  it("allows a burst of updates under the per-user limit", () => {
    const clock = makeClock();
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 3, maxGlobal: 100 });
    expect(rl.check(1, clock.now()).allowed).toBe(true);
    expect(rl.check(1, clock.now()).allowed).toBe(true);
    expect(rl.check(1, clock.now()).allowed).toBe(true);
  });

  it("blocks a single user once the per-user limit is exceeded in the window", () => {
    const clock = makeClock();
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 3, maxGlobal: 100 });
    rl.check(1, clock.now());
    rl.check(1, clock.now());
    rl.check(1, clock.now());
    const blocked = rl.check(1, clock.now());
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("does NOT block other users when only one user is rate limited", () => {
    const clock = makeClock();
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 2, maxGlobal: 100 });
    rl.check(1, clock.now());
    rl.check(1, clock.now());
    expect(rl.check(1, clock.now()).allowed).toBe(false); // user 1 blocked
    expect(rl.check(2, clock.now()).allowed).toBe(true); // user 2 unaffected
  });

  it("resets the per-user bucket after the window passes", () => {
    const clock = makeClock();
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 2, maxGlobal: 100 });
    rl.check(1, clock.now());
    rl.check(1, clock.now());
    expect(rl.check(1, clock.now()).allowed).toBe(false);
    // advance past the window
    clock.tick(60_001);
    expect(rl.check(1, clock.now()).allowed).toBe(true);
  });

  it("blocks EVERYONE (global bucket) once the global limit is exceeded", () => {
    const clock = makeClock();
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 100, maxGlobal: 5 });
    for (let i = 1; i <= 5; i++) {
      expect(rl.check(i, clock.now()).allowed).toBe(true);
    }
    // 6th distinct user — global bucket is full
    expect(rl.check(6, clock.now()).allowed).toBe(false);
    // even user 1 (under their own limit) is now blocked globally
    expect(rl.check(1, clock.now()).allowed).toBe(false);
  });

  it("exempts admin user IDs entirely", () => {
    const clock = makeClock();
    const rl = new RateLimiter({
      windowMs: 60_000,
      maxPerUser: 1,
      maxGlobal: 1,
      exemptUserIds: [999],
    });
    // fill the global bucket with a normal user
    expect(rl.check(1, clock.now()).allowed).toBe(true);
    expect(rl.check(1, clock.now()).allowed).toBe(false);
    // admin bypasses both the global and per-user buckets
    expect(rl.check(999, clock.now()).allowed).toBe(true);
    expect(rl.check(999, clock.now()).allowed).toBe(true);
  });

  it("handles updates without a user id (channel posts etc.) via global bucket only", () => {
    const clock = makeClock();
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 1, maxGlobal: 3 });
    expect(rl.check(undefined, clock.now()).allowed).toBe(true);
    expect(rl.check(undefined, clock.now()).allowed).toBe(true);
    expect(rl.check(undefined, clock.now()).allowed).toBe(true);
    expect(rl.check(undefined, clock.now()).allowed).toBe(false); // global full
  });

  it("reports the correct retryAfterMs when blocked", () => {
    const clock = makeClock();
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 1, maxGlobal: 100 });
    rl.check(1, clock.now());
    clock.tick(10_000);
    const blocked = rl.check(1, clock.now());
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(50_000); // 60s window - 10s elapsed
  });

  it("middleware() blocks with a reply and never calls next() when limited", async () => {
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 1, maxGlobal: 100 });
    const mw = rl.middleware();
    let nextCalled = 0;
    const next = async () => {
      nextCalled++;
    };

    // First update passes
    await mw({ from: { id: 7 }, reply: async () => {} }, next);
    expect(nextCalled).toBe(1);

    // Second update is blocked — next() must NOT run, user gets block message
    let replied: string | undefined;
    await mw(
      { from: { id: 7 }, reply: async (msg: string) => (replied = msg) },
      next
    );
    expect(nextCalled).toBe(1);
    expect(replied).toContain("⏳");
  });

  it("middleware() answers callback queries with a short toast instead of a reply", async () => {
    const rl = new RateLimiter({ windowMs: 60_000, maxPerUser: 1, maxGlobal: 100 });
    const mw = rl.middleware();
    const next = async () => {};
    await mw({ from: { id: 8 }, reply: async () => {} }, next);

    let toast: string | undefined;
    await mw(
      {
        from: { id: 8 },
        callbackQuery: { data: "history" },
        answerCallbackQuery: async (o: any) => {
          toast = o?.text;
        },
        reply: async () => {
          throw new Error("reply must not be used for callback queries");
        },
      },
      next
    );
    expect(toast).toContain("⏳");
  });

  it("extractCommand() correctly identifies Telegram commands", () => {
    expect(RateLimiter.extractCommand({ message: { text: "/tips" } })).toBe("tips");
    expect(RateLimiter.extractCommand({ message: { text: "  /freetips@my_bot" } })).toBe("freetips");
    expect(RateLimiter.extractCommand({ message: { text: "/Start 123" } })).toBe("start");
    expect(RateLimiter.extractCommand({ message: { text: "hello world" } })).toBeNull();
    expect(RateLimiter.extractCommand(null)).toBeNull();
  });

  it("enforces dedicated command-specific rate limits on betting tip queries (/tips)", async () => {
    const rl = new RateLimiter({
      windowMs: 60_000,
      maxPerUser: 20, // generous general user limit
      commandLimits: {
        tips: { windowMs: 60_000, maxPerUser: 2, blockMessage: "Tips rate limit" },
      },
    });

    const mw = rl.middleware();
    let executed = 0;
    const next = async () => {
      executed++;
    };

    let replyMsg = "";
    const ctx = {
      from: { id: 42 },
      message: { text: "/tips" },
      reply: async (msg: string) => {
        replyMsg = msg;
      },
    };

    // 1st /tips call -> allowed
    await mw(ctx, next);
    expect(executed).toBe(1);

    // 2nd /tips call -> allowed
    await mw(ctx, next);
    expect(executed).toBe(2);

    // 3rd /tips call -> blocked by command limit even though user has 18 slots left in global
    await mw(ctx, next);
    expect(executed).toBe(2);
    expect(replyMsg).toContain("Tips rate limit");

    // Other non-tips commands or text still have room in general quota
    const otherCtx = {
      from: { id: 42 },
      message: { text: "/help" },
      reply: async () => {},
    };
    await mw(otherCtx, next);
    expect(executed).toBe(3);
  });

  it("checkScope allows dedicated rate limiting for inline callback queries", () => {
    const clock = makeClock();
    const rl = new RateLimiter();
    const rule = { windowMs: 60_000, maxPerUser: 2 };

    expect(rl.checkScope("tips", 101, rule, clock.now()).allowed).toBe(true);
    expect(rl.checkScope("tips", 101, rule, clock.now()).allowed).toBe(true);
    const blocked = rl.checkScope("tips", 101, rule, clock.now());
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(60_000);

    // Exempt user (admin) bypasses checkScope
    const adminRl = new RateLimiter({ exemptUserIds: [999] });
    expect(adminRl.checkScope("tips", 999, rule, clock.now()).allowed).toBe(true);
    expect(adminRl.checkScope("tips", 999, rule, clock.now()).allowed).toBe(true);
    expect(adminRl.checkScope("tips", 999, rule, clock.now()).allowed).toBe(true);
  });
});

