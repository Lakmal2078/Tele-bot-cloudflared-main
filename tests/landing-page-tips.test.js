import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

describe("Landing Page Free Tips Settlement", () => {
  it("renders landing page and checks free tips section", async (context) => {
    const testdriver = TestDriver(context);

    const targetUrl = process.env.TEST_URL || "https://xbet-telegram-bot.agent-1xfast-srilanka.workers.dev";
    await testdriver.provision.chrome({ url: targetUrl });

    await testdriver.find("Free Tips link in the navigation bar").click();

    const assertResult = await testdriver.assert("the Free Tips section is visible with sports filter tabs");
    expect(assertResult).toBeTruthy();
  });
});
