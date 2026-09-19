/**
 * D1-backed session storage adapter for grammY session middleware.
 *
 * Long-term migration path from the custom `user_state` table FSM to
 * `bot.use(session({ storage: createD1SessionStorage(env.DB) }))`.
 *
 * Cloudflare Workers must not use in-memory session stores (isolate-local only).
 * This adapter persists JSON session data in D1 with the same TTL semantics
 * as `cleanupStaleUserStates` / `getUserState`.
 *
 * Usage (when ready to migrate handlers):
 * ```ts
 * import { session } from "grammy";
 * import { createD1SessionStorage } from "./sessionStorage";
 *
 * bot.use(
 *   session({
 *     initial: () => ({}),
 *     storage: createD1SessionStorage(env.DB),
 *   })
 * );
 * ```
 */

import type { StorageAdapter } from "grammy";
import type { D1Database } from "./types";

/** Default session TTL (hours) — keep in sync with user_state cleanup. */
const DEFAULT_SESSION_TTL_HOURS = 24;

export interface D1SessionStorageOptions {
  /** Max age of a session row in hours (default: 24). */
  ttlHours?: number;
  /** Optional table name override (default: bot_sessions). */
  table?: string;
}

/**
 * Creates a grammY-compatible StorageAdapter backed by Cloudflare D1.
 * Expects a table created by migrations (see migrations for bot_sessions).
 */
export function createD1SessionStorage<T>(
  db: D1Database,
  options: D1SessionStorageOptions = {}
): StorageAdapter<T> {
  const ttlHours = options.ttlHours ?? DEFAULT_SESSION_TTL_HOURS;
  const table = options.table ?? "bot_sessions";

  return {
    async read(key: string): Promise<T | undefined> {
      const row = await db
        .prepare(
          `SELECT data, updated_at FROM ${table} WHERE session_key = ?`
        )
        .bind(key)
        .first<{ data: string; updated_at: string }>();

      if (!row) return undefined;

      if (row.updated_at) {
        const updatedMs = Date.parse(
          row.updated_at.includes("T") || row.updated_at.endsWith("Z")
            ? row.updated_at
            : row.updated_at.replace(" ", "T") + "Z"
        );
        if (Number.isFinite(updatedMs)) {
          const maxAgeMs = ttlHours * 60 * 60 * 1000;
          if (Date.now() - updatedMs > maxAgeMs) {
            await db.prepare(`DELETE FROM ${table} WHERE session_key = ?`).bind(key).run();
            return undefined;
          }
        }
      }

      try {
        return JSON.parse(row.data) as T;
      } catch {
        return undefined;
      }
    },

    async write(key: string, value: T): Promise<void> {
      await db
        .prepare(
          `INSERT INTO ${table} (session_key, data, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(session_key) DO UPDATE SET
             data = excluded.data,
             updated_at = datetime('now')`
        )
        .bind(key, JSON.stringify(value))
        .run();
    },

    async delete(key: string): Promise<void> {
      await db.prepare(`DELETE FROM ${table} WHERE session_key = ?`).bind(key).run();
    },
  };
}
