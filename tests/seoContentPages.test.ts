import { describe, expect, it } from "vitest";
import worker from "../src/worker";
import {
  buildSeoGuideSitemapEntries,
  getSeoGuidePaths,
  renderSeoContentPage,
  resolveSeoGuidePath,
  SEO_GUIDE_SLUGS,
} from "../src/seoContentPages";
import type { Env, D1Database } from "../src/types";

const mockDb = {
  prepare: () => ({
    bind: () => ({
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({ success: true }),
    }),
  }),
  batch: async () => [],
} as unknown as D1Database;

const env: Env = {
  DB: mockDb,
  BOT_TOKEN: "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ_1234567",
  WEBHOOK_SECRET: "seo_test_webhook_secret_123456789",
  ADMIN_IDS: "123456789",
  ADMIN_API_SECRET: "seo_test_admin_secret_123456789",
  PUBLIC_BASE_URL: "https://example.test",
  BOT_MODE: "production",
  BOT_USERNAME: "fast_1xbetcash_bot",
  CHANNEL_USERNAME: "@fast_xbet_official_tips",
  CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
  MIN_TRANSACTION_LKR: "1000",
  MAX_TRANSACTION_LKR: "500000",
  XBET_LINK: "",
  XBET_PROMO_CODE: "",
  DEPOSIT_INSTRUCTIONS: "Use current official bot instructions.",
};

describe("localized SEO content pages", () => {
  it("resolves all three guides across Sinhala, English and Tamil paths", () => {
    for (const slug of SEO_GUIDE_SLUGS) {
      const paths = getSeoGuidePaths(slug);
      expect(resolveSeoGuidePath(paths.si)?.lang).toBe("si");
      expect(resolveSeoGuidePath(paths.en)?.lang).toBe("en");
      expect(resolveSeoGuidePath(paths.ta)?.lang).toBe("ta");
    }
  });

  it("renders unique, indexable HTML with canonical and reciprocal hreflang links", () => {
    for (const slug of SEO_GUIDE_SLUGS) {
      const paths = getSeoGuidePaths(slug);
      for (const lang of ["si", "en", "ta"] as const) {
        const html = renderSeoContentPage(env, new Request("https://example.test" + paths[lang]), "nonce-test");
        expect(html).not.toBeNull();
        expect(html).toContain('<html lang="' + lang + '">');
        expect(html).toContain('<meta name="robots" content="index,follow">');
        expect(html).toContain('<link rel="canonical" href="https://example.test' + paths[lang] + '">');
        expect(html).toContain('hreflang="si"');
        expect(html).toContain('hreflang="en"');
        expect(html).toContain('hreflang="ta"');
        expect(html).toContain('nonce="nonce-test"');
        expect(html).toContain('application/ld+json');
        expect(html).toContain("18+");
      }
    }
  });

  it("keeps guide content distinct and uses runtime transaction limits", () => {
    const deposit = renderSeoContentPage(env, new Request("https://example.test/en/deposit-guide")) || "";
    const withdrawal = renderSeoContentPage(env, new Request("https://example.test/en/withdrawal-guide")) || "";
    const tips = renderSeoContentPage(env, new Request("https://example.test/en/free-sports-tips")) || "";
    expect(deposit).toContain("LKR 1,000 – LKR 500,000");
    expect(deposit).toContain("receipt");
    expect(withdrawal).toContain("destination bank account");
    expect(withdrawal).toContain("Never disclose passwords");
    expect(tips.toLowerCase()).toContain("decimal odds");
    expect(tips).toContain("past results do not predict future outcomes");
    expect(deposit).not.toBe(withdrawal);
    expect(withdrawal).not.toBe(tips);
  });

  it("does not render unknown guide paths", () => {
    expect(renderSeoContentPage(env, new Request("https://example.test/not-a-guide"))).toBeNull();
    expect(resolveSeoGuidePath("/en/unknown-guide")).toBeNull();
  });

  it("adds all nine localized guide URLs and hreflang alternates to the sitemap", () => {
    const sitemap = buildSeoGuideSitemapEntries("https://example.test");
    for (const slug of SEO_GUIDE_SLUGS) {
      const paths = getSeoGuidePaths(slug);
      expect(sitemap).toContain("<loc>https://example.test" + paths.si + "</loc>");
      expect(sitemap).toContain("<loc>https://example.test" + paths.en + "</loc>");
      expect(sitemap).toContain("<loc>https://example.test" + paths.ta + "</loc>");
    }
    expect((sitemap.match(/<loc>/g) || []).length).toBe(9);
    expect(sitemap).toContain('hreflang="x-default"');
  });

  it("serves guides through the Worker and permanently normalizes trailing slashes", async () => {
    const response = await worker.fetch(new Request("https://example.test/en/deposit-guide"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(await response.text()).toContain('<html lang="en">');

    const head = await worker.fetch(new Request("https://example.test/ta/free-sports-tips", { method: "HEAD" }), env);
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");

    const redirect = await worker.fetch(new Request("https://example.test/withdrawal-guide/"), env);
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get("Location")).toBe("https://example.test/withdrawal-guide");
  });

  it("publishes all localized guide URLs in the Worker sitemap", async () => {
    const response = await worker.fetch(new Request("https://example.test/sitemap.xml"), env);
    expect(response.status).toBe(200);
    const sitemap = await response.text();
    for (const slug of SEO_GUIDE_SLUGS) {
      const paths = getSeoGuidePaths(slug);
      expect(sitemap).toContain("https://example.test" + paths.si);
      expect(sitemap).toContain("https://example.test" + paths.en);
      expect(sitemap).toContain("https://example.test" + paths.ta);
    }
    expect((sitemap.match(/<loc>/g) || []).length).toBe(13);
  });
});
