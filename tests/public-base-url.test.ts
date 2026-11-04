import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public worker origin configuration", () => {
  it("uses the deployed canonical Worker URL", () => {
    const config = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
    expect(config).toContain('PUBLIC_BASE_URL = "https://xbet-telegram-bot.lakmal-gamage.workers.dev"');
    expect(config).not.toContain("agent-1xfast-srilanka.workers.dev");
  });
});
