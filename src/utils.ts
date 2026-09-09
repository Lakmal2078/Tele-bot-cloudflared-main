/**
 * Utility functions for Telegram Bot formatting and safety
 */

/**
 * Escapes characters for Telegram Markdown (V1).
 * In Telegram Markdown V1, the following characters must be escaped: _, *, `, [
 */
export function escapeMarkdown(text: string | null | undefined): string {
  if (!text) return "";
  return String(text).replace(/([_*`\[])/g, "\\$1");
}

/**
 * Sanitizes input for use inside inline code blocks (`...`).
 * Replaces backticks with single quotes to prevent breaking the code delimiter.
 */
export function escapeCode(text: string | null | undefined): string {
  if (!text) return "";
  return String(text).replace(/`/g, "'");
}
