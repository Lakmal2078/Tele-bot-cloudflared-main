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
});
