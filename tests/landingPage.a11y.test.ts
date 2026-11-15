import { describe, expect, it } from "vitest";
import { renderLandingPage } from "../src/landingPage";
import type { Env, D1Database } from "../src/types";
import { createMockD1 } from "./helpers/mockD1";

// Minimal fixture: only the bindings the landing page reads during render.
const env = {
  DB: createMockD1() as D1Database,
  BOT_TOKEN: "mock_token_123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ",
  PUBLIC_BASE_URL: "https://fast-xbet.lk",
  ADMIN_IDS: "123456789",
  CHANNEL_USERNAME: "@fast_xbet_official_tips",
  CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
  WEBHOOK_SECRET: "mock_webhook_secret_long_enough_16chars",
  XBET_LINK: "https://refpa.top/L?tag=d_mock&p=/registration/",
  XBET_PROMO_CODE: "VGSL",
  MIN_TRANSACTION_LKR: "1000",
  MAX_TRANSACTION_LKR: "500000",
} as unknown as Env;

function renderHtml(): string {
  return renderLandingPage(env, new Request("https://fast-xbet.lk/"), "testnonce");
}

describe("landing page accessibility markup", () => {
  it("sport filter uses aria-pressed toggle buttons instead of an invalid tablist", () => {
    const html = renderHtml();
    expect(html).not.toContain('role="tablist"');
    expect(html).toContain('role="group" aria-label="Filter tips by sport"');
    expect(html).toContain('data-sport="all" class="tipTab active" aria-pressed="true"');
    expect(html).toContain('data-sport="football" class="tipTab" aria-pressed="false"');
  });

  it("bot status widget is a native button, not a focusable status div", () => {
    const html = renderHtml();
    expect(html).toMatch(/<button type="button" class="botStatusWidget" id="botStatusWidget"/);
    expect(html).toContain('<span class="botStatusLabel" id="botStatusLabel" role="status" aria-live="polite">');
  });

  it("ticker is a labelled region with a pause control", () => {
    const html = renderHtml();
    expect(html).toContain('role="region" aria-label="Bot updates');
    expect(html).toContain('class="tickerPause" aria-pressed="false"');
    expect(html).toContain(".tickerBar.paused .tickerItems");
  });

  it("ticker uses a seamless, faster loop and respects reduced-motion preferences", () => {
    const html = renderHtml();
    expect(html).toContain("animation: ticker-scroll 24s linear infinite;");
    expect(html).toContain('<div class="tickerGroup" aria-hidden="true">');
    expect(html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(html).toContain(".tickerItems { animation: none; transform: none; }");
  });

  it("Sinhala hero heading reads as one continuous phrase without a forced line break", () => {
    const html = renderLandingPage(env, new Request("https://fast-xbet.lk/?lang=si"), "testnonce");
    expect(html).toContain('class="heroHeading heroHeading--si"');
    expect(html).toContain("ඔබේ සේවාවන්ට <span class=\"hl-gradient hl-tips\">එක්</span> <span class=\"hl-gradient hl-cash\">Telegram</span> මධ්‍යස්ථානයක්.");
    expect(html).toContain(".heroHeading--si .hero-line { display: inline; }");
  });

  it("footer legal controls share the same inline link alignment", () => {
    const html = renderHtml();
    expect(html).toContain(".footerLinks { display: flex; flex-wrap: wrap; align-items: center;");
    expect(html).toContain(".footerLinkBtn {\n      display: inline-flex; align-items: center;");
  });

  it("team crest images no longer carry abbreviation alt text", () => {
    const html = renderHtml();
    expect(html).not.toMatch(/crests\.football-data\.org\/\d+\.png" alt="[A-Z]{2}"/);
  });

  it("chat mockup container is a region landmark", () => {
    expect(renderHtml()).toContain('<div class="phone" role="region" aria-label="Telegram bot chat preview">');
  });

  it("secondary text colour is raised to meet 4.5:1 contrast on the card surface", () => {
    expect(renderHtml()).toContain("--faint:#7d8fa6;");
  });

  it("dialogs keep Tab focus inside while open", () => {
    const html = renderHtml();
    const tabHandlers = html.split('e.key === "Tab"').length - 1;
    expect(tabHandlers).toBeGreaterThanOrEqual(2);
  });
});
