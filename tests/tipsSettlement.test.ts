import { describe, expect, it } from "vitest";
import { evaluatePickResult, normalizeTeamName } from "../src/tipsSettlement";

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
