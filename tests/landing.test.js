import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

describe("Fast xBet Cash Web App", () => {
  it("should load the landing page and display hero and promo details", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: "https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev" });

    const logoResult = await testdriver.assert("Fast xBet Cash logo and Bot: Online status are visible");
    expect(logoResult).toBeTruthy();

    await testdriver.pressKeys(["escape"]);
    await testdriver.pressKeys(["pagedown"]);

    const promoResult = await testdriver.assert("The 1xBet Promo code VGSL card and Telegram Bot button are visible");
    expect(promoResult).toBeTruthy();
  });

  it("should view privacy policy and navigate back to home", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: "https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev/privacy" });

    const privacyResult = await testdriver.assert("The Privacy Policy and Data Protection page is displayed");
    expect(privacyResult).toBeTruthy();

    await testdriver.find("Home button in the header").click();

    const homeResult = await testdriver.assert("The landing page hero section and Fast xBet Cash branding are visible");
    expect(homeResult).toBeTruthy();
  });
});
