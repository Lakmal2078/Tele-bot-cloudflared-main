/**
 * Utility functions for Telegram Bot formatting and safety
 */

/**
 * Escapes characters for Telegram Markdown (V1 / legacy).
 * Characters that break parse_mode Markdown: _, *, `, [
 * Always apply to any user-controlled or external string before embedding
 * in a Markdown message.
 */
export function escapeMarkdown(text: string | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text).replace(/([_*`[\]])/g, "\\$1");
}

/**
 * Sanitizes input for use inside inline code blocks (`...`).
 * Replaces backticks with single quotes to prevent breaking the code delimiter.
 */
export function escapeCode(text: string | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text).replace(/`/g, "'");
}

/**
 * Escape for Telegram MarkdownV2 (stricter). Use when parse_mode is MarkdownV2.
 * @see https://core.telegram.org/bots/api#markdownv2-style
 *
 * Character class avoids unnecessary escapes that trip eslint no-useless-escape
 * (e.g. `[` does not need backslash inside `[]`).
 */
export function escapeMarkdownV2(text: string | null | undefined): string {
  if (text === null || text === undefined) return "";
  // MarkdownV2 special chars: _ * [ ] ( ) ~ ` > # + - = | { } . ! \
  return String(text).replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");
}

export interface TransactionLimits {
  min: number;
  max: number;
}

export type TransactionAmountValidationError = "INVALID_FORMAT" | "BELOW_MIN" | "ABOVE_MAX";

export type TransactionAmountValidationResult =
  | { valid: true; amount: number; error: null; min: number; max: number }
  | { valid: false; amount: number | null; error: TransactionAmountValidationError; min: number; max: number };

/**
 * Extracts and normalizes transaction minimum and maximum thresholds from environment variables.
 * Defaults to 1,000 LKR minimum and 100,000 LKR maximum if unset or invalid.
 */
export function getTransactionLimits(env?: {
  MIN_TRANSACTION_LKR?: string | number | null;
  MAX_TRANSACTION_LKR?: string | number | null;
}): TransactionLimits {
  const parseVal = (v: string | number | null | undefined): number => {
    if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : NaN;
    if (!v) return NaN;
    const cleaned = String(v).replace(/,/g, "").trim();
    const num = parseFloat(cleaned);
    return Number.isFinite(num) && num > 0 ? num : NaN;
  };

  const parsedMin = parseVal(env?.MIN_TRANSACTION_LKR);
  const parsedMax = parseVal(env?.MAX_TRANSACTION_LKR);

  const min = !isNaN(parsedMin) ? parsedMin : 1000;
  const max = !isNaN(parsedMax) && parsedMax >= min ? parsedMax : Math.max(100000, min);

  return { min, max };
}

/**
 * Validates transaction amounts entered by users in Telegram bot conversations or callbacks.
 * Enforces:
 * 1. Strict positive numeric input with optional 1-2 decimal places (cents)
 * 2. Amount >= MIN_TRANSACTION_LKR
 * 3. Amount <= MAX_TRANSACTION_LKR
 */
export function validateTransactionAmount(
  rawInput: string | number | null | undefined,
  min: number,
  max: number
): TransactionAmountValidationResult {
  if (rawInput === null || rawInput === undefined) {
    return { valid: false, amount: null, error: "INVALID_FORMAT", min, max };
  }

  let cleaned: string;
  if (typeof rawInput === "number") {
    if (!Number.isFinite(rawInput) || isNaN(rawInput) || rawInput <= 0) {
      return { valid: false, amount: null, error: "INVALID_FORMAT", min, max };
    }
    cleaned = rawInput.toString();
  } else {
    cleaned = String(rawInput).trim();
    if (!cleaned) {
      return { valid: false, amount: null, error: "INVALID_FORMAT", min, max };
    }

    // Strip optional currency prefixes / suffixes like LKR, Rs, Rs., /-
    cleaned = cleaned
      .replace(/^(lkr|rs\.?)\s*/i, "")
      .replace(/\s*(lkr|rs\.?|\/-)$/i, "")
      .trim();

    // Remove commas (e.g. 10,000 -> 10000)
    cleaned = cleaned.replace(/,/g, "");
  }

  // Enforce positive number format: digits followed by optional 1 or 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { valid: false, amount: null, error: "INVALID_FORMAT", min, max };
  }

  const amount = parseFloat(cleaned);
  if (!Number.isFinite(amount) || isNaN(amount) || amount <= 0) {
    return { valid: false, amount: null, error: "INVALID_FORMAT", min, max };
  }

  // Rounded to 2 decimal places
  const normalizedAmount = Math.round(amount * 100) / 100;

  if (normalizedAmount < min) {
    return { valid: false, amount: normalizedAmount, error: "BELOW_MIN", min, max };
  }

  if (normalizedAmount > max) {
    return { valid: false, amount: normalizedAmount, error: "ABOVE_MAX", min, max };
  }

  return { valid: true, amount: normalizedAmount, error: null, min, max };
}
