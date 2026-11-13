import { describe, expect, it, vi } from "vitest";
import { evaluatePickResult, normalizeTeamName, settlePendingTips, updateTelegramMessageWithResults } from "../src/tipsSettlement";
import type { Env } from "../src/types";

describe("tip settlement", () => {
  it("keeps a completed event pending when scores are missing", () => {
    const result = evaluatePickResult("Arsenal", "Arsenal", "Chelsea", null, true);
    expect(result.result).toBe("PENDING");
    expect(result.scoreHome).toBeNull();
    expect(result.scoreAway).toBeNull();
  });

  it("keeps a completed event pending when scores are invalid", () => {
    const result = evaluatePickResult(
      "Arsenal",
      "Arsenal",
      "Chelsea",
      [
        { name: "Arsenal", score: "N/A" },
        { name: "Chelsea", score: "1" },
      ],
      true,
    );
    expect(result.result).toBe("PENDING");
  });

  it("settles a valid home win", () => {
    const result = evaluatePickResult(
      "Arsenal",
      "Arsenal",
      "Chelsea",
      [
        { name: "Arsenal", score: "2" },
        { name: "Chelsea", score: "1" },
      ],
      true,
    );
    expect(result.result).toBe("WON");
    expect(result.scoreHome).toBe("2");
    expect(result.scoreAway).toBe("1");
  });

  it("settles a valid away win as lost for the home selection", () => {
    const result = evaluatePickResult(
      "Arsenal",
      "Arsenal",
      "Chelsea",
      [
        { name: "Arsenal", score: "0" },
        { name: "Chelsea", score: "2" },
      ],
      true,
    );
    expect(result.result).toBe("LOST");
  });

  it("settles a valid draw pick", () => {
    const result = evaluatePickResult(
      "Draw",
      "Arsenal",
      "Chelsea",
      [
        { name: "Arsenal", score: "1" },
        { name: "Chelsea", score: "1" },
      ],
      true,
    );
    expect(result.result).toBe("WON");
  });

  it("does not use positional score fallback when provider team names do not match", () => {
    const result = evaluatePickResult(
      "Arsenal",
      "Arsenal",
      "Chelsea",
      [
        { name: "Unknown Home", score: "3" },
        { name: "Unknown Away", score: "0" },
      ],
      true,
    );
    expect(result.result).toBe("PENDING");
  });

  it("does not settle an incomplete event", () => {
    const result = evaluatePickResult(
      "Arsenal",
      "Arsenal",
      "Chelsea",
      [
        { name: "Arsenal", score: "2" },
        { name: "Chelsea", score: "1" },
      ],
      false,
    );
    expect(result.result).toBe("PENDING");
  });

  it("edits result messages using CHANNEL_USERNAME when TIPS_CHANNEL_ID is unset", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const updated = await updateTelegramMessageWithResults(
        { BOT_TOKEN: "test-token", TIPS_CHANNEL_ID: "", CHANNEL_USERNAME: "@fast_xbet_official_tips" } as Env,
        901,
        [{
          tip_post_id: 41, event_id: "event-41", sport_key: "soccer_epl",
          home_team: "Arsenal", away_team: "Chelsea", selection: "Arsenal",
          market: "h2h", odds: 1.8, result: "WON", completed: 1,
          score_home: "2", score_away: "0",
        }],
        "WON",
      );

      expect(updated).toBe(true);
      expect(fetchMock).toHaveBeenCalledOnce();
      const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
      expect(request.chat_id).toBe("@fast_xbet_official_tips");
      expect(request.message_id).toBe(901);
      expect(request.text).toContain("WON");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("settles posted tips whose ISO commence_time has passed", async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            statements.push({ sql, values });
            return {
              all: async () => ({
                results: sql.includes("SELECT id, scheduled_key") ? [{
                  id: 41, scheduled_key: "2026-11-05:08:00", slot_time: "08:00",
                  event_id: "event-41", sport_key: "soccer_epl", sport_title: "Premier League",
                  home_team: "Arsenal", away_team: "Chelsea",
                  commence_time: "2026-11-05T15:00:00.000Z", market: "h2h",
                  selection: "Arsenal", odds: 1.8, message_id: 901,
                  tips_json: JSON.stringify([{
                    eventId: "event-41", sportKey: "soccer_epl", sportTitle: "Premier League",
                    homeTeam: "Arsenal", awayTeam: "Chelsea",
                    commenceTime: "2026-11-05T15:00:00.000Z", selection: "Arsenal", market: "h2h", odds: 1.8,
                  }]), result: "PENDING", settled_at: null,
                }] : [],
              }),
              first: async () => null,
              run: async () => ({ success: true, meta: { changes: 1 } }),
            };
          },
        };
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: "event-41", sport_key: "soccer_epl", sport_title: "Premier League",
      commence_time: "2026-11-05T15:00:00.000Z", completed: true,
      home_team: "Arsenal", away_team: "Chelsea",
      scores: [{ name: "Arsenal", score: "2" }, { name: "Chelsea", score: "0" }],
    }]), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const summary = await settlePendingTips({ DB: db as any, ODDS_API_KEY: "test-key" } as Env, { sendTelegramUpdate: false });
      expect(statements[0]?.sql).toContain("datetime(commence_time) <= datetime('now')");
      expect(summary.checkedPosts).toBe(1);
      expect(summary.settledPosts).toBe(1);
      expect(summary.wonPicks).toBe(1);
      expect(statements.some(({ sql, values }) => sql.includes("INSERT INTO tip_results") && values.includes("WON"))).toBe(true);
      expect(statements.some(({ sql, values }) => sql.includes("UPDATE tip_posts") && values[0] === "WON")).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("normalizes team names consistently", () => {
    expect(normalizeTeamName("Arsenal FC")).toBe("arsenal");
    expect(normalizeTeamName("Arsenal United")).toBe("arsenal");
  });

  it("normalizes team names by removing prefixes and non-alphanumeric chars", () => {
    expect(normalizeTeamName("Arsenal FC")).toBe("arsenal");
    expect(normalizeTeamName("Manchester United")).toBe("manchester");
    expect(normalizeTeamName("Paris Saint-Germain")).toBe("parissaintgermain");
    expect(normalizeTeamName("Real Madrid C.F.")).toBe("realmadrid");
  });

  it("evaluates Home win accurately", () => {
    const scores = [
      { name: "Arsenal", score: "2" },
      { name: "Chelsea", score: "1" },
    ];
    const resHome = evaluatePickResult("Arsenal", "Arsenal", "Chelsea", scores, true);
    expect(resHome.result).toBe("WON");
    expect(resHome.scoreHome).toBe("2");
    expect(resHome.scoreAway).toBe("1");

    const resAway = evaluatePickResult("Chelsea", "Arsenal", "Chelsea", scores, true);
    expect(resAway.result).toBe("LOST");

    const resDraw = evaluatePickResult("Draw", "Arsenal", "Chelsea", scores, true);
    expect(resDraw.result).toBe("LOST");
  });

  it("evaluates Away win accurately", () => {
    const scores = [
      { name: "Arsenal", score: "0" },
      { name: "Chelsea", score: "3" },
    ];
    const resHome = evaluatePickResult("Arsenal", "Arsenal", "Chelsea", scores, true);
    expect(resHome.result).toBe("LOST");

    const resAway = evaluatePickResult("Chelsea", "Arsenal", "Chelsea", scores, true);
    expect(resAway.result).toBe("WON");
    expect(resAway.scoreAway).toBe("3");
  });

  it("evaluates Draw outcome accurately", () => {
    const scores = [
      { name: "Arsenal", score: "1" },
      { name: "Chelsea", score: "1" },
    ];
    const resDraw = evaluatePickResult("Draw", "Arsenal", "Chelsea", scores, true);
    expect(resDraw.result).toBe("WON");

    const resHome = evaluatePickResult("Arsenal", "Arsenal", "Chelsea", scores, true);
    expect(resHome.result).toBe("LOST");
  });

  it("returns PENDING if match is not completed or scores missing", () => {
    const resNotDone = evaluatePickResult("Arsenal", "Arsenal", "Chelsea", null, false);
    expect(resNotDone.result).toBe("PENDING");
  });

  it("settles cricket matches with runs and wickets format", () => {
    const scores = [
      { name: "Sri Lanka", score: "185/6" },
      { name: "India", score: "182/9" },
    ];
    const resSL = evaluatePickResult("Sri Lanka", "Sri Lanka", "India", scores, true);
    expect(resSL.result).toBe("WON");
    expect(resSL.scoreHome).toBe("185/6");
    expect(resSL.scoreAway).toBe("182/9");

    const resInd = evaluatePickResult("India", "Sri Lanka", "India", scores, true);
    expect(resInd.result).toBe("LOST");
  });

  it("settles totals (Over/Under) market picks accurately", () => {
    const scores = [
      { name: "Real Madrid", score: "2" },
      { name: "Barcelona", score: "1" },
    ];
    // Total is 3
    const resOver = evaluatePickResult("Over 2.5", "Real Madrid", "Barcelona", scores, true);
    expect(resOver.result).toBe("WON");

    const resUnder = evaluatePickResult("Under 2.5", "Real Madrid", "Barcelona", scores, true);
    expect(resUnder.result).toBe("LOST");

    const resPush = evaluatePickResult("Over 3.0", "Real Madrid", "Barcelona", scores, true);
    expect(resPush.result).toBe("VOID");
  });
});
