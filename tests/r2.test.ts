import { describe, expect, it } from "vitest";
import { getR2StorageAnalytics } from "../src/r2";
import type { Env } from "../src/types";

describe("getR2StorageAnalytics", () => {
  it("aggregates every R2 page for receipts and logs", async () => {
    const uploadedAt = new Date("2026-11-04T10:00:00.000Z");
    const latestReceiptAt = new Date("2026-11-04T11:00:00.000Z");
    const firstReceiptPage = Array.from({ length: 1000 }, (_, index) => ({
      key: `receipts/${index}.jpg`,
      size: 1,
      uploaded: uploadedAt,
    }));
    const list = async (options: { prefix?: string; cursor?: string }) => {
      if (options.prefix === "receipts/" && !options.cursor) {
        return { objects: firstReceiptPage, truncated: true, cursor: "receipts-page-2" };
      }
      if (options.prefix === "receipts/" && options.cursor === "receipts-page-2") {
        return {
          objects: [{ key: "receipts/latest.jpg", size: 7, uploaded: latestReceiptAt }],
          truncated: false,
        };
      }
      if (options.prefix === "logs/") {
        return { objects: [{ key: "logs/latest.json", size: 2, uploaded: uploadedAt }], truncated: false };
      }
      throw new Error("Unexpected R2 pagination cursor");
    };

    const env = {
      CHAT_MEDIA: { put: async () => ({}), list },
      R2_BUCKET_NAME: "test-bucket",
    } as unknown as Env;

    const analytics = await getR2StorageAnalytics(env);
    expect(analytics.receiptsCount).toBe(1001);
    expect(analytics.receiptsTotalBytes).toBe(1007);
    expect(analytics.lastReceiptUploadedAt).toBe(latestReceiptAt.toISOString());
    expect(analytics.logsCount).toBe(1);
    expect(analytics.logsTotalBytes).toBe(2);
    expect(analytics.totalObjects).toBe(1002);
    expect(analytics.totalStorageBytes).toBe(1009);
  });

  it("does not silently report partial totals when pagination cannot advance", async () => {
    const env = {
      CHAT_MEDIA: {
        put: async () => ({}),
        list: async () => ({ objects: [{ key: "receipts/one.jpg", size: 10 }], truncated: true }),
      },
    } as unknown as Env;

    const analytics = await getR2StorageAnalytics(env);
    expect(analytics.receiptsCount).toBe(0);
    expect(analytics.receiptsTotalBytes).toBe(0);
  });
});
