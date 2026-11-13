import type { Env } from "./types";
import { getBucketName, isR2Configured, putObject, listObjects } from "./storage";
import { getLastCleanupResult } from "./logCleanup";
import { formatBytes } from "./utils";

export { formatBytes };

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const TELEGRAM_REQUEST_TIMEOUT_MS = 15_000;

async function readBoundedResponse(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) return null;
  if (!response.body) return new Uint8Array(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export interface R2FileMetadata {
  r2Url: string;
  r2Key: string;
  bucket: string;
  fileSize: number;
  mimeType: string;
  telegramFilePath?: string;
  uploadedAt: string;
}

export interface R2StorageAnalytics {
  configured: boolean;
  bucket: string;
  receiptsCount: number;
  receiptsTotalBytes: number;
  receiptsFormattedSize: string;
  lastReceiptUploadedAt: string | null;
  logsCount: number;
  logsTotalBytes: number;
  logsFormattedSize: string;
  totalObjects: number;
  totalStorageBytes: number;
  totalFormattedSize: string;
  lastCleanup: any;
  timestamp: string;
  scanComplete: boolean;
  continuation: string | null;
  pagesProcessed: number;
  objectsProcessed: number;
}


/**
 * Compiles real-time Cloudflare R2 storage analytics.
 * Calculates count and byte usage for receipts and logs,
 * newest receipt backup timestamp, and total storage utilization.
 */
interface PrefixAnalytics {
  count: number;
  totalBytes: number;
  latestUploadedAt: string | null;
}
interface PrefixScanState extends PrefixAnalytics {
  cursor?: string;
  complete: boolean;
  cursorHistory: string[];
}
interface R2AnalyticsScanState {
  version: 1;
  bucket: string;
  receipts: PrefixScanState;
  logs: PrefixScanState;
  pagesProcessed: number;
}
const R2_ANALYTICS_PAGE_SIZE = 1000;
const R2_ANALYTICS_MAX_PAGES_PER_REQUEST = 10;
const R2_ANALYTICS_CURSOR_HISTORY_LIMIT = 32;
const R2_ANALYTICS_MAX_TOKEN_LENGTH = 16_384;

export class R2AnalyticsContinuationError extends Error {
  constructor() {
    super("Invalid R2 analytics continuation");
    this.name = "R2AnalyticsContinuationError";
  }
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new R2AnalyticsContinuationError();
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
async function getAnalyticsTokenKey(env: Env): Promise<CryptoKey> {
  const secret = (env.ADMIN_API_SECRET || env.WEBHOOK_SECRET || "").trim();
  if (!secret) throw new Error("R2 analytics continuation signing is not configured");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function fingerprintCursor(cursor: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cursor)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function emptyPrefixScan(): PrefixScanState {
  return { count: 0, totalBytes: 0, latestUploadedAt: null, complete: false, cursorHistory: [] };
}
function isPrefixScanState(value: unknown): value is PrefixScanState {
  if (!value || typeof value !== "object") return false;
  const s = value as PrefixScanState;
  return Number.isSafeInteger(s.count) && s.count >= 0 &&
    Number.isSafeInteger(s.totalBytes) && s.totalBytes >= 0 &&
    (s.latestUploadedAt === null || (typeof s.latestUploadedAt === "string" && Number.isFinite(Date.parse(s.latestUploadedAt)))) &&
    typeof s.complete === "boolean" &&
    (s.cursor === undefined || (typeof s.cursor === "string" && s.cursor.length > 0 && s.cursor.length <= 2048)) &&
    Array.isArray(s.cursorHistory) && s.cursorHistory.length <= R2_ANALYTICS_CURSOR_HISTORY_LIMIT &&
    s.cursorHistory.every((c) => /^[a-f0-9]{64}$/.test(c));
}
async function decodeAnalyticsContinuation(env: Env, token: string | null, bucket: string): Promise<R2AnalyticsScanState> {
  if (!token) return { version: 1, bucket, receipts: emptyPrefixScan(), logs: emptyPrefixScan(), pagesProcessed: 0 };
  if (token.length > R2_ANALYTICS_MAX_TOKEN_LENGTH) throw new R2AnalyticsContinuationError();
  const parts = token.split(".");
  if (parts.length !== 2) throw new R2AnalyticsContinuationError();
  const payload = decodeBase64Url(parts[0]), signature = decodeBase64Url(parts[1]);
  const key = await getAnalyticsTokenKey(env);
  if (!await crypto.subtle.verify("HMAC", key, signature, payload)) throw new R2AnalyticsContinuationError();
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(payload)); } catch { throw new R2AnalyticsContinuationError(); }
  if (!parsed || typeof parsed !== "object") throw new R2AnalyticsContinuationError();
  const s = parsed as R2AnalyticsScanState;
  if (s.version !== 1 || s.bucket !== bucket || !Number.isSafeInteger(s.pagesProcessed) || s.pagesProcessed < 0 ||
      !isPrefixScanState(s.receipts) || !isPrefixScanState(s.logs) ||
      (s.receipts.complete && s.receipts.cursor !== undefined) || (s.logs.complete && s.logs.cursor !== undefined)) {
    throw new R2AnalyticsContinuationError();
  }
  return s;
}
async function encodeAnalyticsContinuation(env: Env, state: R2AnalyticsScanState): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify(state));
  const key = await getAnalyticsTokenKey(env);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
  const token = encodeBase64Url(payload) + "." + encodeBase64Url(signature);
  if (token.length > R2_ANALYTICS_MAX_TOKEN_LENGTH) throw new Error("R2 analytics continuation exceeded its size limit");
  return token;
}
async function processAnalyticsPrefix(env: Env, prefix: string, state: PrefixScanState): Promise<void> {
  if (state.complete) return;
  const page = await listObjects(env, prefix, state.cursor);
  if (typeof page.truncated !== "boolean" || !Array.isArray(page.objects) || page.objects.length > R2_ANALYTICS_PAGE_SIZE) {
    throw new Error("R2 analytics page exceeded the configured object limit");
  }
  for (const object of page.objects) {
    const size = Number(object.size || 0);
    if (!Number.isSafeInteger(size) || size < 0 || !Number.isSafeInteger(state.totalBytes + size)) {
      throw new Error("R2 analytics object size is invalid");
    }
    state.count += 1;
    state.totalBytes += size;
    if (object.uploaded) {
      const uploadedAt = object.uploaded.toISOString();
      if (!state.latestUploadedAt || uploadedAt > state.latestUploadedAt) state.latestUploadedAt = uploadedAt;
    }
  }
  if (!page.truncated) {
    state.complete = true;
    delete state.cursor;
  } else {
    const next = page.cursor;
    if (typeof next !== "string" || !next || next.length > 2048 || next === state.cursor) {
      throw new Error("R2 pagination returned a missing, malformed, or repeated continuation cursor");
    }
    const fingerprint = await fingerprintCursor(next);
    if (state.cursorHistory.includes(fingerprint)) {
      throw new Error("R2 pagination returned a repeated continuation cursor");
    }
    state.cursor = next;
    state.cursorHistory = [...state.cursorHistory, fingerprint].slice(-R2_ANALYTICS_CURSOR_HISTORY_LIMIT);
  }
}

