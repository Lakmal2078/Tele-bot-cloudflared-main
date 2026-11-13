import { describe, expect, it, vi } from "vitest";
import { getR2StorageAnalytics } from "../src/r2";
import type { Env } from "../src/types";

function createEnv(list: (options: { prefix?: string; cursor?: string }) => Promise<any>): Env {
  return {
    CHAT_MEDIA: { put: async () => ({}), list },
    R2_BUCKET_NAME: "test-bucket",
    ADMIN_API_SECRET: "test-admin-secret",
    WEBHOOK_SECRET: "test-webhook-secret",
  } as unknown as Env;
}

describe("getR2StorageAnalytics", () => {
  it("aggregates all pages across receipts and logs", async () => {
    const uploadedAt = new Date("2026-11-04T10:00:00.000Z");
    const latestReceiptAt = new Date("2026-11-04T11:00:00.000Z");
    const firstReceiptPage = Array.from({ length: 1000 }, (_, index) => ({ key: `receipts/${index}.jpg`, size: 1, uploaded: uploadedAt }));
    const calls: string[] = [];
    const list = async (options: { prefix?: string; cursor?: string }) => {
      calls.push(`${options.prefix}:${options.cursor || "start"}`);
      if (options.prefix === "receipts/" && !options.cursor) return { objects: firstReceiptPage, truncated: true, cursor: "receipts-page-2" };
      if (options.prefix === "receipts/" && options.cursor === "receipts-page-2") return { objects: [{ key: "receipts/latest.jpg", size: 7, uploaded: latestReceiptAt }], truncated: false };
      if (options.prefix === "logs/" && !options.cursor) return { objects: [{ key: "logs/latest.json", size: 2, uploaded: uploadedAt }], truncated: false };
      throw new Error("Unexpected R2 pagination cursor");
    };
    const analytics = await getR2StorageAnalytics(createEnv(list));
    expect(analytics.scanComplete).toBe(true);
    expect(analytics.receiptsCount).toBe(1001);
    expect(analytics.receiptsTotalBytes).toBe(1007);
    expect(analytics.lastReceiptUploadedAt).toBe(latestReceiptAt.toISOString());
    expect(analytics.logsCount).toBe(1);
    expect(analytics.logsTotalBytes).toBe(2);
    expect(analytics.totalObjects).toBe(1002);
    expect(analytics.totalStorageBytes).toBe(1009);
    expect(calls).toEqual(["receipts/:start", "logs/:start", "receipts/:receipts-page-2"]);
  });

  it("caps each request at ten pages and resumes without double-counting", async () => {
    const calls: string[] = [];
    const list = async ({ prefix, cursor }: { prefix?: string; cursor?: string }) => {
      calls.push(`${prefix}:${cursor || "start"}`);
      const index = cursor ? Number(cursor.split("-").pop()) : 0;
      const next = index + 1;
      return { objects: [{ key: `${prefix}${next}.json`, size: 5 }], truncated: next < 12, cursor: next < 12 ? `page-${next}` : undefined };
    };
    const env = createEnv(list);
    const first = await getR2StorageAnalytics(env);
    expect(first.scanComplete).toBe(false);
    expect(first.pagesProcessed).toBe(10);
    expect(first.objectsProcessed).toBe(10);
    expect(first.continuation).toBeTruthy();
    expect(calls).toHaveLength(10);

    const second = await getR2StorageAnalytics(env, first.continuation);
    expect(second.scanComplete).toBe(true);
    expect(second.continuation).toBeNull();
    expect(second.totalObjects).toBe(24);
    expect(second.totalStorageBytes).toBe(120);
    expect(calls).toHaveLength(24);
  });

  it("rejects invalid and bucket-mismatched continuation tokens", async () => {
    const list = async ({ prefix, cursor }: { prefix?: string; cursor?: string }) => ({
      objects: [], truncated: prefix === "receipts/" && !cursor, cursor: prefix === "receipts/" && !cursor ? "next" : undefined,
    });
    const env = createEnv(list);
    const partial = await getR2StorageAnalytics(env);
    expect(partial.continuation).toBeTruthy();
    await expect(getR2StorageAnalytics(env, partial.continuation!.slice(0, -1) + "x")).rejects.toThrow(/continuation/i);
    const otherBucket = { ...env, R2_BUCKET_NAME: "other-bucket" } as Env;
    await expect(getR2StorageAnalytics(otherBucket, partial.continuation)).rejects.toThrow(/continuation/i);
  });

  it("rejects missing and repeated continuation cursors", async () => {
    const missing = createEnv(async () => ({ objects: [{ key: "receipts/a", size: 1 }], truncated: true }));
    await expect(getR2StorageAnalytics(missing)).rejects.toThrow(/cursor/i);
    const repeated = createEnv(async ({ prefix, cursor }) => ({
      objects: [{ key: `${prefix}a`, size: 1 }], truncated: true, cursor: cursor || "loop",
    }));
    await expect(getR2StorageAnalytics(repeated)).rejects.toThrow(/cursor/i);
  });

  it("propagates transient R2 errors rather than reporting false zero totals", async () => {
    const env = createEnv(async () => { throw new Error("temporary R2 outage"); });
    await expect(getR2StorageAnalytics(env)).rejects.toThrow("temporary R2 outage");
  });

  it("handles empty prefixes and unconfigured storage", async () => {
    const env = createEnv(async () => ({ objects: [], truncated: false }));
    const result = await getR2StorageAnalytics(env);
    expect(result.scanComplete).toBe(true);
    expect(result.totalObjects).toBe(0);
    const unconfigured = await getR2StorageAnalytics({ DB: {} } as Env);
    expect(unconfigured.scanComplete).toBe(true);
    expect(unconfigured.continuation).toBeNull();
  });
});
