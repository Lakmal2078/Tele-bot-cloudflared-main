import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTodayPostedEventIds,
  sendAdminAlert,
  buildTipsInlineKeyboard,
  TIPS_CRONS,
  SLOT_CRONS,
  type TipCandidate,
} from "../src/tips";
import type { Env } from "../src/types";

describe("Tips Enhancements & Cross-Slot Deduplication", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("defines exact scheduled crons matching Sri Lanka publication hours and settlement", () => {
    expect(TIPS_CRONS.SL_0800).toBe("30 2 * * *");
    expect(TIPS_CRONS.SL_1200).toBe("30 6 * * *");
    expect(TIPS_CRONS.SL_1800).toBe("30 12 * * *");
    expect(TIPS_CRONS.SETTLEMENT).toBe("15 * * * *");

    expect(SLOT_CRONS.has("30 2 * * *")).toBe(true);
    expect(SLOT_CRONS.has("30 6 * * *")).toBe(true);
    expect(SLOT_CRONS.has("30 12 * * *")).toBe(true);
    expect(SLOT_CRONS.has("0 0 * * *")).toBe(false);
  });

  it("extracts today's posted event IDs from database for cross-slot deduplication", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [
            {
              event_id: "evt-morning-1",
              tips_json: JSON.stringify([
                { eventId: "evt-morning-1" },
                { eventId: "evt-morning-2" },
              ]),
            },
            {
              event_id: "evt-noon-1",
              tips_json: JSON.stringify([
                { eventId: "evt-noon-1" },
                { eventId: "evt-noon-2" },
              ]),
            },
          ],
        }),
      }),
    };

    const env = { DB: mockDb as any } as Env;
    const ids = await getTodayPostedEventIds(env);

    expect(ids.has("evt-morning-1")).toBe(true);
    expect(ids.has("evt-morning-2")).toBe(true);
    expect(ids.has("evt-noon-1")).toBe(true);
    expect(ids.has("evt-noon-2")).toBe(true);
    expect(ids.has("evt-unrelated")).toBe(false);
  });

  it("handles missing DB or DB errors gracefully without crashing", async () => {
    const envNoDb = {} as Env;
    const ids = await getTodayPostedEventIds(envNoDb);
    expect(ids.size).toBe(0);

    const brokenDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockRejectedValue(new Error("D1 query error")),
      }),
    };
    const envBrokenDb = { DB: brokenDb as any } as Env;
    const idsBroken = await getTodayPostedEventIds(envBrokenDb);
    expect(idsBroken.size).toBe(0);
  });

  it("builds affiliate tracking URLs when trackingBaseUrl and tipPostId are provided", () => {
    const candidate1: TipCandidate = {
      event: {
        id: "ev-101",
        sport_key: "soccer_epl",
        sport_title: "Premier League",
        commence_time: "2026-09-15T15:00:00.000Z",
        home_team: "Liverpool",
        away_team: "Everton",
        bookmakers: [],
      },
      selection: "Liverpool",
      market: "h2h",
      averageOdds: 1.65,
      impliedProbability: 0.6,
      bookmakerCount: 15,
      sportGroup: "soccer",
      emoji: "⚽",
    };

    const candidate2: TipCandidate = {
      event: {
        id: "ev-102",
        sport_key: "soccer_spain_la_liga",
        sport_title: "La Liga",
        commence_time: "2026-09-15T18:00:00.000Z",
        home_team: "Barcelona",
        away_team: "Sevilla",
        bookmakers: [],
      },
      selection: "Barcelona",
      market: "h2h",
      averageOdds: 1.5,
      impliedProbability: 0.65,
      bookmakerCount: 16,
      sportGroup: "soccer",
      emoji: "⚽",
    };

    const kb = buildTipsInlineKeyboard(
      [candidate1, candidate2],
      "https://reffpa.com/test",
      "https://t.me/test_tips",
      "https://bot.example.com",
      42
    );

    expect(kb.inline_keyboard.length).toBe(4); // 2 matches + 1 accumulator + 1 official channel
    expect(kb.inline_keyboard[0][0].url).toContain("https://bot.example.com/go/tip/42?event=ev-101&pick=Liverpool");
    expect(kb.inline_keyboard[1][0].url).toContain("https://bot.example.com/go/tip/42?event=ev-102&pick=Barcelona");
    expect(kb.inline_keyboard[2][0].url).toContain("https://bot.example.com/go/tip/42?type=accumulator");
    expect(kb.inline_keyboard[3][0].url).toBe("https://t.me/test_tips");
  });

  it("sends admin alert to configured ADMIN_CHANNEL_ID and ADMIN_IDS", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }))
    );

    const env: Env = {
      BOT_TOKEN: "123456:ABC-DEF",
      ADMIN_CHANNEL_ID: "-1001987654321",
      ADMIN_IDS: "12345, 67890",
    } as any;

    await sendAdminAlert(env, "🚨 Test Alert");

    expect(fetchSpy).toHaveBeenCalledTimes(3); // -1001987654321, 12345, 67890
    const calledBodies = fetchSpy.mock.calls.map((c) => JSON.parse(c[1]?.body as string));
    expect(calledBodies.some((b) => b.chat_id === "-1001987654321")).toBe(true);
    expect(calledBodies.some((b) => b.chat_id === "12345")).toBe(true);
    expect(calledBodies.some((b) => b.chat_id === "67890")).toBe(true);
  });
});
