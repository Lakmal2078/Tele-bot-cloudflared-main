import { afterEach, describe, expect, it, vi } from "vitest";
import { backupReceiptToR2, getR2StorageAnalytics } from "../src/r2";
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
    expect(second.scanComplete).toBe(false);
    expect(second.pagesProcessed).toBe(10);
    expect(second.totalObjects).toBe(20);
    expect(second.continuation).toBeTruthy();

    const third = await getR2StorageAnalytics(env, second.continuation);
    expect(third.scanComplete).toBe(true);
    expect(third.continuation).toBeNull();
    expect(third.totalObjects).toBe(24);
    expect(third.totalStorageBytes).toBe(120);
    expect(calls).toHaveLength(24);
  });

  it("rejects provider pages larger than the documented page bound", async () => {
    const oversizedPage = createEnv(async () => ({
      objects: Array.from({ length: 1001 }, (_, index) => ({ key: `receipts/${index}`, size: 1 })),
      truncated: false,
    }));
    await expect(getR2StorageAnalytics(oversizedPage)).rejects.toThrow(/page exceeded/i);
  });

  it("rejects invalid and bucket-mismatched continuation tokens", async () => {
    const list = async ({ prefix, cursor }: { prefix?: string; cursor?: string }) => {
      if (prefix !== "receipts/") return { objects: [], truncated: false };
      const index = cursor ? Number(cursor.split("-").pop()) : 0;
      const next = index + 1;
      return { objects: [], truncated: next < 12, cursor: next < 12 ? `page-${next}` : undefined };
    };
    const env = createEnv(list);
    const partial = await getR2StorageAnalytics(env);
    expect(partial.continuation).toBeTruthy();
    const tampered = (partial.continuation![0] === "A" ? "B" : "A") + partial.continuation!.slice(1);
    await expect(getR2StorageAnalytics(env, tampered)).rejects.toThrow(/continuation/i);
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


function createReceiptEnv() {
  const put = vi.fn(async () => ({}));
  const env = {
    CHAT_MEDIA: { put, get: async () => null, delete: async () => undefined },
    R2_BUCKET_NAME: "test-bucket",
    ADMIN_API_SECRET: "test-admin-secret",
    WEBHOOK_SECRET: "test-webhook-secret",
    PUBLIC_BASE_URL: "https://worker.example",
  } as unknown as Env;
  return { env, put };
}

function telegramFileInfo(fileSize = 3): Response {
  return Response.json({ ok: true, result: { file_path: "documents/receipt.jpg", file_size: fileSize } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("backupReceiptToR2 security boundaries", () => {
  it("rejects an oversized declared Telegram file before downloading it", async () => {
    const { env, put } = createReceiptEnv();
    const fetchMock = vi.fn().mockResolvedValue(telegramFileInfo(5 * 1024 * 1024 + 1));
    vi.stubGlobal("fetch", fetchMock);

    await expect(backupReceiptToR2(env, "bot-token", "file-id", 1)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(put).not.toHaveBeenCalled();
  });

  it("accepts a receipt exactly at the 5 MiB streamed-body boundary", async () => {
    const { env, put } = createReceiptEnv();
    const bytes = new Uint8Array(5 * 1024 * 1024);
    bytes.set([0xff, 0xd8, 0xff]);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(telegramFileInfo(bytes.byteLength))
      .mockResolvedValueOnce(new Response(bytes, { headers: { "content-length": String(bytes.byteLength) } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await backupReceiptToR2(env, "bot-token", "file-id", 2);
    expect(result?.fileSize).toBe(5 * 1024 * 1024);
    expect(result?.mimeType).toBe("image/jpeg");
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("cancels an oversized streamed response and does not upload it", async () => {
    const { env, put } = createReceiptEnv();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(5 * 1024 * 1024));
        controller.enqueue(new Uint8Array([1]));
      },
      cancel() { cancelled = true; },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(telegramFileInfo())
      .mockResolvedValueOnce(new Response(stream));
    vi.stubGlobal("fetch", fetchMock);

    await expect(backupReceiptToR2(env, "bot-token", "file-id", 3)).resolves.toBeNull();
    expect(cancelled).toBe(true);
    expect(put).not.toHaveBeenCalled();
  });

  it("returns null for non-success Telegram metadata and download responses", async () => {
    const { env, put } = createReceiptEnv();
    let metadataBodyCancelled = false;
    const metadataBody = new ReadableStream<Uint8Array>({ cancel() { metadataBodyCancelled = true; } });
    const metadataFailure = vi.fn().mockResolvedValue(new Response(metadataBody, { status: 502, statusText: "Bad Gateway" }));
    vi.stubGlobal("fetch", metadataFailure);
    await expect(backupReceiptToR2(env, "bot-token", "file-id", 4)).resolves.toBeNull();
    expect(metadataFailure).toHaveBeenCalledTimes(1);
    expect(metadataBodyCancelled).toBe(true);

    let downloadBodyCancelled = false;
    const downloadBody = new ReadableStream<Uint8Array>({ cancel() { downloadBodyCancelled = true; } });
    const downloadFailure = vi.fn()
      .mockResolvedValueOnce(telegramFileInfo())
      .mockResolvedValueOnce(new Response(downloadBody, { status: 503, statusText: "Service Unavailable" }));
    vi.stubGlobal("fetch", downloadFailure);
    await expect(backupReceiptToR2(env, "bot-token", "file-id", 5)).resolves.toBeNull();
    expect(downloadFailure).toHaveBeenCalledTimes(2);
    expect(downloadBodyCancelled).toBe(true);
    expect(put).not.toHaveBeenCalled();
  });

  it("rejects invalid Telegram metadata and unsupported file signatures", async () => {
    const { env, put } = createReceiptEnv();
    const invalidMetadata = vi.fn().mockResolvedValue(Response.json({ ok: true, result: { file_size: 3 } }));
    vi.stubGlobal("fetch", invalidMetadata);
    await expect(backupReceiptToR2(env, "bot-token", "file-id", 6)).resolves.toBeNull();

    const invalidContent = vi.fn()
      .mockResolvedValueOnce(telegramFileInfo())
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", invalidContent);
    await expect(backupReceiptToR2(env, "bot-token", "file-id", 7)).resolves.toBeNull();
    expect(put).not.toHaveBeenCalled();
  });

  it("handles Telegram timeout/abort failures without uploading partial content", async () => {
    const { env, put } = createReceiptEnv();
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("The operation timed out", "TimeoutError"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(backupReceiptToR2(env, "bot-token", "file-id", 8)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    expect(put).not.toHaveBeenCalled();
  });

  it("releases an interrupted response stream and never uploads partial bytes", async () => {
    const { env, put } = createReceiptEnv();
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array([0xff, 0xd8, 0xff]));
        controller.error(new DOMException("The operation was aborted", "AbortError"));
      },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(telegramFileInfo())
      .mockResolvedValueOnce(new Response(stream));
    vi.stubGlobal("fetch", fetchMock);

    await expect(backupReceiptToR2(env, "bot-token", "file-id", 9)).resolves.toBeNull();
    expect(stream.locked).toBe(false);
    expect(put).not.toHaveBeenCalled();
  });
});
