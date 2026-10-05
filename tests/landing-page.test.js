import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

describe("Fast xBet Cash Web Application", () => {
  it("loads the production landing page and verifies hero and telegram status", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: "https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev" });

    const assertHero = await testdriver.assert("the Fast xBet Cash landing page is visible with the hero section");
    expect(assertHero).toBeTruthy();

    const assertCTA = await testdriver.assert("the navigation bar and Telegram CTA button are visible");
    expect(assertCTA).toBeTruthy();
  });

  it("navigates to the privacy policy page and returns to the home page", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: "https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev/privacy" });

    const assertPrivacy = await testdriver.assert("the Privacy Policy and Data Protection page is visible");
    expect(assertPrivacy).toBeTruthy();

    await testdriver.find("the Home link in the top navigation bar").click();

    await testdriver.find("the hero section heading or Telegram Bot button", { timeout: 20000 });

    const assertHome = await testdriver.assert("the main landing page with the hero section is visible");
    expect(assertHome).toBeTruthy();
  });
});
