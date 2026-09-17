import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../src/apiRoutes";
import { renderLandingPage } from "../src/landingPage";
import type { Env } from "../src/types";

const mockEnv = {
  BOT_USERNAME: "fast_1xbetcash_bot",
  CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
  MIN_TRANSACTION_LKR: "1000",
  MAX_TRANSACTION_LKR: "500000",
  XBET_PROMO_CODE: "VGSL",
} as Env;

describe("Landing Page Render & SEO", () => {
  it("renders landing page with correct default language and CSP nonce", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req, "test-nonce");

    expect(html).toContain('<html lang="si">');
    expect(html).toContain('nonce="test-nonce"');
    expect(html).toContain("Fast xBet Cash");
  });

  it("detects language from ?lang=en query parameter", () => {
    const req = new Request("https://fast-xbet.lk/?lang=en");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Fast tips. Simple cash support. One Telegram.");
  });

  it("detects language from ?lang=ta query parameter", () => {
    const req = new Request("https://fast-xbet.lk/?lang=ta");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('<html lang="ta">');
    expect(html).toContain("வேகமான tips");
  });

  it("includes OpenGraph and Twitter card meta tags with WhatsApp optimizations", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('property="og:image:secure_url"');
    expect(html).toContain('property="og:image:type" content="image/jpeg"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image"');
    expect(html).toContain('itemprop="image"');
  });

  it("serves JPEG OG Image at /og-image.jpg via handleApiRequest", async () => {
    const req = new Request("https://fast-xbet.lk/og-image.jpg");
    const res = await handleApiRequest(req, mockEnv);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    expect(res?.headers.get("content-type")).toContain("image/jpeg");
  });

  it("serves PNG OG Image at /og-image.png via handleApiRequest", async () => {
    const req = new Request("https://fast-xbet.lk/og-image.png");
    const res = await handleApiRequest(req, mockEnv);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    expect(res?.headers.get("content-type")).toContain("image/png");
  });

  it("includes canonical and hreflang tags for multi-language SEO", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('rel="canonical"');
    expect(html).toContain('hreflang="si"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('hreflang="ta"');
    expect(html).toContain('hreflang="x-default"');
  });

  it("includes JSON-LD schema with Organization, WebSite, and FAQPage", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("renders 18+ Responsible Gaming notices and badges", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain("18+ only");
    expect(html).toContain("Responsible Gaming Notice");
    expect(html).toContain("Gambling involves risk and losses can occur.");
  });

  it("renders deep-linked Telegram bot CTAs", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain("https://t.me/fast_1xbetcash_bot?start=landing");
  });

  it("renders Trust signals strip and supported payment rails", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain("⚡ Guided");
    expect(html).toContain("📲 Telegram");
    expect(html).toContain("🛡️ Logged");
    expect(html).toContain("💳 Local rails");
    expect(html).toContain("eZ Cash");
    expect(html).toContain("mCash");
    expect(html).toContain("FriMi");
  });

  it("renders the current split hero, mobile navigation, and repaired gradient token", () => {
    const req = new Request("https://fast-xbet.lk/");
    const html = renderLandingPage(mockEnv, req);

    expect(html).toContain('class="wrap heroGrid"');
    expect(html).toContain('id="mobileNav"');
    expect(html).toContain('id="menuToggle"');
    expect(html).toContain("edge-visual");
    expect(html).not.toContain("var(--gradient)");
    expect(html).not.toContain("10,000+");
    expect(html).not.toContain("99.9%");
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
    expect(res?.headers.get("content-type")).toContain("image/svg+xml");
  });

  it("serves landing page through worker fetch even when secrets are unconfigured", async () => {
    const req = new Request("https://fast-xbet.lk/");
    const res = await handleApiRequest(req, {} as Env);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);
    expect(await res?.text()).toContain("Fast xBet Cash");
  });
});
