import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Cloudflare Worker observability configuration", () => {
  it("enables persisted logs, sampled traces, and source-map uploads", () => {
    const config = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
    expect(config).toContain("upload_source_maps = true");
    expect(config).toContain("[observability]");
    expect(config).toContain("enabled = true");
    expect(config).toContain("[observability.logs]");
    expect(config).toContain("head_sampling_rate = 0.1");
    expect(config).toContain("[observability.traces]");
    expect(config).toContain("head_sampling_rate = 0.05");
  });
});