/**
 * Processes at most 10 R2 pages (10,000 objects) per call. Signed continuation
 * tokens carry cursors and aggregate totals so scans resume without retaining
 * object listings or restarting completed pages.
 */
export async function getR2StorageAnalytics(env: Env, continuationToken: string | null = null): Promise<R2StorageAnalytics> {
  const configured = isR2Configured(env), bucket = getBucketName(env), now = new Date().toISOString();
  if (!configured) {
    return {
      configured: false, bucket, receiptsCount: 0, receiptsTotalBytes: 0, receiptsFormattedSize: "0 B",
      lastReceiptUploadedAt: null, logsCount: 0, logsTotalBytes: 0, logsFormattedSize: "0 B",
      totalObjects: 0, totalStorageBytes: 0, totalFormattedSize: "0 B", lastCleanup: getLastCleanupResult(),
      timestamp: now, scanComplete: true, continuation: null, pagesProcessed: 0, objectsProcessed: 0,
    };
  }
  const state = await decodeAnalyticsContinuation(env, continuationToken, bucket);
  let pagesProcessed = 0;
  // Round-robin prevents a large receipts prefix from starving logs.
  while (pagesProcessed < R2_ANALYTICS_MAX_PAGES_PER_REQUEST && (!state.receipts.complete || !state.logs.complete)) {
    for (const [prefix, prefixState] of [["receipts/", state.receipts], ["logs/", state.logs]] as const) {
      if (pagesProcessed >= R2_ANALYTICS_MAX_PAGES_PER_REQUEST) break;
      if (prefixState.complete) continue;
      await processAnalyticsPrefix(env, prefix, prefixState);
      pagesProcessed += 1;
    }
  }
  state.pagesProcessed += pagesProcessed;
  const scanComplete = state.receipts.complete && state.logs.complete;
  const continuation = scanComplete ? null : await encodeAnalyticsContinuation(env, state);
  const totalObjects = state.receipts.count + state.logs.count;
  const totalStorageBytes = state.receipts.totalBytes + state.logs.totalBytes;
  console.info("[R2 Analytics] bounded scan batch", {
    pagesProcessed, totalPagesProcessed: state.pagesProcessed, objectsProcessed: totalObjects,
    receiptsComplete: state.receipts.complete, logsComplete: state.logs.complete, scanComplete,
  });
  return {
    configured: true, bucket,
    receiptsCount: state.receipts.count, receiptsTotalBytes: state.receipts.totalBytes,
    receiptsFormattedSize: formatBytes(state.receipts.totalBytes), lastReceiptUploadedAt: state.receipts.latestUploadedAt,
    logsCount: state.logs.count, logsTotalBytes: state.logs.totalBytes,
    logsFormattedSize: formatBytes(state.logs.totalBytes), totalObjects, totalStorageBytes,
    totalFormattedSize: formatBytes(totalStorageBytes), lastCleanup: getLastCleanupResult(), timestamp: now,
    scanComplete, continuation, pagesProcessed, objectsProcessed: totalObjects,
  };
}

