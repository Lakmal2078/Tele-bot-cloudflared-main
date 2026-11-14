import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOddsApiJson, resetOddsKeyPool, resolveOddsApiKeys } from "../src/oddsKeys";
import { runScheduledTip, TIPS_CRONS } from "../src/tips";
import { settlePendingTips } from "../src/tipsSettlement";
import worker, { WORKER_CRONS } from "../src/worker";
import type { Env } from "../src/types";

describe("Odds API multi-key pool and credit-budget safeguards", () => {
  beforeEach(() => {
    resetOddsKeyPool();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses and deduplicates keys from ODDS_API_KEY, ODDS_API_KEY_2, and ODDS_API_KEYS", () => {
    const keys = resolveOddsApiKeys({
      ODDS_API_KEY: "key_one, key_two",
      ODDS_API_KEY_2: "key_two",
      ODDS_API_KEYS: "key_three\nkey_one",
    });
    expect(keys).toEqual(["key_one", "key_two", "key_three"]);
  });

  it("fails over automatically to ODDS_API_KEY_2 when primary key is out of quota (401)", async () => {
    const calledKeys: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const key = url.searchParams.get("apiKey") || "";
      calledKeys.push(key);
      if (key === "key-1") {
        return new Response(JSON.stringify({ message: "OUT_OF_USAGE_CREDITS" }), {
          status: 401,
          headers: { "Content-Type": "application/json", "x-requests-remaining": "0" },
        });
      }
      return new Response(JSON.stringify([{ ok: true }]), {
        status: 200,
        headers: { "Content-Type": "application/json", "x-requests-remaining": "499", "x-requests-used": "1" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const env = { ODDS_API_KEY: "key-1", ODDS_API_KEY_2: "key-2" };

    const first = await fetchOddsApiJson<Array<{ ok: boolean }>>(
      env,
      (k) => new URL(`https://api.the-odds-api.com/v4/sports?apiKey=${k}`),
      { retryDelayFn: () => 0 }
    );
    expect(first.data).toEqual([{ ok: true }]);
    expect(first.keyIndex).toBe(1);
    expect(calledKeys).toEqual(["key-1", "key-2"]);

    // Subsequent call in the same isolate skips the exhausted key-1 directly.
    calledKeys.length = 0;
    const second = await fetchOddsApiJson<Array<{ ok: boolean }>>(
      env,
      (k) => new URL(`https://api.the-odds-api.com/v4/sports?apiKey=${k}`),
      { retryDelayFn: () => 0 }
    );
    expect(second.keyIndex).toBe(1);
    expect(calledKeys).toEqual(["key-2"]);
  });

  it("switches to Key #2 on the next call as soon as Key #1 hits 0 remaining credits", async () => {
    const calledKeys: string[] = [];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const key = new URL(String(input)).searchParams.get("apiKey") || "";
      calledKeys.push(key);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "x-requests-remaining": key === "key-1" ? "0" : "500",
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const env = { ODDS_API_KEY: "key-1", ODDS_API_KEY_2: "key-2" };
    await fetchOddsApiJson(env, (k) => new URL(`https://api.the-odds-api.com/v4/sports?apiKey=${k}`));
    await fetchOddsApiJson(env, (k) => new URL(`https://api.the-odds-api.com/v4/sports?apiKey=${k}`));

    expect(calledKeys).toEqual(["key-1", "key-2"]);
  });

  it("early-stops scheduled tip fetching after 2 feeds once diverse picks are found and filters out American football from auto:soccer", async () => {
    const future1 = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const future2 = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    const future3 = new Date(Date.now() + 7 * 3600 * 1000).toISOString();
    const oddsUrlsCalled: string[] = [];

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const urlStr = String(input);
      if (urlStr.includes("api.telegram.org")) {
        return new Response(JSON.stringify({ ok: true, result: { message_id: 555 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const url = new URL(urlStr);
      if (url.pathname === "/v4/sports") {
        return new Response(JSON.stringify([
          { key: "americanfootball_cfl", group: "American Football", title: "CFL", active: true },
          { key: "soccer_australia_aleague", group: "Soccer", title: "A-League", active: true },
          { key: "soccer_epl", group: "Soccer", title: "EPL", active: true },
          { key: "basketball_nba", group: "Basketball", title: "NBA", active: true },
          { key: "tennis_atp_finals", group: "Tennis", title: "ATP Finals", active: true },
        ]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      oddsUrlsCalled.push(url.pathname);
      if (url.pathname.includes("soccer_epl")) {
        return new Response(JSON.stringify([
          {
            id: "soc-1",
            sport_key: "soccer_epl",
            sport_title: "English Premier League",
            commence_time: future1,
            home_team: "Arsenal",
            away_team: "Everton",
            bookmakers: [
              { key: "b1", title: "B1", markets: [{ key: "h2h", outcomes: [{ name: "Arsenal", price: 1.55 }, { name: "Draw", price: 4.0 }, { name: "Everton", price: 6.0 }] }] },
              { key: "b2", title: "B2", markets: [{ key: "h2h", outcomes: [{ name: "Arsenal", price: 1.60 }, { name: "Draw", price: 3.9 }, { name: "Everton", price: 5.8 }] }] },
            ],
          },
          {
            id: "soc-2",
            sport_key: "soccer_epl",
            sport_title: "English Premier League",
            commence_time: future2,
            home_team: "Liverpool",
            away_team: "Fulham",
            bookmakers: [
              { key: "b1", title: "B1", markets: [{ key: "h2h", outcomes: [{ name: "Liverpool", price: 1.50 }, { name: "Draw", price: 4.2 }, { name: "Fulham", price: 6.2 }] }] },
              { key: "b2", title: "B2", markets: [{ key: "h2h", outcomes: [{ name: "Liverpool", price: 1.56 }, { name: "Draw", price: 4.1 }, { name: "Fulham", price: 6.0 }] }] },
            ],
          },
        ]), { status: 200, headers: { "Content-Type": "application/json", "x-requests-remaining": "490" } });
      }
      if (url.pathname.includes("basketball_nba")) {
        return new Response(JSON.stringify([
          {
            id: "nba-1",
            sport_key: "basketball_nba",
            sport_title: "NBA",
            commence_time: future3,
            home_team: "Celtics",
            away_team: "Heat",
            bookmakers: [
              { key: "b1", title: "B1", markets: [{ key: "h2h", outcomes: [{ name: "Celtics", price: 1.62 }, { name: "Heat", price: 2.35 }] }] },
              { key: "b2", title: "B2", markets: [{ key: "h2h", outcomes: [{ name: "Celtics", price: 1.68 }, { name: "Heat", price: 2.30 }] }] },
            ],
          },
        ]), { status: 200, headers: { "Content-Type": "application/json", "x-requests-remaining": "489" } });
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      prepare(sql: string) {
        return {
          bind() {
            return {
              first: async () => (sql.includes("FROM tip_posts") ? { id: 1, status: "PROCESSING", lease_token: "t", lease_expires_at: null, is_lease_active: 1 } : { api_failure_since: null, api_failure_count: 0, api_alerted: 0, empty_since: null, empty_count: 0, empty_alerted: 0 }),
              all: async () => ({ results: [] }),
              run: async () => ({ success: true, meta: { changes: 1 } }),
            };
          },
          all: async () => ({ results: [] }),
          first: async () => ({ api_failure_since: null, api_failure_count: 0, api_alerted: 0, empty_since: null, empty_count: 0, empty_alerted: 0 }),
          run: async () => ({ success: true, meta: { changes: 1 } }),
        };
      },
    };

    const env = {
      DB: db as any,
      BOT_TOKEN: "123:ABC",
      CHANNEL_USERNAME: "@test_tips",
      ODDS_API_KEY: "key-1",
      TIPS_SPORTS: "auto:soccer,auto:basketball,auto:tennis",
      TIPS_MAX_FEEDS: "3",
      TIPS_PER_SLOT: "3",
      TIPS_MIN_ODDS: "1.30",
      TIPS_MAX_ODDS: "3.00",
      TIPS_MIN_CONSENSUS: "0.45",
      TIPS_MIN_VALUE: "0.001",
      TIPS_MIN_BOOKMAKERS: "1",
    } as Env;

    const result = await runScheduledTip(env, TIPS_CRONS.SL_1200);
    expect(result.status).toBe("posted");
    // Only 2 paid /odds calls used (early-stopped before tennis_atp_finals), and americanfootball_cfl was NOT picked for auto:soccer!
    expect(oddsUrlsCalled).toEqual(["/v4/sports/soccer_epl/odds", "/v4/sports/basketball_nba/odds"]);
  });

  it("alerts admin and records error instead of silently reporting 0 matches when all Odds API keys fail", async () => {
    const telegramAlerts: string[] = [];
    const recordedPostUpdates: unknown[][] = [];

    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes("api.telegram.org")) {
        const body = JSON.parse(String(init?.body || "{}"));
        if (String(body.chat_id) === "999999") telegramAlerts.push(String(body.text));
        return new Response(JSON.stringify({ ok: true, result: { message_id: 777 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Usage quota has been reached" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      prepare(sql: string) {
        return {
          bind(...args: unknown[]) {
            if (sql.includes("UPDATE tip_posts") && sql.includes("SET status='POSTED'")) {
              recordedPostUpdates.push(args);
            }
            return {
              first: async () => (sql.includes("FROM tip_posts") ? { id: 10, status: "PROCESSING", lease_token: "t", lease_expires_at: null, is_lease_active: 1 } : { api_failure_since: null, api_failure_count: 0, api_alerted: 0, empty_since: null, empty_count: 0, empty_alerted: 0 }),
              all: async () => ({ results: [] }),
              run: async () => ({ success: true, meta: { changes: 1 } }),
            };
          },
          all: async () => ({ results: [] }),
          run: async () => ({ success: true, meta: { changes: 1 } }),
        };
      },
    };

    const env = {
      DB: db as any,
      BOT_TOKEN: "123:ABC",
      ADMIN_IDS: "999999",
      CHANNEL_USERNAME: "@test_tips",
      ODDS_API_KEY: "dead-1",
      ODDS_API_KEY_2: "dead-2",
      TIPS_SPORTS: "soccer_epl",
      TIPS_MAX_FEEDS: "3",
    } as Env;

    const result = await runScheduledTip(env, TIPS_CRONS.SL_1200);
    expect(result.status).toBe("posted_fallback");
    expect(telegramAlerts.some((text) => text.includes("TIPS FEED ALERT") && text.includes("401"))).toBe(true);
    // Marks fallback post as market='fallback', result='VOID', and saves error reason
    expect(recordedPostUpdates[0]).toContain("fallback");
    expect(recordedPostUpdates[0]).toContain("VOID");
    expect(recordedPostUpdates[0]?.some((v) => typeof v === "string" && v.includes("401"))).toBe(true);
  });

  it("skips /scores calls during settlement when matches have not passed minMatchAgeMinutes or are >76h old", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const twentyMinsAgo = new Date(Date.now() - 20 * 60_000).toISOString();
    const eightyHoursAgo = new Date(Date.now() - 80 * 3600_000).toISOString();

    const posts = [
      {
        id: 1, event_id: "ev-live", sport_key: "soccer_epl", commence_time: twentyMinsAgo,
        home_team: "A", away_team: "B", selection: "A", market: "h2h", odds: 1.7,
        tips_json: JSON.stringify([{ eventId: "ev-live", sportKey: "soccer_epl", homeTeam: "A", awayTeam: "B", commenceTime: twentyMinsAgo, selection: "A", market: "h2h", odds: 1.7 }]),
        result: "PENDING",
      },
      {
        id: 2, event_id: "ev-expired", sport_key: "tennis_atp", commence_time: eightyHoursAgo,
        home_team: "C", away_team: "D", selection: "C", market: "h2h", odds: 1.6,
        tips_json: JSON.stringify([{ eventId: "ev-expired", sportKey: "tennis_atp", homeTeam: "C", awayTeam: "D", commenceTime: eightyHoursAgo, selection: "C", market: "h2h", odds: 1.6 }]),
        result: "PENDING",
      },
    ];

    const db = {
      prepare(sql: string) {
        return {
          bind() {
            return {
              all: async () => ({ results: sql.includes("SELECT id, scheduled_key") ? posts : [] }),
              first: async () => null,
              run: async () => ({ success: true, meta: { changes: 1 } }),
            };
          },
        };
      },
      batch: async (stmts: unknown[]) => stmts.map(() => ({ success: true, meta: { changes: 1 } })),
    };

    const summary = await settlePendingTips(
      { DB: db as any, ODDS_API_KEY: "test-key" } as Env,
      { sendTelegramUpdate: false, minMatchAgeMinutes: 95, maxMatchAgeHours: 76 }
    );

    expect(summary.checkedPosts).toBe(2);
    expect(summary.requeuedBackoff).toBe(2);
    // Zero /scores API credits consumed!
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("runs scheduled settlement only at minute :37 and skips 5-minute intervals to preserve credits", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const urlStr = String(input);
      if (urlStr.includes("/v4/sports") && !urlStr.includes("/scores")) {
        return new Response(JSON.stringify([{ key: "soccer_epl", active: true }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const dbQueries: string[] = [];
    const db = {
      prepare(sql: string) {
        dbQueries.push(sql);
        return {
          bind() {
            return {
              all: async () => ({ results: [] }),
              first: async () => ({ api_failure_since: null, api_failure_count: 0, api_alerted: 0, empty_since: null, empty_count: 0, empty_alerted: 0 }),
              run: async () => ({ success: true, meta: { changes: 1 } }),
            };
          },
          run: async () => ({ success: true, meta: { changes: 1 } }),
          first: async () => ({ api_failure_since: null, api_failure_count: 0, api_alerted: 0, empty_since: null, empty_count: 0, empty_alerted: 0 }),
        };
      },
      batch: async () => [],
    };

    const env = {
      DB: db as any,
      BOT_TOKEN: "123:ABC",
      ADMIN_IDS: "12345",
      WEBHOOK_SECRET: "super_secret_webhook_token_123",
      CHANNEL_USERNAME: "@test",
      MIN_TRANSACTION_LKR: "1000",
      MAX_TRANSACTION_LKR: "500000",
      EZCASH_NUMBER: "0771234567",
      ODDS_API_KEY: "test-key",
    } as Env;

    // Minute :05 — must NOT run settlement DB query or /scores
    await worker.scheduled(
      { cron: WORKER_CRONS.MAINTENANCE, scheduledTime: Date.UTC(2026, 10, 14, 10, 5, 0), type: "scheduled" },
      env
    );
    expect(dbQueries.some((q) => q.includes("FROM tip_posts"))).toBe(false);

    // Minute :37 — runs settlement check AND health check
    await worker.scheduled(
      { cron: WORKER_CRONS.MAINTENANCE, scheduledTime: Date.UTC(2026, 10, 14, 10, 37, 0), type: "scheduled" },
      env
    );
    expect(dbQueries.some((q) => q.includes("FROM tip_posts"))).toBe(true);
  });
});
