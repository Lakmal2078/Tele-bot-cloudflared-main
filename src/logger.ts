import { isR2Configured, putObject } from "./storage";
import type { Env } from "./types";

export type TransactionCategory = "DEPOSIT" | "WITHDRAWAL";
export type TransactionAction = "CREATED" | "APPROVED" | "REJECTED";

export interface TransactionAuditData {
  category: TransactionCategory;
  action: TransactionAction;
  transactionId: number | string;
  userId: number;
  username?: string | null;
  playerId: string;
  amount: number;
  currency?: string;
  method: string;
  status: string;
  performedBy?: {
    adminId?: number;
    adminUsername?: string | null;
  };
  details?: Record<string, unknown>;
}

export interface TransactionAuditRecord extends TransactionAuditData {
  type: "TRANSACTION_AUDIT";
  eventId: string;
  timestamp: string;
  colomboTime: string;
  currency: string;
}

export interface BotErrorData {
  severity?: "ERROR" | "WARN" | "CRITICAL";
  source: string;
  message: string;
  stack?: string;
  errorDetails?: unknown;
  context?: {
    updateId?: number;
    userId?: number;
    username?: string | null;
    chatId?: number;
    flow?: string;
    payload?: unknown;
  };
}

export interface BotErrorRecord extends BotErrorData {
  type: "BOT_ERROR";
  eventId: string;
  timestamp: string;
  colomboTime: string;
  severity: "ERROR" | "WARN" | "CRITICAL";
}

function generateEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getColomboTime(date: Date = new Date()): string {
  try {
    return date.toLocaleString("si-LK", {
      timeZone: "Asia/Colombo",
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return date.toISOString();
  }
}

function getDateFolder(date: Date = new Date()): { year: string; month: string; day: string } {
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
}

/**
 * Captures structured transaction events and persists them to Cloudflare R2
 * under logs/transactions/YYYY/MM/DD/ for compliance, auditing, and ledger tracking.
 */
export async function logTransactionAudit(
  env: Env,
  data: TransactionAuditData,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<string | null> {
  const now = new Date();
  const eventId = generateEventId();
  const { year, month, day } = getDateFolder(now);

  const fullRecord: TransactionAuditRecord = {
    type: "TRANSACTION_AUDIT",
    eventId,
    timestamp: now.toISOString(),
    colomboTime: getColomboTime(now),
    currency: data.currency || "LKR",
    ...data,
  };

  // Structured console log for local / container monitoring
  console.log(
    `[AUDIT_TRANSACTION] ${fullRecord.category} ${fullRecord.action} #${fullRecord.transactionId} ` +
      `User:${fullRecord.userId} Player:${fullRecord.playerId} LKR:${fullRecord.amount} Method:${fullRecord.method}`
  );

  if (!isR2Configured(env)) {
    return null;
  }

  const key = `logs/transactions/${year}/${month}/${day}/tx_${data.category.toLowerCase()}_${data.transactionId}_${data.action.toLowerCase()}_${Date.now()}.json`;

  const uploadTask = (async () => {
    try {
      await putObject(env, key, JSON.stringify(fullRecord, null, 2), "application/json; charset=utf-8");
      return key;
    } catch (err) {
      console.error(`[R2 Logger] Failed to upload transaction audit log ${key}:`, err);
      return null;
    }
  })();

  if (waitUntil) {
    waitUntil(uploadTask);
  } else {
    uploadTask.catch(() => {});
  }

  return key;
}

/**
 * Captures structured bot errors and system faults, persisting them to Cloudflare R2
 * under logs/errors/YYYY/MM/DD/ for rapid debugging, RCA, and alerting.
 */
export async function logBotError(
  env: Env,
  data: BotErrorData,
  waitUntil?: (promise: Promise<unknown>) => void
): Promise<string | null> {
  const now = new Date();
  const eventId = generateEventId();
  const { year, month, day } = getDateFolder(now);

  const fullRecord: BotErrorRecord = {
    type: "BOT_ERROR",
    eventId,
    timestamp: now.toISOString(),
    colomboTime: getColomboTime(now),
    severity: data.severity || "ERROR",
    ...data,
  };

  // Structured error log for local / container monitoring
  console.error(
    `[AUDIT_ERROR] Source:${fullRecord.source} Severity:${fullRecord.severity} ` +
      `User:${fullRecord.context?.userId || "N/A"} Message:${fullRecord.message}`
  );

  if (!isR2Configured(env)) {
    return null;
  }

  const key = `logs/errors/${year}/${month}/${day}/err_${Date.now()}_${eventId.slice(0, 8)}.json`;

  const uploadTask = (async () => {
    try {
      await putObject(env, key, JSON.stringify(fullRecord, null, 2), "application/json; charset=utf-8");
      return key;
    } catch (err) {
      console.error(`[R2 Logger] Failed to upload error audit log ${key}:`, err);
      return null;
    }
  })();

  if (waitUntil) {
    waitUntil(uploadTask);
  } else {
    uploadTask.catch(() => {});
  }

  return key;
}
