import { describe, expect, it } from "vitest";
import {
  buildFallbackInlineKeyboard,
  buildMatchBetLink,
  buildTipsInlineKeyboard,
  chooseCandidate,
  chooseCandidates,
  formatFallbackTip,
  formatMatchButtonLabel,
  formatTipMessage,
  isUsableTrackingHost,
  normalizeChannelUrl,
  slotForCron,
  sriLankaDate,
  type TipCandidate,
} from "../src/tips";

describe("scheduled tips", () => {
  it("maps production cron slots to Sri Lanka times", () => {
    expect(slotForCron("30 2 * * *")).toBe("08:00");
    expect(slotForCron("30 6 * * *")).toBe("12:00");
    expect(slotForCron("30 12 * * *")).toBe("18:00");
    expect(slotForCron("0 0 * * *")).toBeNull();
  });

  it("formats the scheduled date in Asia/Colombo", () => {
    expect(sriLankaDate(new Date("2026-09-11T18:30:00.000Z"))).toBe("2026-09-12");
  });

  it("chooses only candidates with at least two bookmaker prices in the configured range", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const candidate = chooseCandidate(
      [
        {
          id: "event-1",
          sport_key: "soccer_epl",
          sport_title: "English Premier League",
          commence_time: future,
          home_team: "Alpha FC",
          away_team: "Beta FC",
          bookmakers: [
            { key: "book-a", title: "Book A", markets: [{ key: "h2h", outcomes: [{ name: "Alpha FC", price: 1.8 }] }] },
            { key: "book-b", title: "Book B", markets: [{ key: "h2h", outcomes: [{ name: "Alpha FC", price: 1.9 }] }] },
          ],
        },
      ],
      1.4,
      2.5,
    );

    expect(candidate?.selection).toBe("Alpha FC");
    expect(candidate?.averageOdds).toBeCloseTo(1.85, 5);
    expect(candidate?.bookmakerCount).toBe(2);
  });

  it("selects at least 3 candidates when multiple events are provided", () => {
    const future1 = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const future2 = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    const future3 = new Date(Date.now() + 6 * 3600 * 1000).toISOString();

    const events = [
      {
        id: "ev-1",
        sport_key: "soccer_epl",
        sport_title: "Premier League",
        commence_time: future1,
        home_team: "Arsenal",
        away_team: "Chelsea",
        bookmakers: [
          { key: "b1", title: "B1", markets: [{ key: "h2h", outcomes: [{ name: "Arsenal", price: 1.75 }] }] },
          { key: "b2", title: "B2", markets: [{ key: "h2h", outcomes: [{ name: "Arsenal", price: 1.85 }] }] },
        ],
      },
      {
        id: "ev-2",
        sport_key: "soccer_spain_la_liga",
        sport_title: "La Liga",
        commence_time: future2,
        home_team: "Real Madrid",
        away_team: "Sevilla",
        bookmakers: [
          { key: "b1", title: "B1", markets: [{ key: "h2h", outcomes: [{ name: "Real Madrid", price: 1.60 }] }] },
          { key: "b2", title: "B2", markets: [{ key: "h2h", outcomes: [{ name: "Real Madrid", price: 1.65 }] }] },
        ],
      },
      {
        id: "ev-3",
        sport_key: "basketball_nba",
        sport_title: "NBA",
        commence_time: future3,
        home_team: "Lakers",
        away_team: "Warriors",
        bookmakers: [
          { key: "b1", title: "B1", markets: [{ key: "h2h", outcomes: [{ name: "Lakers", price: 1.90 }] }] },
          { key: "b2", title: "B2", markets: [{ key: "h2h", outcomes: [{ name: "Lakers", price: 1.95 }] }] },
        ],
      },
    ];

    const candidates = chooseCandidates(events, 1.4, 2.5, 3);
    expect(candidates).toHaveLength(3);
    expect(candidates.map((c) => c.selection)).toEqual(["Real Madrid", "Lakers", "Arsenal"]);
  });

  it("formats tips message with clear badges, visual separators between matches, and Markdown template", () => {
    const mockCandidates: TipCandidate[] = [
      {
        event: {
          id: "1",
          sport_key: "soccer_epl",
          sport_title: "English Premier League",
          commence_time: "2026-09-15T00:30:00.000Z",
          home_team: "Leeds United",
          away_team: "Newcastle United",
          bookmakers: [],
        },
        selection: "Leeds United",
        market: "h2h",
        averageOdds: 2.27,
        impliedProbability: 0.441,
        bookmakerCount: 23,
        sportGroup: "football",
        emoji: "⚽",
      },
      {
        event: {
          id: "2",
          sport_key: "soccer_spain_la_liga",
          sport_title: "La Liga",
          commence_time: "2026-09-15T01:30:00.000Z",
          home_team: "Real Madrid",
          away_team: "Real Sociedad",
          bookmakers: [],
        },
        selection: "Real Madrid",
        market: "h2h",
        averageOdds: 1.65,
        impliedProbability: 0.606,
        bookmakerCount: 20,
        sportGroup: "football",
        emoji: "⚽",
      },
      {
        event: {
          id: "3",
          sport_key: "basketball_nba",
          sport_title: "NBA",
          commence_time: "2026-09-15T05:00:00.000Z",
          home_team: "Boston Celtics",
          away_team: "Miami Heat",
          bookmakers: [],
        },
        selection: "Boston Celtics",
        market: "h2h",
        averageOdds: 1.8,
        impliedProbability: 0.556,
        bookmakerCount: 18,
        sportGroup: "basketball",
        emoji: "🏀",
      },
    ];

    const message = formatTipMessage(mockCandidates, "18:00", "https://t.me/example_channel");

    // Badges & sports
    expect(message).toContain("1️⃣ ⚽ *Premier League*");
    expect(message).toContain("2️⃣ ⚽ *La Liga*");
    expect(message).toContain("3️⃣ 🏀 *NBA*");

    // Markdown inline code for picks
    expect(message).toContain("`Leeds United`");
    expect(message).toContain("`Real Madrid`");
    expect(message).toContain("`Boston Celtics`");

    // Visual separators between matches
    const separatorCount = (message.match(/─────────────────────────/g) || []).length;
    expect(separatorCount).toBe(2); // exactly between match 1-2 and match 2-3

    // Header and footer borders
    expect(message).toContain("━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Accumulator and link
    expect(message).toContain("Multiplier Odds (Accumulator)");
    expect(message).toContain("[👉 අපගේ නිල Channel එකට එක්වන්න (Join Channel)](https://t.me/example_channel)");
    expect(message).toContain("18:00");
  });

  it("formats fallback tip message properly with Markdown template", () => {
    const fallback = formatFallbackTip("18:00", "https://t.me/example_channel");
    expect(fallback).toContain("*FREE TIPS UPDATE (ශ්‍රී ලංකා)*");
    expect(fallback).toContain("18:00");
    expect(fallback).toContain("[👉 අපගේ Channel එකට එක්වන්න](https://t.me/example_channel)");
  });

  it("builds direct match bet link with specific match and selection parameters", () => {
    const candidate: TipCandidate = {
      event: {
        id: "evt-456",
        sport_key: "soccer_epl",
        sport_title: "Premier League",
        commence_time: "2026-09-15T15:00:00.000Z",
        home_team: "Arsenal",
        away_team: "Chelsea",
        bookmakers: [],
      },
      selection: "Arsenal",
      market: "h2h",
      averageOdds: 1.95,
      impliedProbability: 0.51,
      bookmakerCount: 20,
      sportGroup: "soccer",
      emoji: "⚽",
    };

    // With custom XBET_LINK
    const customLink = "https://1xbet.example.com/sports";
    const generatedUrl = buildMatchBetLink(customLink, candidate);
    const parsed = new URL(generatedUrl);

    expect(parsed.searchParams.get("match")).toBe("Arsenal vs Chelsea");
    expect(parsed.searchParams.get("event_id")).toBe("evt-456");
    expect(parsed.searchParams.get("pick")).toBe("Arsenal");
    expect(parsed.searchParams.get("sport")).toBe("soccer_epl");

    // With default XBET_LINK (affiliate reffpa link)
    const defaultUrl = buildMatchBetLink(undefined, candidate);
    const parsedDefault = new URL(defaultUrl);
    expect(parsedDefault.origin).toBe("https://reffpa.com");
    expect(parsedDefault.searchParams.get("tag")).toBe("d_2481353m_1622c_");
    expect(parsedDefault.searchParams.get("sub1")).toBe("evt-456");
    expect(parsedDefault.searchParams.get("sub2")).toBe("Arsenal");
    expect(parsedDefault.searchParams.get("match")).toBe("Arsenal vs Chelsea");
  });

  it("formats match button label with badge, sport emoji, and matchup", () => {
    const candidate: TipCandidate = {
      event: {
        id: "evt-789",
        sport_key: "basketball_nba",
        sport_title: "NBA",
        commence_time: "2026-09-15T18:00:00.000Z",
        home_team: "Golden State Warriors",
        away_team: "Los Angeles Lakers",
        bookmakers: [],
      },
      selection: "Golden State Warriors",
      market: "h2h",
      averageOdds: 1.75,
      impliedProbability: 0.57,
      bookmakerCount: 15,
      sportGroup: "basketball",
      emoji: "🏀",
    };

    const label = formatMatchButtonLabel(candidate, 0);
    expect(label).toContain("1️⃣ 🏀 Bet:");
    expect(label).toContain("Golden State Warriors vs Los Angeles Lakers");
  });

  it("builds inline keyboard with a button for each specific match mentioned in tips", () => {
    const candidates: TipCandidate[] = [
      {
        event: {
          id: "m1",
          sport_key: "soccer_epl",
          sport_title: "Premier League",
          commence_time: "2026-09-15T12:00:00.000Z",
          home_team: "Liverpool",
          away_team: "Everton",
          bookmakers: [],
        },
        selection: "Liverpool",
        market: "h2h",
        averageOdds: 1.5,
        impliedProbability: 0.67,
        bookmakerCount: 12,
        sportGroup: "soccer",
        emoji: "⚽",
      },
      {
        event: {
          id: "m2",
          sport_key: "tennis_atp",
          sport_title: "ATP",
          commence_time: "2026-09-15T14:00:00.000Z",
          home_team: "Alcaraz C.",
          away_team: "Sinner J.",
          bookmakers: [],
        },
        selection: "Alcaraz C.",
        market: "h2h",
        averageOdds: 1.85,
        impliedProbability: 0.54,
        bookmakerCount: 14,
        sportGroup: "tennis",
        emoji: "🎾",
      },
    ];

    const keyboard = buildTipsInlineKeyboard(candidates, "https://1xbet.example.com", "https://t.me/test_channel");

    // Must have rows: 2 matches + 1 accumulator + 1 channel button
    expect(keyboard.inline_keyboard.length).toBe(4);

    // Row 1: First match button linking directly to XBET_LINK for Liverpool vs Everton
    const btn1 = keyboard.inline_keyboard[0][0];
    expect(btn1.text).toContain("1️⃣ ⚽ Bet: Liverpool vs Everton");
    expect(btn1.url).toContain("match=Liverpool+vs+Everton");
    expect(btn1.url).toContain("event_id=m1");
    expect(btn1.url).toContain("pick=Liverpool");

    // Row 2: Second match button linking directly to XBET_LINK for Alcaraz vs Sinner
    const btn2 = keyboard.inline_keyboard[1][0];
    expect(btn2.text).toContain("2️⃣ 🎾 Bet: Alcaraz C. vs Sinner J.");
    expect(btn2.url).toContain("match=Alcaraz+C.+vs+Sinner+J.");
    expect(btn2.url).toContain("event_id=m2");
    expect(btn2.url).toContain("pick=Alcaraz+C.");

    // Row 3: Accumulator button
    const btnAccum = keyboard.inline_keyboard[2][0];
    expect(btnAccum.text).toContain("Bet Accumulator");
    expect(btnAccum.url).toContain("bet_type=accumulator");

    // Row 4: Channel link button
    const btnChannel = keyboard.inline_keyboard[3][0];
    expect(btnChannel.text).toContain("Join Official Channel");
    expect(btnChannel.url).toBe("https://t.me/test_channel");
  });

  it("builds fallback inline keyboard with default link and channel", () => {
    const kb = buildFallbackInlineKeyboard("https://1xbet.example.com", "https://t.me/test_channel");
    expect(kb.inline_keyboard.length).toBe(2);
    expect(kb.inline_keyboard[0][0].text).toBe("🎲 Go to 1xBet");
    expect(kb.inline_keyboard[0][0].url).toBe("https://1xbet.example.com");
    expect(kb.inline_keyboard[1][0].text).toBe("📣 Join Official Channel");
    expect(kb.inline_keyboard[1][0].url).toBe("https://t.me/test_channel");
  });

  it("never returns candidates with event IDs that are in the excluded set", () => {
    const future = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const events = [
      {
        id: "already-posted-event-1",
        sport_key: "soccer_epl",
        sport_title: "Premier League",
        commence_time: future,
        home_team: "Team A",
        away_team: "Team B",
        bookmakers: [
          { key: "b1", title: "B1", markets: [{ key: "h2h", outcomes: [{ name: "Team A", price: 1.8 }] }] },
          { key: "b2", title: "B2", markets: [{ key: "h2h", outcomes: [{ name: "Team A", price: 1.85 }] }] },
        ],
      },
      {
        id: "fresh-event-2",
        sport_key: "basketball_nba",
        sport_title: "NBA",
        commence_time: future,
        home_team: "Team C",
        away_team: "Team D",
        bookmakers: [
          { key: "b1", title: "B1", markets: [{ key: "h2h", outcomes: [{ name: "Team C", price: 1.75 }] }] },
          { key: "b2", title: "B2", markets: [{ key: "h2h", outcomes: [{ name: "Team C", price: 1.8 }] }] },
        ],
      },
    ];

    const excludedIds = new Set(["already-posted-event-1"]);
    const chosen = chooseCandidates(events, 1.4, 2.5, 3, 2, excludedIds);

    expect(chosen.length).toBe(1);
    expect(chosen[0].event.id).toBe("fresh-event-2");
    expect(chosen.some((c) => c.event.id === "already-posted-event-1")).toBe(false);

    const singleChosen = chooseCandidate(events, 1.4, 2.5, excludedIds);
    expect(singleChosen?.event.id).toBe("fresh-event-2");
  });

  describe("link reliability and URL normalization", () => {
    it("identifies telegram channels as non-usable tracking hosts", () => {
      expect(isUsableTrackingHost("https://t.me/fast_xbet_official_tips")).toBe(false);
      expect(isUsableTrackingHost("https://t.me/fast_xbet_cash")).toBe(false);
      expect(isUsableTrackingHost("https://telegram.me/some_channel")).toBe(false);
      expect(isUsableTrackingHost(undefined)).toBe(false);
      expect(isUsableTrackingHost("not-a-url")).toBe(false);
      expect(isUsableTrackingHost("https://ais-my-app.cloudrun.app")).toBe(true);
    });

    it("normalizes diverse channel inputs to clickable https://t.me/... URLs", () => {
      expect(normalizeChannelUrl("https://t.me/fast_xbet_official_tips")).toBe("https://t.me/fast_xbet_official_tips");
      expect(normalizeChannelUrl("t.me/fast_xbet_official_tips")).toBe("https://t.me/fast_xbet_official_tips");
      expect(normalizeChannelUrl("@fast_xbet_official_tips")).toBe("https://t.me/fast_xbet_official_tips");
      expect(normalizeChannelUrl("fast_xbet_official_tips")).toBe("https://t.me/fast_xbet_official_tips");
      expect(normalizeChannelUrl("", "@from_username")).toBe("https://t.me/from_username");
      expect(normalizeChannelUrl(undefined, undefined)).toBeUndefined();
    });

    it("does not corrupt 1xBet links even if CHANNEL_URL is mistakenly passed as trackingBaseUrl", () => {
      const candidates: TipCandidate[] = [
        {
          event: {
            id: "match-123",
            sport_key: "cricket_cplt20",
            sport_title: "CPL T20",
            commence_time: "2026-09-18T05:30:00.000Z",
            home_team: "Guyana Amazon Warriors",
            away_team: "Antigua & Barbuda Falcons",
            bookmakers: [],
          },
          selection: "Guyana Amazon Warriors",
          market: "h2h",
          averageOdds: 1.66,
          impliedProbability: 0.60,
          bookmakerCount: 3,
          sportGroup: "cricket",
          emoji: "🏏",
        },
      ];

      // Even if CHANNEL_URL (https://t.me/...) and tipPostId (42) are supplied:
      const kb = buildTipsInlineKeyboard(
        candidates,
        "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622",
        "https://t.me/fast_xbet_official_tips",
        "https://t.me/fast_xbet_official_tips",
        42
      );

      const betBtn = kb.inline_keyboard[0][0];
      // Button MUST link directly to 1xBet affiliate URL, NOT a broken t.me/go/tip URL
      expect(betBtn.url).not.toContain("t.me");
      expect(betBtn.url).toContain("reffpa.com");
      expect(betBtn.url).toContain("match=Guyana+Amazon+Warriors+vs+Antigua+%26+Barbuda+Falcons");

      // Channel button must be a valid t.me link
      const channelBtn = kb.inline_keyboard[1][0];
      expect(channelBtn.url).toBe("https://t.me/fast_xbet_official_tips");
    });
  });
});
