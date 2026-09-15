import { describe, expect, it } from "vitest";
import { renderLandingPage } from "../src/landingPage";
import { handleApiRequest } from "../src/apiRoutes";
import type { Env } from "../src/types";

const mockEnv: Env = {
  DB: {} as any,
  BOT_TOKEN: "mock_token",
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
    expect(html).toContain("Fast xBet Cash 🇱🇰");
  });

  it("detects language from ?lang=en query parameter", () => {
    const req = new Request("https://fast-xbet.lk/?lang=en");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('<html lang="en">');
  });

  it("detects language from ?lang=ta query parameter", () => {
    const req = new Request("https://fast-xbet.lk/?lang=ta");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('<html lang="ta">');
  });

  it("includes OpenGraph and Twitter card meta tags", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('<meta property="og:image" content="https://fast-xbet.lk/og-image.png">');
    expect(html).toContain('<meta property="og:image:type" content="image/png">');
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain('<meta property="og:image:height" content="630">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).toContain('<meta name="twitter:image" content="https://fast-xbet.lk/og-image.png">');
  });

  it("serves PNG OG Image at /og-image.png via handleApiRequest", async () => {
    const req = new Request("https://fast-xbet.lk/og-image.png");
    const res = await handleApiRequest(req, mockEnv);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    expect(res?.headers.get("Content-Type")).toBe("image/png");
    const bytes = await res?.arrayBuffer();
    expect(bytes?.byteLength).toBeGreaterThan(1000);
  });

  it("includes canonical and hreflang tags for multi-language SEO", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('<link rel="canonical" href="https://fast-xbet.lk/">');
    expect(html).toContain('<link rel="alternate" hreflang="si" href="https://fast-xbet.lk/?lang=si">');
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://fast-xbet.lk/?lang=en">');
    expect(html).toContain('<link rel="alternate" hreflang="ta" href="https://fast-xbet.lk/?lang=ta">');
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://fast-xbet.lk/">');
  });

  it("includes JSON-LD schema with Organization, WebSite, and FAQPage", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"Question"');
  });

  it("renders 18+ Responsible Gaming notices and badges", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain("🔞 18+");
    expect(html).toContain("Responsible Gaming Notice");
    expect(html).toContain("responsible-gaming-box");
  });

  it("renders deep-linked Telegram bot CTAs", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain("start=landing");
    expect(html).toContain("start=landing_sticky");
    expect(html).toContain("mobile-sticky-cta");
  });

  it("renders Trust signals strip and supported payment rails", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain("⚡ 2–5 Min");
    expect(html).toContain("👥 10,000+");
    expect(html).toContain("🛡️ 99.9%");
    expect(html).toContain("0% Fee");
    expect(html).toContain("eZ Cash");
    expect(html).toContain("mCash");
    expect(html).toContain("FriMi");
  });

  it("renders Today's Free Tips preview section", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('id="tips-preview"');
    expect(html).toContain("Arsenal vs Chelsea");
    expect(html).toContain("Real Madrid vs Atletico");
    expect(html).toContain("Bayern Munich vs PSG");
  });

  it("serves vector OG Image at /og-image.svg via handleApiRequest", async () => {
    const req = new Request("https://fast-xbet.lk/og-image.svg");
    const res = await handleApiRequest(req, mockEnv);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    expect(res?.headers.get("Content-Type")).toContain("image/svg+xml");
    const svgText = await res?.text();
    expect(svgText).toContain("<svg");
    expect(svgText).toContain('viewBox="0 0 1200 630"');
    expect(svgText).toContain("Fast xBet Cash 🇱🇰");
    expect(svgText).toContain("18+");
  });

  it("serves landing page through worker fetch even when secrets are unconfigured", async () => {
    // Import worker
    const workerModule = await import("../src/worker");
    const worker = workerModule.default;

    // Simulate empty/partial environment in Cloudflare
    const bareEnv = {
      CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
      CHANNEL_USERNAME: "@fast_xbet_official_tips",
      XBET_LINK: "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622",
      XBET_PROMO_CODE: "VGSL",
    } as unknown as Env;

    const req = new Request("https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev/");
    const res = await worker.fetch(req, bareEnv);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("Fast xBet Cash 🇱🇰");
    expect(html).toContain("VGSL");
  });
});
