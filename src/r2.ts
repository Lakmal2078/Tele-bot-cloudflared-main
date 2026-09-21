import type { Env } from "./types";
import { getBucketName, isR2Configured, putObject, listObjects } from "./storage";
import { getLastCleanupResult } from "./logCleanup";

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
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Compiles real-time Cloudflare R2 storage analytics.
 * Calculates count and byte usage for receipts and logs,
 * newest receipt backup timestamp, and total storage utilization.
 */
export async function getR2StorageAnalytics(env: Env): Promise<R2StorageAnalytics> {
  const configured = isR2Configured(env);
  const bucket = getBucketName(env);
  const now = new Date().toISOString();

  if (!configured) {
    return {
      configured: false,
      bucket,
      receiptsCount: 0,
      receiptsTotalBytes: 0,
      receiptsFormattedSize: "0 B",
      lastReceiptUploadedAt: null,
      logsCount: 0,
      logsTotalBytes: 0,
      logsFormattedSize: "0 B",
      totalObjects: 0,
      totalStorageBytes: 0,
      totalFormattedSize: "0 B",
      lastCleanup: getLastCleanupResult(),
      timestamp: now,
    };
  }

  try {
    const [receiptsRes, logsRes] = await Promise.all([
      listObjects(env, "receipts/").catch(() => ({ objects: [], truncated: false })),
      listObjects(env, "logs/").catch(() => ({ objects: [], truncated: false })),
    ]);

    const receiptsCount = receiptsRes.objects.length;
    const receiptsTotalBytes = receiptsRes.objects.reduce((sum, obj) => sum + (obj.size || 0), 0);
    let lastReceiptUploadedAt: string | null = null;
    for (const obj of receiptsRes.objects) {
      if (obj.uploaded) {
        const iso = obj.uploaded.toISOString();
        if (!lastReceiptUploadedAt || iso > lastReceiptUploadedAt) {
          lastReceiptUploadedAt = iso;
        }
      }
    }

    const logsCount = logsRes.objects.length;
    const logsTotalBytes = logsRes.objects.reduce((sum, obj) => sum + (obj.size || 0), 0);

    const totalObjects = receiptsCount + logsCount;
    const totalStorageBytes = receiptsTotalBytes + logsTotalBytes;

    return {
      configured: true,
      bucket,
      receiptsCount,
      receiptsTotalBytes,
      receiptsFormattedSize: formatBytes(receiptsTotalBytes),
      lastReceiptUploadedAt,
      logsCount,
      logsTotalBytes,
      logsFormattedSize: formatBytes(logsTotalBytes),
      totalObjects,
      totalStorageBytes,
      totalFormattedSize: formatBytes(totalStorageBytes),
      lastCleanup: getLastCleanupResult(),
      timestamp: now,
    };
  } catch (error) {
    console.error("[R2] Failed to compile storage analytics:", error);
    return {
      configured: true,
      bucket,
      receiptsCount: 0,
      receiptsTotalBytes: 0,
      receiptsFormattedSize: "0 B",
      lastReceiptUploadedAt: null,
      logsCount: 0,
      logsTotalBytes: 0,
      logsFormattedSize: "0 B",
      totalObjects: 0,
      totalStorageBytes: 0,
      totalFormattedSize: "0 B",
      lastCleanup: getLastCleanupResult(),
      timestamp: now,
    };
  }
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
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
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
    const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MiB
    if (declaredSize > MAX_RECEIPT_BYTES) {
      console.warn(`[R2] Receipt rejected: declared size ${declaredSize} exceeds ${MAX_RECEIPT_BYTES}`);
      return null;
    }

    // 2. Download the file (size-bounded after download)
    const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!fileRes.ok) {
      console.warn(`[R2] Failed to download image from Telegram: ${fileRes.statusText}`);
      return null;
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_RECEIPT_BYTES) {
      console.warn(`[R2] Receipt rejected: actual size ${arrayBuffer.byteLength} exceeds ${MAX_RECEIPT_BYTES}`);
      return null;
    }

    // Validate magic bytes (JPEG / PNG / WebP / PDF only).
    const bytes = new Uint8Array(arrayBuffer);
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

    const stored = await putObject(env, key, arrayBuffer, mimeType);
    if (!stored) return null;

    // Never expose a public R2/object URL for receipts.
    // Always point at the authenticated Worker proxy (ADMIN_API_SECRET / session).
    const base = (env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    const r2Url = base
      ? `${base}/api/admin/receipts?key=${encodeURIComponent(key)}`
      : `/api/admin/receipts?key=${encodeURIComponent(key)}`;
    const fileSize = arrayBuffer.byteLength || fileInfo.result.file_size || 0;

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
