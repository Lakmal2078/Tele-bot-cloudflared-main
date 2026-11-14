import { describe, expect, it, vi } from "vitest";
import {
  BUCKET_CAPS,
  CREDIT_THRESHOLDS,
  MONTHLY_SAFETY_RESERVE,
  MONTHLY_TOTAL_BUDGET,
  canMakeOddsRequest,
  classifyProtectionTier,
  currentUtcMonth,
  getMonthlyCreditSummary,
  recordOddsApiCall,
} from "../src/oddsCreditManager";
import { extractEventBestOdds, processOddsIntelligence, type OddsEventLike } from "../src/bestOdds";
import { getLiveScoresOnDemand, updateLiveScoresForActiveTips } from "../src/liveScores";
import { getDetailedPerformanceReport, maybePostDailyPerformanceRecap } from "../src/tipsPerformance";
import { getPublicTips } from "../src/publicTips";
import { handleApiRequest } from "../src/apiRoutes";
import type { Env } from "../src/types";

interface InMemoryTables {
  guardState: Map<string, {
    month_utc: string;
    total_budget: number;
    warned_800: number;
    warned_900: number;
    warned_950: number;
    hard_stopped_1000: number;
    daily_recap_date: string | null;
  }>;
  keysMonthly: Map<string, {
    month_utc: string;
    key_slot: number;
    account_limit: number;
    requests_used: number;
    requests_remaining: number | null;
    last_request_cost: number;
    total_calls: number;
    failed_calls: number;
    last_status: number | null;
    last_endpoint: string | null;
    last_error: string | null;
    updated_at: string;
  }>;
  buckets: Map<string, {
    month_utc: string;
    bucket: string;
    credits_used: number;
    call_count: number;
    updated_at: string;
  }>;
  oddsSnapshots: Map<string, Record<string, any>>;
  valueAlerts: Map<string, Record<string, any>>;
  liveScores: Map<string, Record<string, any>>;
  tipPosts: Array<Record<string, any>>;
  tipResults: Array<Record<string, any>>;
}

