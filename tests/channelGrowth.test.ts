import { describe, expect, it } from "vitest";
import { createD1Database } from "../src/sqlite-d1";
import { getChannelGrowthAnalytics, recordChannelMemberUpdate, saveTrackedChannelInvite } from "../src/db";

describe("Telegram channel growth analytics", () => {
  it("deduplicates Telegram updates and attributes joins to tracked campaigns", async () => {
    const database = createD1Database(":memory:");
    await saveTrackedChannelInvite(database, {
      chatId: "-100123", inviteLink: "https://t.me/+tracked", title: "WhatsApp", source: "whatsapp", campaign: "november_launch",
    });

    const join = {
      updateId: 9001, chatId: "-100123", userId: 77, username: "player77", isMember: true,
      inviteLink: "https://t.me/+tracked", occurredAt: Math.floor(Date.now() / 1000),
    };
    expect(await recordChannelMemberUpdate(database, join)).toBe(true);
    expect(await recordChannelMemberUpdate(database, join)).toBe(false);
    expect(await recordChannelMemberUpdate(database, {
      updateId: 9002, chatId: "-100123", userId: 88, isMember: true, occurredAt: Math.floor(Date.now() / 1000),
    })).toBe(true);
    expect(await recordChannelMemberUpdate(database, {
      updateId: 9003, chatId: "-100123", userId: 88, isMember: false, occurredAt: Math.floor(Date.now() / 1000),
    })).toBe(true);

    const analytics = await getChannelGrowthAnalytics(database, 30);
    expect(analytics.trackedMembers).toBe(1);
    expect(analytics.joins).toBe(2);
    expect(analytics.leaves).toBe(1);
    expect(analytics.netGrowth).toBe(1);
    expect(analytics.bySource).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "whatsapp", campaign: "november_launch", joins: 1, leaves: 0 }),
      expect.objectContaining({ source: "direct", joins: 1, leaves: 1 }),
    ]));
    expect(analytics.invites).toHaveLength(1);
  });
});
