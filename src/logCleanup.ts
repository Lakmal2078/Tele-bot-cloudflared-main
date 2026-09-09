import { deleteObjects, isR2Configured, listObjects } from "./storage";
import type { Env } from "./types";

export interface CleanupResult {
  success: boolean;
  retentionDays: number;
  cutoffDate: string;
  totalScanned: number;
  totalDeleted: number;
  bytesFreed: number;
  errors: string[];
  durationMs: number;
  timestamp: string;
  message: string;
}

let lastCleanupResult: CleanupResult | null = null;
let isCleanupRunning = false;

export function getLastCleanupResult(): CleanupResult | null {
  return lastCleanupResult;
}

/**
 * Scans Cloudflare R2 bucket for audit logs and error logs under `logs/`
 * and permanently removes any objects older than retentionDays (default: 30 days).
 *
 * Designed to minimize Cloudflare R2 Class A (List) and Class B (Delete) operations,
 * optimize storage costs, and prevent infinite ledger accumulation.
 */
export async function cleanupOldR2Logs(
  env: Env,
  retentionDays: number = 30
): Promise<CleanupResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoffTime).toISOString();

  if (isCleanupRunning) {
    return {
      success: false,
      retentionDays,
      cutoffDate,
      totalScanned: 0,
      totalDeleted: 0,
      bytesFreed: 0,
      errors: ["Cleanup task is already running in background."],
      durationMs: 0,
      timestamp,
      message: "Cleanup task is already in progress.",
    };
  }

  if (!isR2Configured(env)) {
    const res: CleanupResult = {
      success: false,
      retentionDays,
      cutoffDate,
      totalScanned: 0,
      totalDeleted: 0,
      bytesFreed: 0,
      errors: ["R2 bucket binding (CHAT_MEDIA) or S3 credentials not configured."],
      durationMs: Date.now() - startTime,
      timestamp,
      message: "Cloudflare R2 is not configured. No logs deleted.",
    };
    lastCleanupResult = res;
    return res;
  }

  isCleanupRunning = true;
  let totalScanned = 0;
  let totalDeleted = 0;
  let bytesFreed = 0;
  const errors: string[] = [];

  try {
    console.log(
      `[R2 Cleanup] Starting log retention cleanup (retention: ${retentionDays} days, cutoff: ${cutoffDate})...`
    );

    let cursor: string | undefined = undefined;
    let truncated = true;

    while (truncated) {
      const page = await listObjects(env, "logs/", cursor);
      totalScanned += page.objects.length;

      const toDelete: { key: string; size: number }[] = [];

      for (const item of page.objects) {
        if (!item.key) continue;

        let isOld = false;
        if (item.uploaded && item.uploaded.getTime() < cutoffTime) {
          isOld = true;
        } else {
          // Fallback: parse date from key: logs/(transactions|errors)/YYYY/MM/DD/
          const match = item.key.match(/logs\/(?:transactions|errors)\/(\d{4})\/(\d{2})\/(\d{2})\//);
          if (match) {
            const [, y, m, d] = match;
            const keyDate = new Date(`${y}-${m}-${d}T00:00:00Z`);
            if (!isNaN(keyDate.getTime()) && keyDate.getTime() < cutoffTime) {
              isOld = true;
            }
          }
        }

        if (isOld) toDelete.push({ key: item.key, size: item.size });
      }

      if (toDelete.length > 0) {
        const failedKeys = await deleteObjects(env, toDelete.map((o) => o.key));
        const failedSet = new Set(failedKeys);
        for (const key of failedKeys) errors.push(`Failed to delete ${key}`);
        for (const obj of toDelete) {
          if (!failedSet.has(obj.key)) {
            totalDeleted++;
            bytesFreed += obj.size;
          }
        }
      }

      truncated = page.truncated;
      cursor = page.cursor;
      if (!cursor) truncated = false;
    }

    const durationMs = Date.now() - startTime;
    const kbFreed = (bytesFreed / 1024).toFixed(2);
    console.log(
      `[R2 Cleanup] Task completed in ${durationMs}ms: Scanned ${totalScanned} objects, deleted ${totalDeleted} old logs, freed ${kbFreed} KB.`
    );

    const result: CleanupResult = {
      success: errors.length === 0,
      retentionDays,
      cutoffDate,
      totalScanned,
      totalDeleted,
      bytesFreed,
      errors,
      durationMs,
      timestamp,
      message: `Deleted ${totalDeleted} logs older than ${retentionDays} days, freed ${kbFreed} KB.`,
    };

    lastCleanupResult = result;
    return result;
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const msg = err?.message || String(err);
    console.error("[R2 Cleanup] Error executing log cleanup:", err);
    errors.push(msg);

    const result: CleanupResult = {
      success: false,
      retentionDays,
      cutoffDate,
      totalScanned,
      totalDeleted,
      bytesFreed,
      errors,
      durationMs,
      timestamp,
      message: `Cleanup encountered an error: ${msg}`,
    };

    lastCleanupResult = result;
    return result;
  } finally {
    isCleanupRunning = false;
  }
}
