import { describe, expect, it } from "vitest";
import { chooseCandidate, slotForCron, sriLankaDate } from "../src/tips";

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
});
