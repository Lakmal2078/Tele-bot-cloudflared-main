import type { Env } from "./types";
import { buildPublicUrl, getBucketName, isR2Configured, putObject } from "./storage";

export interface R2FileMetadata {
  r2Url: string;
  r2Key: string;
  bucket: string;
  fileSize: number;
  mimeType: string;
  telegramFilePath?: string;
  uploadedAt: string;
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

    // 2. Download the file
    const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!fileRes.ok) {
      console.warn(`[R2] Failed to download image from Telegram: ${fileRes.statusText}`);
      return null;
    }
    const arrayBuffer = await fileRes.arrayBuffer();

    // 3. Store in R2
    const extension = filePath.split(".").pop()?.toLowerCase() || "jpg";
    const key = `receipts/deposit_${depositId}_${Date.now()}.${extension}`;
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

    const r2Url = buildPublicUrl(env, key);
    const fileSize = arrayBuffer.byteLength || fileInfo.result.file_size || 0;

    console.log(`[R2] Receipt stored: ${r2Url} (${fileSize} bytes)`);
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