function createInMemoryD1(seed?: Partial<InMemoryTables>): { db: any; tables: InMemoryTables } {
  const tables: InMemoryTables = {
    guardState: seed?.guardState ?? new Map(),
    keysMonthly: seed?.keysMonthly ?? new Map(),
    buckets: seed?.buckets ?? new Map(),
    oddsSnapshots: seed?.oddsSnapshots ?? new Map(),
    valueAlerts: seed?.valueAlerts ?? new Map(),
    liveScores: seed?.liveScores ?? new Map(),
    tipPosts: seed?.tipPosts ?? [],
    tipResults: seed?.tipResults ?? [],
  };

  const execSql = (sql: string, args: unknown[], mode: "first" | "all" | "run"): any => {
    const q = sql.replace(/\s+/g, " ").trim();

    // 1. odds_credit_guard_state
    if (q.startsWith("INSERT INTO odds_credit_guard_state")) {
      const month = String(args[0]);
      const budget = Number(args[1] ?? MONTHLY_TOTAL_BUDGET);
      if (!tables.guardState.has(month)) {
        tables.guardState.set(month, {
          month_utc: month,
          total_budget: budget,
          warned_800: 0,
          warned_900: 0,
          warned_950: 0,
          hard_stopped_1000: 0,
          daily_recap_date: null,
        });
      }
      return { success: true, meta: { changes: 1 } };
    }

    if (q.includes("FROM odds_credit_guard_state WHERE month_utc = ?")) {
      const row = tables.guardState.get(String(args[0])) ?? null;
      return mode === "first" ? row : { results: row ? [row] : [] };
    }

    if (q.startsWith("UPDATE odds_credit_guard_state SET daily_recap_date = NULL")) {
      const month = String(args[0]);
      const date = String(args[1]);
      const cur = tables.guardState.get(month);
      if (cur && cur.daily_recap_date === date) {
        cur.daily_recap_date = null;
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    if (q.startsWith("UPDATE odds_credit_guard_state SET daily_recap_date = ?")) {
      const date = String(args[0]);
      const month = String(args[1]);
      const cur = tables.guardState.get(month);
      if (cur && cur.daily_recap_date !== date) {
        cur.daily_recap_date = date;
        return { success: true, meta: { changes: 1 } };
      }
      return { success: true, meta: { changes: 0 } };
    }

    for (const col of ["warned_800", "warned_900", "warned_950", "hard_stopped_1000"] as const) {
      if (q.startsWith(`UPDATE odds_credit_guard_state SET ${col} = 1`)) {
        const month = String(args[0]);
        const cur = tables.guardState.get(month);
        if (cur && cur[col] === 0) {
          cur[col] = 1;
          return { success: true, meta: { changes: 1 } };
        }
        return { success: true, meta: { changes: 0 } };
      }
    }

    // 2. odds_credit_monthly
    if (q.startsWith("INSERT INTO odds_credit_monthly")) {
      const month = String(args[0]);
      const keySlot = Number(args[1]);
      const acctLimit = Number(args[2]);
      const initialUsed = Number(args[3]);
      const remaining = args[4] !== null && args[4] !== undefined ? Number(args[4]) : null;
      const lastCost = Number(args[5]);
      const isFailure = Number(args[6]);
      const status = Number(args[7]);
      const endpoint = String(args[8] || "");
      const error = args[9] ? String(args[9]) : null;
      const usedHeader = args[10] !== null && args[10] !== undefined ? Number(args[10]) : null;
      const usedHeaderVal = Number(args[11] || 0);

      const key = `${month}:${keySlot}`;
      const existing = tables.keysMonthly.get(key);
      if (!existing) {
        tables.keysMonthly.set(key, {
          month_utc: month,
          key_slot: keySlot,
          account_limit: remaining !== null && initialUsed + remaining > 550
            ? Math.max(acctLimit, initialUsed + remaining)
            : acctLimit,
          requests_used: initialUsed,
          requests_remaining: remaining,
          last_request_cost: lastCost,
          total_calls: 1,
          failed_calls: isFailure,
          last_status: status,
          last_endpoint: endpoint,
          last_error: error,
          updated_at: new Date().toISOString(),
        });
      } else {
        const nextUsed = usedHeader !== null ? usedHeaderVal : existing.requests_used + lastCost;
        const nextRemaining = remaining !== null ? remaining : existing.requests_remaining;
        existing.account_limit = nextRemaining !== null && nextUsed + nextRemaining > 550
          ? Math.max(existing.account_limit, nextUsed + nextRemaining)
          : existing.account_limit;
        existing.requests_used = nextUsed;
        existing.requests_remaining = nextRemaining;
        existing.last_request_cost = lastCost;
        existing.total_calls += 1;
        existing.failed_calls += isFailure;
        existing.last_status = status;
        existing.last_endpoint = endpoint;
        existing.last_error = error;
        existing.updated_at = new Date().toISOString();
      }
      return { success: true, meta: { changes: 1 } };
    }

    if (q.includes("FROM odds_credit_monthly WHERE month_utc = ?")) {
      const month = String(args[0]);
      const rows = [...tables.keysMonthly.values()]
        .filter((r) => r.month_utc === month)
        .sort((a, b) => a.key_slot - b.key_slot);
      return mode === "first" ? (rows[0] ?? null) : { results: rows };
    }

    // 3. odds_credit_buckets
    if (q.startsWith("INSERT INTO odds_credit_buckets")) {
      const month = String(args[0]);
      const bucket = String(args[1]);
      const cost = Number(args[2] || 0);
      const key = `${month}:${bucket}`;
      const existing = tables.buckets.get(key);
      if (!existing) {
        tables.buckets.set(key, {
          month_utc: month,
          bucket,
          credits_used: cost,
          call_count: 1,
          updated_at: new Date().toISOString(),
        });
      } else {
        existing.credits_used += cost;
        existing.call_count += 1;
        existing.updated_at = new Date().toISOString();
      }
      return { success: true, meta: { changes: 1 } };
    }

    if (q.includes("FROM odds_credit_buckets WHERE month_utc = ?")) {
      const month = String(args[0]);
      const rows = [...tables.buckets.values()].filter((r) => r.month_utc === month);
      return mode === "first" ? (rows[0] ?? null) : { results: rows };
    }

    // 4. odds_snapshots
    if (q.startsWith("SELECT event_id, best_home_odds, best_away_odds FROM odds_snapshots")) {
      const ids = new Set(args.map((a) => String(a)));
      const rows = [...tables.oddsSnapshots.values()].filter((r) => ids.has(r.event_id));
      return { results: rows };
    }

    if (q.startsWith("INSERT INTO odds_snapshots")) {
      const eventId = String(args[0]);
      const prev = tables.oddsSnapshots.get(eventId);
      const nextHome = args[7] != null ? Number(args[7]) : null;
      const nextAway = args[11] != null ? Number(args[11]) : null;
      const prevHome = prev && prev.best_home_odds != null && prev.best_home_odds !== nextHome
        ? prev.best_home_odds
        : (prev?.prev_best_home_odds ?? (args[13] ?? null));
      const prevAway = prev && prev.best_away_odds != null && prev.best_away_odds !== nextAway
        ? prev.best_away_odds
        : (prev?.prev_best_away_odds ?? (args[14] ?? null));

      tables.oddsSnapshots.set(eventId, {
        event_id: eventId,
        sport_key: args[1],
        sport_title: args[2],
        home_team: args[3],
        away_team: args[4],
        commence_time: args[5],
        market: args[6],
        best_home_odds: nextHome,
        best_home_bookmaker: args[8],
        best_draw_odds: args[9],
        best_draw_bookmaker: args[10],
        best_away_odds: nextAway,
        best_away_bookmaker: args[12],
        prev_best_home_odds: prevHome,
        prev_best_away_odds: prevAway,
        best_selection: args[15],
        best_value_score: args[16],
        best_consensus_prob: args[17],
        bookmakers_json: args[18],
        fetched_at: args[19],
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (q.includes("FROM odds_snapshots")) {
      const rows = [...tables.oddsSnapshots.values()];
      return mode === "first" ? (rows[0] ?? null) : { results: rows };
    }

    // 5. value_odds_alerts
    if (q.startsWith("SELECT best_odds, alerted_at FROM value_odds_alerts WHERE dedup_key = ?")) {
      const row = tables.valueAlerts.get(String(args[0])) ?? null;
      return mode === "first" ? row : { results: row ? [row] : [] };
    }

    if (q.startsWith("INSERT INTO value_odds_alerts")) {
      const dedupKey = String(args[0]);
      tables.valueAlerts.set(dedupKey, {
        dedup_key: dedupKey,
        event_id: args[1],
        sport_key: args[2],
        sport_title: args[3],
        home_team: args[4],
        away_team: args[5],
        commence_time: args[6],
        selection: args[7],
        best_odds: args[8],
        bookmaker: args[9],
        consensus_prob: args[10],
        value_score: args[11],
        telegram_message_id: args[12],
        alerted_at: new Date().toISOString(),
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (q.includes("FROM value_odds_alerts")) {
      const rows = [...tables.valueAlerts.values()];
      return mode === "first" ? (rows[0] ?? null) : { results: rows };
    }

    // 6. live_score_cache
    if (q.startsWith("INSERT INTO live_score_cache")) {
      const eventId = String(args[0]);
      const prev = tables.liveScores.get(eventId);
      tables.liveScores.set(eventId, {
        event_id: eventId,
        sport_key: args[1],
        sport_title: args[2],
        home_team: args[3],
        away_team: args[4],
        commence_time: args[5] ?? prev?.commence_time ?? null,
        score_home: args[6] ?? prev?.score_home ?? null,
        score_away: args[7] ?? prev?.score_away ?? null,
        completed: args[8],
        status_text: args[9],
        is_live: args[10],
        last_update: args[11] ?? prev?.last_update ?? null,
        fetched_at: args[12],
        last_notified_score: prev?.last_notified_score ?? null,
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (q.startsWith("UPDATE live_score_cache SET last_notified_score = ?")) {
      const sig = String(args[0]);
      const eid = String(args[1]);
      const row = tables.liveScores.get(eid);
      if (row) row.last_notified_score = sig;
      return { success: true, meta: { changes: row ? 1 : 0 } };
    }

    if (q.includes("FROM live_score_cache WHERE event_id IN")) {
      const ids = new Set(args.map((a) => String(a)));
      const rows = [...tables.liveScores.values()].filter(
        (r) => ids.has(r.event_id) && r.score_home != null && r.score_away != null
      );
      return { results: rows };
    }

    if (q.includes("FROM live_score_cache")) {
      const rows = [...tables.liveScores.values()];
      return mode === "first" ? (rows[0] ?? null) : { results: rows };
    }

    // 7. tip_posts & tip_results
    if (q.includes("FROM tip_posts") && q.includes("COUNT(*) AS total")) {
      const slDate = args.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(String(args[0])) ? String(args[0]) : null;
      const filtered = tables.tipPosts.filter((p) => {
        if (p.status !== "POSTED") return false;
        if (!["WON", "LOST", "PARTIAL", "VOID"].includes(String(p.result || ""))) return false;
        if ((p.market || "") === "fallback") return false;
        if (slDate && p.sl_date !== slDate) return false;
        return true;
      });
      return {
        total: filtered.length,
        won: filtered.filter((p) => p.result === "WON").length,
        lost: filtered.filter((p) => p.result === "LOST").length,
        partial: filtered.filter((p) => p.result === "PARTIAL").length,
      };
    }

    if (q.includes("FROM tip_posts WHERE status = 'POSTED'") && q.includes("tips_json")) {
      return { results: tables.tipPosts.filter((p) => p.status === "POSTED") };
    }

    if (q.includes("FROM tip_posts")) {
      return mode === "first" ? (tables.tipPosts[0] ?? null) : { results: tables.tipPosts };
    }

    if (q.includes("FROM tip_results") && q.includes("net_units")) {
      if (q.includes("GROUP BY sport_key")) {
        const bySport = new Map<string, Record<string, any>>();
        for (const r of tables.tipResults) {
          if (!["WON", "LOST", "VOID"].includes(r.result)) continue;
          const entry = bySport.get(r.sport_key) ?? {
            sport_key: r.sport_key,
            sport_title: r.sport_title || r.sport_key,
            picks: 0,
            won_picks: 0,
            lost_picks: 0,
            void_picks: 0,
            net_units: 0,
          };
          entry.picks += 1;
          if (r.result === "WON") {
            entry.won_picks += 1;
            entry.net_units += Number(r.odds || 1) - 1;
          } else if (r.result === "LOST") {
            entry.lost_picks += 1;
            entry.net_units -= 1;
          } else if (r.result === "VOID") {
            entry.void_picks += 1;
          }
          bySport.set(r.sport_key, entry);
        }
        return { results: [...bySport.values()] };
      }

      const slDate = args.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(String(args[0])) ? String(args[0]) : null;
      const filtered = tables.tipResults.filter((r) => !slDate || r.sl_date === slDate);
      const won = filtered.filter((r) => r.result === "WON");
      const lost = filtered.filter((r) => r.result === "LOST");
      const voidR = filtered.filter((r) => r.result === "VOID");
      const pending = filtered.filter((r) => r.result === "PENDING");
      const net = won.reduce((s, r) => s + (Number(r.odds || 1) - 1), 0) - lost.length;
      const decisive = [...won, ...lost];
      const avgOdds = decisive.length > 0
        ? decisive.reduce((s, r) => s + Number(r.odds || 0), 0) / decisive.length
        : 0;
      return {
        picks: won.length + lost.length + voidR.length,
        won_picks: won.length,
        lost_picks: lost.length,
        void_picks: voidR.length,
        pending_picks: pending.length,
        net_units: net,
        avg_odds: avgOdds,
      };
    }

    if (q.includes("SELECT result FROM tip_results")) {
      const rows = tables.tipResults
        .filter((r) => ["WON", "LOST", "VOID"].includes(r.result))
        .map((r) => ({ result: r.result }));
      return { results: rows };
    }

    // Default fallback for unrelated tables in SSR/API queries
    return mode === "first" ? { c: 0 } : mode === "all" ? { results: [] } : { success: true, meta: { changes: 0 } };
  };

  const db = {
    prepare(sql: string) {
      let bound: unknown[] = [];
      const stmt: any = {
        bind(...args: unknown[]) {
          bound = args;
          return stmt;
        },
        async first() {
          return execSql(sql, bound, "first");
        },
        async all() {
          return execSql(sql, bound, "all");
        },
        async run() {
          return execSql(sql, bound, "run");
        },
        _exec(mode: "first" | "all" | "run") {
          return execSql(sql, bound, mode);
        },
      };
      return stmt;
    },
    async batch(statements: any[]) {
      return statements.map((s) => s._exec("run"));
    },
    async exec() {
      return { count: 0, duration: 0 };
    },
  };

  return { db, tables };
}

function makeEnv(db: any, overrides?: Partial<Env>): Env {
  return {
    DB: db,
    BOT_TOKEN: "123456:mock_bot_token",
    ADMIN_IDS: "111222333",
    ADMIN_CHANNEL_ID: "-100999888",
    WEBHOOK_SECRET: "mock_webhook_secret_123456",
    ADMIN_API_SECRET: "super_secret_admin_token_12345",
    CHANNEL_USERNAME: "@fast_xbet_official_tips",
    CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
    TIPS_CHANNEL_ID: "-100111222",
    TIPS_CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
    ODDS_API_KEY: "odds_key_1",
    ODDS_API_KEY_2: "odds_key_2",
    TIPS_SPORTS: "auto:soccer,auto:cricket",
    TIPS_ODDS_REGIONS: "eu",
    TIPS_MIN_ODDS: "1.30",
    TIPS_MAX_ODDS: "3.00",
    TIPS_HOURS_AHEAD: "72",
    TIPS_PER_SLOT: "3",
    PUBLIC_BASE_URL: "https://xbet-telegram-bot.lakmal-gamage.workers.dev",
    XBET_LINK: "https://1xbet.example.com",
    XBET_PROMO_CODE: "FASTX",
    MIN_TRANSACTION_LKR: "1000",
    MAX_TRANSACTION_LKR: "500000",
    DEPOSIT_INSTRUCTIONS: "Deposit instructions",
    ...overrides,
  };
}

describe("Odds API 1,000-credit budget governance", () => {
  it("defines balanced buckets summing exactly to 1,000 credits", () => {
    const sum = BUCKET_CAPS.tips + BUCKET_CAPS.scores + BUCKET_CAPS.odds_refresh + BUCKET_CAPS.on_demand + BUCKET_CAPS.other;
    expect(sum).toBe(MONTHLY_TOTAL_BUDGET);
    expect(MONTHLY_SAFETY_RESERVE).toBe(81);
    expect(classifyProtectionTier(799)).toBe("NORMAL");
    expect(classifyProtectionTier(800)).toBe("WARN_800");
    expect(classifyProtectionTier(900)).toBe("RESTRICT_900");
    expect(classifyProtectionTier(950)).toBe("CRITICAL_950");
    expect(classifyProtectionTier(1000)).toBe("HARD_STOP_1000");
  });

  it("aggregates two separate 500-credit keys while detecting single shared 1,000-credit pools", async () => {
    const month = currentUtcMonth();
    const { db, tables } = createInMemoryD1();
    const env = makeEnv(db);

    // Two independent 500-credit keys: used + remaining <= 550
    await recordOddsApiCall(env, {
      keySlot: 1,
      bucket: "tips",
      endpoint: "/v4/sports/soccer_epl/odds",
      estimatedCost: 1,
      actualCostHeader: 1,
      usedHeader: 120,
      remainingHeader: 380,
      status: 200,
    });
    await recordOddsApiCall(env, {
      keySlot: 2,
      bucket: "scores",
      endpoint: "/v4/sports/soccer_epl/scores",
      estimatedCost: 1,
      actualCostHeader: 1,
      usedHeader: 45,
      remainingHeader: 455,
      status: 200,
    });

    const dualSummary = await getMonthlyCreditSummary(env, month);
    expect(dualSummary.keys).toHaveLength(2);
    expect(dualSummary.totalUsed).toBe(165); // 120 + 45 summed cleanly
    expect(dualSummary.remaining).toBe(835);

    // Simulate single shared 1,000-credit pool (used + remaining > 550)
    tables.keysMonthly.clear();
    await recordOddsApiCall(env, {
      keySlot: 1,
      bucket: "tips",
      endpoint: "/v4/sports/soccer_epl/odds",
      estimatedCost: 1,
      actualCostHeader: 1,
      usedHeader: 210,
      remainingHeader: 790,
      status: 200,
    });
    const sharedSummary = await getMonthlyCreditSummary(env, month);
    expect(sharedSummary.totalUsed).toBe(210);
  });

  it("enforces protection tiers at 800, 900, 950, and 1,000 with one-time Admin Telegram warnings", async () => {
    const month = currentUtcMonth();
    const { db, tables } = createInMemoryD1();
    const env = makeEnv(db);
    const sentMessages: string[] = [];

    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.body) {
        const body = JSON.parse(String(init.body));
        if (body.text) sentMessages.push(String(body.text));
      }
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    try {
      // Cross 800 threshold -> dispatches one-time Admin warning
      await recordOddsApiCall(env, {
        keySlot: 2,
        bucket: "tips",
        endpoint: "/v4/sports/soccer_epl/odds",
        estimatedCost: 1,
        actualCostHeader: 1,
        usedHeader: 400,
        remainingHeader: 100,
        status: 200,
      });
      await recordOddsApiCall(env, {
        keySlot: 1,
        bucket: "tips",
        endpoint: "/v4/sports/soccer_epl/odds",
        estimatedCost: 1,
        actualCostHeader: 1,
        usedHeader: CREDIT_THRESHOLDS.WARN - 400,
        remainingHeader: 100,
        status: 200,
      });

      expect(sentMessages.some((m) => m.includes("800 CREDITS"))).toBe(true);
      const countAfterFirst800 = sentMessages.length;

      // Second call still at 810 should NOT resend 800 alert
      await recordOddsApiCall(env, {
        keySlot: 1,
        bucket: "tips",
        endpoint: "/v4/sports/soccer_epl/odds",
        estimatedCost: 1,
        actualCostHeader: 1,
        usedHeader: 410,
        remainingHeader: 90,
        status: 200,
      });
      expect(sentMessages.length).toBe(countAfterFirst800);

      // Zero-cost calls are ALWAYS allowed even at hard stop
      tables.guardState.set(month, {
        month_utc: month,
        total_budget: 1000,
        warned_800: 1,
        warned_900: 0,
        warned_950: 0,
        hard_stopped_1000: 0,
        daily_recap_date: null,
      });

      // Set total used to 910 (RESTRICT_900): blocks odds_refresh & non-settlement scores, allows tips & on_demand
      tables.keysMonthly.get(`${month}:1`)!.requests_used = 460;
      tables.keysMonthly.get(`${month}:1`)!.requests_remaining = 40;
      tables.keysMonthly.get(`${month}:2`)!.requests_used = 450;
      tables.keysMonthly.get(`${month}:2`)!.requests_remaining = 50;
      expect((await canMakeOddsRequest(env, "odds_refresh", 1)).allowed).toBe(false);
      expect((await canMakeOddsRequest(env, "scores", 1, { isSettlementRetry: false })).allowed).toBe(false);
      expect((await canMakeOddsRequest(env, "scores", 1, { isSettlementRetry: true })).allowed).toBe(true);
      expect((await canMakeOddsRequest(env, "tips", 1)).allowed).toBe(true);

      // Set total used to 955 (CRITICAL_950): blocks on_demand & odds_refresh, allows tips
      tables.keysMonthly.get(`${month}:1`)!.requests_used = 500;
      tables.keysMonthly.get(`${month}:1`)!.requests_remaining = 0;
      tables.keysMonthly.get(`${month}:2`)!.requests_used = 455;
      tables.keysMonthly.get(`${month}:2`)!.requests_remaining = 45;
      expect((await canMakeOddsRequest(env, "on_demand", 1)).allowed).toBe(false);
      expect((await canMakeOddsRequest(env, "odds_refresh", 1)).allowed).toBe(false);
      expect((await canMakeOddsRequest(env, "tips", 1)).allowed).toBe(true);

      // Set total used to 1,000 (HARD_STOP_1000): blocks ALL paid calls, permits 0-cost calls
      tables.keysMonthly.get(`${month}:2`)!.requests_used = 500;
      tables.keysMonthly.get(`${month}:2`)!.requests_remaining = 0;
      expect((await canMakeOddsRequest(env, "tips", 1)).allowed).toBe(false);
      expect((await canMakeOddsRequest(env, "scores", 1, { isSettlementRetry: true })).allowed).toBe(false);
      expect((await canMakeOddsRequest(env, "other", 0)).allowed).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Best Odds Finder & Value Odds Alerts", () => {
  const futureIso = new Date(Date.now() + 4 * 3600_000).toISOString();

  const sampleEvent: OddsEventLike = {
    id: "evt_epl_101",
    sport_key: "soccer_epl",
    sport_title: "English Premier League",
    commence_time: futureIso,
    home_team: "Arsenal",
    away_team: "Chelsea",
    bookmakers: [
      {
        key: "pinnacle",
        title: "Pinnacle",
        markets: [{
          key: "h2h",
          outcomes: [
            { name: "Arsenal", price: 1.72 },
            { name: "Draw", price: 3.70 },
            { name: "Chelsea", price: 5.10 },
          ],
        }],
      },
      {
        key: "bet365",
        title: "Bet365",
        markets: [{
          key: "h2h",
          outcomes: [
            { name: "Arsenal", price: 1.74 },
            { name: "Draw", price: 3.65 },
            { name: "Chelsea", price: 4.95 },
          ],
        }],
      },
      {
        key: "1xbet",
        title: "1xBet",
        markets: [{
          key: "h2h",
          outcomes: [
            { name: "Arsenal", price: 1.98 },
            { name: "Draw", price: 3.60 },
            { name: "Chelsea", price: 4.80 },
          ],
        }],
      },
    ],
  };

  it("extracts best prices and detects value edges without extra API calls", async () => {
    const { snapshot, bestValueOpportunity } = extractEventBestOdds(sampleEvent);
    expect(snapshot.bestHomeOdds).toBe(1.98);
    expect(snapshot.bestHomeBookmaker).toBe("1xBet");
    expect(bestValueOpportunity?.selection).toBe("Arsenal");
    expect((bestValueOpportunity?.valueScore ?? 0)).toBeGreaterThan(0.04);

    const { db, tables } = createInMemoryD1();
    const env = makeEnv(db);
    let telegramPosts = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        telegramPosts += 1;
        return new Response(JSON.stringify({ ok: true, result: { message_id: 500 + telegramPosts } }), { status: 200 });
      })
    );

    try {
      const first = await processOddsIntelligence(env, [sampleEvent]);
      expect(first.snapshotsSaved).toBe(1);
      expect(first.alertsSent).toBe(1);
      expect(telegramPosts).toBe(1);

      // Re-processing same odds immediately must NOT duplicate alert, AND records movement delta when odds rise
      const second = await processOddsIntelligence(env, [sampleEvent]);
      expect(second.alertsSent).toBe(0);
      expect(telegramPosts).toBe(1);

      const updatedEvent: OddsEventLike = {
        ...sampleEvent,
        bookmakers: sampleEvent.bookmakers.map((b) =>
          b.key === "1xbet"
            ? {
                ...b,
                markets: [{
                  key: "h2h",
                  outcomes: [
                    { name: "Arsenal", price: 2.05 },
                    { name: "Draw", price: 3.60 },
                    { name: "Chelsea", price: 4.80 },
                  ],
                }],
              }
            : b
        ),
      };
      await processOddsIntelligence(env, [updatedEvent]);
      const saved = tables.oddsSnapshots.get("evt_epl_101");
      expect(saved?.best_home_odds).toBe(2.05);
      expect(saved?.prev_best_home_odds).toBe(1.98);

      // At CRITICAL_950, Value Alerts are suppressed even for a brand new event
      const month = currentUtcMonth();
      tables.keysMonthly.set(`${month}:1`, {
        month_utc: month,
        key_slot: 1,
        account_limit: 500,
        requests_used: 480,
        requests_remaining: 20,
        last_request_cost: 1,
        total_calls: 100,
        failed_calls: 0,
        last_status: 200,
        last_endpoint: "/odds",
        last_error: null,
        updated_at: new Date().toISOString(),
      });
      tables.keysMonthly.set(`${month}:2`, {
        month_utc: month,
        key_slot: 2,
        account_limit: 500,
        requests_used: 480,
        requests_remaining: 20,
        last_request_cost: 1,
        total_calls: 100,
        failed_calls: 0,
        last_status: 200,
        last_endpoint: "/odds",
        last_error: null,
        updated_at: new Date().toISOString(),
      });

      const criticalThird = await processOddsIntelligence(env, [{ ...sampleEvent, id: "evt_epl_999" }]);
      expect(criticalThird.snapshotsSaved).toBe(1);
      expect(criticalThird.alertsSent).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Live Scores & 15m D1 Caching", () => {
  it("reuses alreadyFetchedSports at 0 extra credits and deduplicates Telegram channel score notifications", async () => {
    const kickoff = new Date(Date.now() - 45 * 60_000).toISOString();
    const { db, tables } = createInMemoryD1({
      tipPosts: [{
        id: 1,
        status: "POSTED",
        result: "PENDING",
        event_id: "evt_live_1",
        sport_key: "soccer_epl",
        home_team: "Arsenal",
        away_team: "Chelsea",
        commence_time: kickoff,
        tips_json: JSON.stringify([{ eventId: "evt_live_1", sportKey: "soccer_epl", homeTeam: "Arsenal", awayTeam: "Chelsea" }]),
      }],
    });
    tables.liveScores.set("evt_live_1", {
      event_id: "evt_live_1",
      sport_key: "soccer_epl",
      sport_title: "EPL",
      home_team: "Arsenal",
      away_team: "Chelsea",
      commence_time: kickoff,
      score_home: "1",
      score_away: "0",
      completed: 0,
      status_text: "LIVE",
      is_live: 1,
      fetched_at: new Date().toISOString(),
      last_notified_score: null,
    });

    const env = makeEnv(db);
    let tgCalls = 0;
    let oddsApiCalls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("api.telegram.org")) {
          tgCalls += 1;
          return new Response(JSON.stringify({ ok: true, result: { message_id: 77 } }), { status: 200 });
        }
        oddsApiCalls += 1;
        return new Response("[]", { status: 200 });
      })
    );

    try {
      // Pass alreadyFetchedSports containing soccer_epl -> 0 Odds API calls
      const first = await updateLiveScoresForActiveTips(env, new Set(["soccer_epl"]));
      expect(first.sportsFetched).toBe(0);
      expect(first.channelNotifications).toBe(1);
      expect(oddsApiCalls).toBe(0);
      expect(tgCalls).toBe(1);

      // Re-run with unchanged score -> 0 Telegram notifications
      const second = await updateLiveScoresForActiveTips(env, new Set(["soccer_epl"]));
      expect(second.channelNotifications).toBe(0);
      expect(tgCalls).toBe(1);

      // Fresh cached /scores on-demand serves from D1 without calling Odds API
      const onDemand = await getLiveScoresOnDemand(env);
      expect(onDemand.cacheUsed).toBe(true);
      expect(onDemand.refreshed).toBe(false);
      expect(oddsApiCalls).toBe(0);
      expect(onDemand.items).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Win Rate & ROI Performance Tracker", () => {
  it("computes ROI and net units from D1 and sends idempotent nightly Sri Lanka recap", async () => {
    const fixedNow = new Date("2026-11-14T18:07:00.000Z"); // 23:37 Asia/Colombo on 2026-11-14
    const { db, tables } = createInMemoryD1({
      tipPosts: [
        { id: 1, status: "POSTED", result: "WON", market: "h2h", sl_date: "2026-11-14" },
        { id: 2, status: "POSTED", result: "LOST", market: "h2h", sl_date: "2026-11-14" },
      ],
      tipResults: [
        { sport_key: "soccer_epl", sport_title: "EPL", result: "WON", odds: 2.1, sl_date: "2026-11-14" },
        { sport_key: "soccer_epl", sport_title: "EPL", result: "LOST", odds: 1.8, sl_date: "2026-11-14" },
        { sport_key: "cricket_ipl", sport_title: "IPL", result: "WON", odds: 1.9, sl_date: "2026-11-14" },
      ],
    });
    const env = makeEnv(db);

    const report = await getDetailedPerformanceReport(env, { todaySlDate: "2026-11-14" });
    expect(report.today.wonPicks).toBe(2);
    expect(report.today.lostPicks).toBe(1);
    // Net units: (2.1 - 1) + (-1) + (1.9 - 1) = +1.00u across 3 decisive picks -> +33.3% ROI
    expect(report.today.netUnits).toBe(1);
    expect(report.today.roiPct).toBe(33.3);
    expect(report.bySport).toHaveLength(2);

    let recapMessages = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        recapMessages += 1;
        return new Response(JSON.stringify({ ok: true, result: { message_id: 901 } }), { status: 200 });
      })
    );

    try {
      const firstRecap = await maybePostDailyPerformanceRecap(env, fixedNow);
      expect(firstRecap.posted).toBe(true);
      expect(firstRecap.date).toBe("2026-11-14");
      expect(recapMessages).toBe(1);
      expect(tables.guardState.get("2026-11")?.daily_recap_date).toBe("2026-11-14");

      // Repeating in same SL window must skip cleanly
      const secondRecap = await maybePostDailyPerformanceRecap(env, fixedNow);
      expect(secondRecap.posted).toBe(false);
      expect(secondRecap.reason).toBe("already_sent");
      expect(recapMessages).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Public & Admin API Integration", () => {
  it("exposes D1-only bestOdds, liveScores, and performance via getPublicTips and /api/tips/preview", async () => {
    const { db, tables } = createInMemoryD1();
    tables.oddsSnapshots.set("evt_pub_1", {
      event_id: "evt_pub_1",
      sport_key: "soccer_epl",
      sport_title: "Premier League",
      home_team: "Arsenal",
      away_team: "Liverpool",
      commence_time: new Date(Date.now() + 3 * 3600_000).toISOString(),
      best_home_odds: 2.15,
      best_home_bookmaker: "1xBet",
      best_draw_odds: 3.4,
      best_draw_bookmaker: "Pinnacle",
      best_away_odds: 3.2,
      best_away_bookmaker: "Bet365",
      prev_best_home_odds: 2.05,
      prev_best_away_odds: null,
      best_selection: "Arsenal",
      best_value_score: 0.055,
      best_consensus_prob: 0.49,
      bookmakers_json: "[]",
      fetched_at: new Date().toISOString(),
    });
    const env = makeEnv(db);

    const payload = await getPublicTips(env);
    expect(payload.ok).toBe(true);
    expect(payload.bestOdds).toHaveLength(1);
    expect(payload.bestOdds?.[0].bestHomeOdds).toBe(2.15);
    expect(payload.performance).toBeDefined();
  });

  it("gates /api/admin/odds-budget and /api/admin/odds-refresh and renders budget/ROI in /admin SSR", async () => {
    const month = currentUtcMonth();
    const { db, tables } = createInMemoryD1();
    const env = makeEnv(db);

    // Unauthenticated /api/admin/odds-budget -> 401
    const unauth = await handleApiRequest(new Request("http://localhost/api/admin/odds-budget"), env);
    expect(unauth?.status).toBe(401);

    // Authenticated /api/admin/odds-budget -> 200 with budget & performance payload
    const authed = await handleApiRequest(
      new Request("http://localhost/api/admin/odds-budget", {
        headers: { Authorization: `Bearer ${env.ADMIN_API_SECRET}` },
      }),
      env
    );
    expect(authed?.status).toBe(200);
    const budgetData = (await authed?.json()) as any;
    expect(budgetData.ok).toBe(true);
    expect(budgetData.budget.totalBudget).toBe(1000);
    expect(budgetData.performance).toBeDefined();

    // Exhaust budget to 950 -> /api/admin/odds-refresh returns 429
    tables.keysMonthly.set(`${month}:1`, {
      month_utc: month,
      key_slot: 1,
      account_limit: 500,
      requests_used: 480,
      requests_remaining: 20,
      last_request_cost: 1,
      total_calls: 100,
      failed_calls: 0,
      last_status: 200,
      last_endpoint: "/odds",
      last_error: null,
      updated_at: new Date().toISOString(),
    });
    tables.keysMonthly.set(`${month}:2`, {
      month_utc: month,
      key_slot: 2,
      account_limit: 500,
      requests_used: 475,
      requests_remaining: 25,
      last_request_cost: 1,
      total_calls: 100,
      failed_calls: 0,
      last_status: 200,
      last_endpoint: "/odds",
      last_error: null,
      updated_at: new Date().toISOString(),
    });

    const throttledRefresh = await handleApiRequest(
      new Request("http://localhost/api/admin/odds-refresh", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.ADMIN_API_SECRET}` },
      }),
      env
    );
    expect(throttledRefresh?.status).toBe(429);

    // Authenticated /admin SSR includes budget & ROI sections
    const adminRes = await handleApiRequest(
      new Request("http://localhost/admin", {
        headers: { Authorization: `Bearer ${env.ADMIN_API_SECRET}` },
      }),
      env
    );
    expect(adminRes?.status).toBe(200);
    const adminHtml = await adminRes?.text();
    expect(adminHtml).toContain("section-odds-budget");
    expect(adminHtml).toContain("section-tips-performance");
  });
});
