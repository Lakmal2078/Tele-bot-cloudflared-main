import { describe, expect, it } from "vitest";
import { classifySpecialSport } from "../src/tipsProvider";

describe("tips provider discovery", () => {
  it("classifies cricket feeds", () => {
    expect(classifySpecialSport({ key: "cricket_international_t20", title: "International Twenty20", active: true })).toBe("cricket");
  });

  it("classifies table tennis feeds when a provider exposes them", () => {
    expect(classifySpecialSport({ key: "table_tennis_example", title: "Table Tennis", active: true })).toBe("table_tennis");
  });

  it("classifies common esports feeds without hard-coding a provider", () => {
    expect(classifySpecialSport({ key: "esports_cs2", title: "Counter-Strike 2", active: true })).toBe("esports");
    expect(classifySpecialSport({ key: "esports_valorant", title: "Valorant", active: true })).toBe("esports");
  });

  it("does not classify unrelated sports as special feeds", () => {
    expect(classifySpecialSport({ key: "basketball_nba", title: "NBA", active: true })).toBeNull();
  });
});