/**
 * Downloads a photo from Telegram and stores it in Cloudflare R2.
 * Uses the native R2 binding on Workers, or the S3 API elsewhere.
 * Never throws - returns null when storage is unavailable.
 */
export async function backupReceiptToR2(
  env: Env,
  botToken: string,
  fileId: string,
  depositId: number | string
): Promise<R2FileMetadata | null> {
  if (!isR2Configured(env)) {
    console.log("[R2] No R2 binding or credentials configured; skipping receipt backup.");
    return null;
  }

  try {
    // 1. Resolve the file path from Telegram
    const fileInfoRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
      { signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS) }
    );
    if (!fileInfoRes.ok) {
      console.warn(`[R2] Failed to get file info from Telegram: ${fileInfoRes.statusText}`);
      return null;
    }

    const fileInfo = (await fileInfoRes.json()) as {
      ok: boolean;
      result?: { file_path?: string; file_size?: number };
    };
    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      console.warn("[R2] Invalid file info response from Telegram");
      return null;
    }

    const filePath = fileInfo.result.file_path;
    const declaredSize = fileInfo.result.file_size ?? 0;
    if (declaredSize > MAX_RECEIPT_BYTES) {
      console.warn(`[R2] Receipt rejected: declared size ${declaredSize} exceeds ${MAX_RECEIPT_BYTES}`);
      return null;
    }

    // 2. Download the file (size-bounded after download)
    const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`, {
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    });
    if (!fileRes.ok) {
      console.warn(`[R2] Failed to download image from Telegram: ${fileRes.statusText}`);
      return null;
    }
    const bytes = await readBoundedResponse(fileRes, MAX_RECEIPT_BYTES);
    if (!bytes) {
      console.warn(`[R2] Receipt rejected: response exceeds ${MAX_RECEIPT_BYTES} bytes`);
      return null;
    }

    // Validate magic bytes (JPEG / PNG / WebP / PDF only).
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isWebp =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;
    const isPdf =
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d;
    if (!isJpeg && !isPng && !isWebp && !isPdf) {
      console.warn("[R2] Receipt rejected: unsupported or unrecognised file signature");
      return null;
    }

    // 3. Store in R2 with unguessable random token; extension from verified type.
    const extension = isPng ? "png" : isWebp ? "webp" : isPdf ? "pdf" : "jpg";
    const randomToken = crypto.randomUUID().replace(/-/g, "");
    const key = `receipts/deposit_${depositId}_${Date.now()}_${randomToken}.${extension}`;
    const mimeType =
      extension === "png"
        ? "image/png"
        : extension === "webp"
        ? "image/webp"
        : extension === "pdf"
        ? "application/pdf"
        : "image/jpeg";

    const stored = await putObject(env, key, bytes, mimeType);
    if (!stored) return null;

    // Never expose a public R2/object URL for receipts.
    // Always point at the authenticated Worker proxy (ADMIN_API_SECRET / session).
    const base = (env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    const r2Url = base
      ? `${base}/api/admin/receipts?key=${encodeURIComponent(key)}`
      : `/api/admin/receipts?key=${encodeURIComponent(key)}`;
    const fileSize = bytes.byteLength || fileInfo.result.file_size || 0;

    console.log(`[R2] Receipt stored (proxy): key=${key} (${fileSize} bytes)`);
    return {
      r2Url,
      r2Key: key,
      bucket: getBucketName(env),
      fileSize,
      mimeType,
      telegramFilePath: filePath,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[R2] Error backing up receipt to Cloudflare R2:", error);
    return null;
  }
}
