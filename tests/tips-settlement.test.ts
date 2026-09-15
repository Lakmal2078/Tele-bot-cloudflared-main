import { describe, expect, it } from "vitest";
import { normalizeTeamName, evaluatePickResult } from "../src/tipsSettlement";

describe("Tip Settlement Evaluation", () => {
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
});
