import { describe, expect, it } from "vitest";
import { createD1Database } from "../src/sqlite-d1";
import * as db from "../src/db";
import { handleApiRequest } from "../src/apiRoutes";
import type { Env } from "../src/types";

describe("P1 Attribution and Funnel Tracking", () => {
  it("persists analytics events to D1 and computes funnel stats", async () => {
    const d1 = createD1Database(":memory:");

    // Record sample CTA clicks
    await db.recordAnalyticsEvent(d1, {
      eventName: "cta_click",
      sessionId: "sess_101",
      source: "facebook",
      campaign: "world_cup_promo",
      subId: "fb_ad_01",
      landingPath: "/",
      language: "si",
    });

    await db.recordAnalyticsEvent(d1, {
      eventName: "cta_click",
      sessionId: "sess_102",
      source: "google",
      campaign: "brand_search",
      subId: "g_search_01",
      landingPath: "/",
      language: "en",
    });

    // Record sample bot start
    await db.recordAnalyticsEvent(d1, {
      eventName: "bot_start",
      telegramPayload: "c_world_cup_promo_s_fb_ad_01",
      userId: 777001,
      source: "campaign",
      campaign: "world_cup_promo",
      subId: "fb_ad_01",
      language: "si",
    });

    // Record sample registration view
    await db.recordAnalyticsEvent(d1, {
      eventName: "registration_view",
      userId: 777001,
      language: "si",
    });

    // Save a user and a deposit
    await db.saveUser(d1, 777001, "player_one", "Player", null, "si");
    await db.addDeposit(d1, 777001, "player_one", "12345678", 5000, "rec_file_1", "BANK", null, "dep_test_1");

    // Compute funnel stats
    const funnel = await db.getAttributionFunnelStats(d1, 7);
    expect(funnel.ctaClicks).toBe(2);
    expect(funnel.botStarts).toBe(1);
    expect(funnel.registrationViews).toBe(1);
    expect(funnel.newUsers).toBe(1);
    expect(funnel.depositsCount).toBe(1);
    expect(funnel.bySource.length).toBeGreaterThan(0);
  });

  it("handles /api/analytics/event beacon requests with IP hashing and persistence", async () => {
    const d1 = createD1Database(":memory:");
    const mockEnv: Env = {
      DB: d1,
      BOT_TOKEN: "mock_token",
      ADMIN_IDS: "123456789",
      WEBHOOK_SECRET: "mock_webhook_secret",
      ADMIN_API_SECRET: "mock_admin_secret_token_12345",
      CHANNEL_USERNAME: "@fast_xbet_test",
      CHANNEL_URL: "https://t.me/fast_xbet_test",
      PUBLIC_BASE_URL: "https://fast-xbet.lk",
      XBET_LINK: "",
      XBET_PROMO_CODE: "",
      MIN_TRANSACTION_LKR: "1000",
      MAX_TRANSACTION_LKR: "500000",
      DEPOSIT_INSTRUCTIONS: "Instructions",
    };

    const beaconReq = new Request("https://fast-xbet.lk/api/analytics/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cf-connecting-ip": "192.0.2.42",
        "user-agent": "Mozilla/5.0 Vitest-Agent",
      },
      body: JSON.stringify({
        event: "cta_click",
        cta: "hero_cta_btn",
        sessionId: "sess_web_99",
        source: "twitter",
        campaign: "ipl_2026",
        subId: "tw_link_01",
        lang: "si",
      }),
    });

    const res = await handleApiRequest(beaconReq, mockEnv);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(200);

    const body = (await res?.json()) as any;
    expect(body.ok).toBe(true);

    // Verify row was stored in D1
    const stored = await d1
      .prepare("SELECT * FROM analytics_events WHERE session_id = ?")
      .bind("sess_web_99")
      .first<any>();

    expect(stored).not.toBeNull();
    expect(stored.event_name).toBe("cta_click");
    expect(stored.source).toBe("twitter");
    expect(stored.campaign).toBe("ipl_2026");
    expect(stored.sub_id).toBe("tw_link_01");
    // Ensure raw IP was hashed and not stored in plaintext
    expect(stored.ip_hash).not.toBeNull();
    expect(stored.ip_hash).not.toBe("192.0.2.42");
    expect(stored.ip_hash.length).toBeGreaterThanOrEqual(16);
  });
});
