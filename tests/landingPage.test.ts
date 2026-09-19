import { describe, expect, it } from "vitest";
import { renderLandingPage } from "../src/landingPage";
import { handleApiRequest } from "../src/apiRoutes";
import type { Env } from "../src/types";

const mockEnv: Env = {
  DB: {} as any,
  BOT_TOKEN: "mock_token",
  PUBLIC_BASE_URL: "https://fast-xbet.lk",
  ADMIN_IDS: "123456789",
  ADMIN_CHANNEL_ID: "-100123456789",
  CHANNEL_USERNAME: "@fast_xbet_official_tips",
  CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
  TIPS_CHANNEL_ID: "-100987654321",
  TIPS_CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
  WEBHOOK_SECRET: "mock_webhook_secret",
  ADMIN_API_SECRET: "mock_admin_secret",
  ODDS_API_KEY: "mock_key",
  XBET_LINK: "https://refpa.top/L?tag=d_mock&p=/registration/",
  XBET_PROMO_CODE: "VGSL",
  MIN_TRANSACTION_LKR: "1000",
  MAX_TRANSACTION_LKR: "500000",
  DEPOSIT_INSTRUCTIONS: "Instructions",
};

describe("Landing Page Render & SEO", () => {
  it("renders landing page with correct default language and CSP nonce", () => {
    const req = new Request("https://fast-xbet.lk/");
    const nonce = "testnonce123456";
    const html = renderLandingPage(mockEnv, req, nonce);

    expect(html).toContain('<html lang="si">');
    expect(html).toContain(`nonce="${nonce}"`);
    expect(html).toContain('<link rel="icon" type="image/png" href="/favicon.png">');
    expect(html).toContain('<link rel="apple-touch-icon" href="/favicon.png">');
    expect(html).toContain("Fast xBet Cash 🇱🇰");
  });

  it("uses PUBLIC_BASE_URL and ignores attacker-controlled host headers", () => {
    const req = new Request("https://attacker.example/?lang=en", { headers: { Host: "attacker.example", "X-Forwarded-Host": "attacker.example" } });
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain('<link rel="canonical" href="https://fast-xbet.lk/">');
    expect(html).toContain('property="og:url" content="https://fast-xbet.lk/"');
    expect(html).not.toContain("attacker.example");
  });

  it("fails closed for production without PUBLIC_BASE_URL", async () => {
    const workerModule = await import("../src/worker");
    const res = await workerModule.default.fetch(new Request("https://attacker.example/"), { ...mockEnv, BOT_MODE: "production", PUBLIC_BASE_URL: undefined } as Env);
    expect(res.status).toBe(503);
  });

  it("detects language from ?lang=en query parameter", () => {
    const req = new Request("https://fast-xbet.lk/?lang=en");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Open Telegram Bot");
  });

  it("detects language from ?lang=ta query parameter", () => {
    const req = new Request("https://fast-xbet.lk/?lang=ta");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain('<html lang="ta">');
  });

  it("falls back to Accept-Language when no query param", () => {
    const req = new Request("https://fast-xbet.lk/", { headers: { "Accept-Language": "en-US,en;q=0.9" } });
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain('<html lang="en">');
  });

  it("includes Open Graph and Twitter meta tags", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain("summary_large_image");
  });

  it("includes JSON-LD structured data", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("Organization");
    expect(html).toContain("FAQPage");
  });

  it("includes hreflang alternates", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain('hreflang="si"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('hreflang="ta"');
    expect(html).toContain('hreflang="x-default"');
  });

  it("includes 18+ and responsible gaming messaging", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain("18+");
    expect(html).toContain("Responsible");
  });

  it("renders payment methods section", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain("eZ Cash");
    expect(html).toContain("mCash");
    expect(html).toContain("FriMi");
    expect(html).toContain("iPay");
  });

  it("renders FAQ section from i18n strings", () => {
    const req = new Request("https://fast-xbet.lk/?lang=en");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain("How do I deposit?");
    expect(html).toContain("<details>");
  });

  it("links Telegram bot and tips channel", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);
    expect(html).toContain("t.me/");
    expect(html).toContain("start=landing");
  });

  it("includes CSP-friendly nonce attributes on scripts and styles", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req, "abcnonce");
    expect(html).toContain('nonce="abcnonce"');
  });

  it("renders all 6 landing page enhancements (promo copy, payment UX, chat simulation, fonts, calculator, tips tabs)", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req, "testnonce123");

    // 1. Live tips feed with filter tabs and live badge
    expect(html).toContain('id="tipsLiveBadge"');
    expect(html).toContain('class="tipTabs"');
    expect(html).toContain('data-sport="football"');
    expect(html).toContain('data-sport="cricket"');
    expect(html).toContain("/api/tips/preview");

    // 2. Promo Code one-click copy component
    expect(html).toContain('id="promoCopyBtn"');
    expect(html).toContain('id="promoCodeVal"');
    expect(html).toContain("VGSL");

    // 3. Local payment rails with badges (soft metrics — no hard SLA claims)
    expect(html).toContain("payBadge");
    expect(html).toContain("⚡ After verify");
    expect(html).toContain("No service fee");
    expect(html).toContain("eZ Cash");
    expect(html).toContain("mCash");
    expect(html).toContain("FriMi");
    expect(html).toContain("iPay");

    // 4. Interactive Telegram bot chat preview simulation
    expect(html).toContain('id="chatContainer"');
    expect(html).toContain('data-scenario="deposit"');
    expect(html).toContain('data-scenario="tips"');
    expect(html).toContain('data-scenario="withdraw"');
    expect(html).toContain('data-scenario="support"');

    // 5. Typography and font preloading for Sinhala, Tamil, and English
    expect(html).toContain("fonts.googleapis.com");
    expect(html).toContain("Noto+Sans+Sinhala");
    expect(html).toContain("Noto+Sans+Tamil");
    expect(html).toContain("Plus+Jakarta+Sans");
    expect(html).toContain("fast_xbet_lang");

    // 6. Deposit & Bonus Calculator (LKR Quick Calculator)
    expect(html).toContain('id="deposit-calculator"');
    expect(html).toContain('id="calcRange"');
    expect(html).toContain('id="calcAmountDisplay"');
    expect(html).toContain('id="summaryBonus"');
    expect(html).toContain('id="summaryTotal"');
    expect(html).toContain('id="calcCtaBtn"');
  });

  it("serves favicon via handleApiRequest fallback and static ASSETS binding", async () => {
    // 1. Direct fallback test without env.ASSETS
    const req = new Request("https://fast-xbet.lk/favicon.png");
    const res = await handleApiRequest(req, mockEnv);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    expect(res?.headers.get("Content-Type")).toBe("image/png");
    expect(Number(res?.headers.get("Content-Length"))).toBeGreaterThan(100000);

    // 2. HEAD request
    const headReq = new Request("https://fast-xbet.lk/favicon.png", { method: "HEAD" });
    const headRes = await handleApiRequest(headReq, mockEnv);
    expect(headRes?.status).toBe(200);

    // 3. Delegation to env.ASSETS when binding is present
    const mockAssetResponse = new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "image/png", "X-Custom-Asset": "true" },
    });
    const envWithAssets: Env = {
      ...mockEnv,
      ASSETS: {
        fetch: async () => mockAssetResponse,
      },
    };
    const assetReq = new Request("https://fast-xbet.lk/favicon.png");
    const assetRes = await handleApiRequest(assetReq, envWithAssets);
    expect(assetRes?.status).toBe(200);
    expect(assetRes?.headers.get("X-Custom-Asset")).toBe("true");
  });

  it("serves landing page through worker fetch even when secrets are unconfigured", async () => {
    const workerModule = await import("../src/worker");
    const res = await workerModule.default.fetch(
      new Request("https://fast-xbet.lk/"),
      { ...mockEnv, BOT_TOKEN: "", WEBHOOK_SECRET: "" } as Env,
    );
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Fast xBet Cash");
  });
});
