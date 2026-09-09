import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { D1Database, D1PreparedStatement } from "./types";

function normalizeParam(v: any): any {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v;
}

export function createD1Database(dbPath: string = ":memory:"): D1Database {
  try {
    if (dbPath !== ":memory:" && typeof fs?.existsSync === "function" && typeof fs?.mkdirSync === "function") {
      const dir = path.dirname(path.resolve(dbPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  } catch (fsErr) {
    console.warn("Notice: Local filesystem not available, using in-memory mode:", fsErr);
    dbPath = ":memory:";
  }

  let sqlite: any;
  try {
    sqlite = new DatabaseSync(dbPath);
    sqlite.exec("PRAGMA foreign_keys = ON;");
  } catch (dbErr) {
    console.warn("Notice: DatabaseSync initialization skipped (expected on Cloudflare Worker runtime):", dbErr);
    return {
      prepare(query: string): D1PreparedStatement {
        return {
          bind: () => this.prepare(query),
          first: async () => null,
          all: async () => ({ results: [], success: true }),
          run: async () => ({ success: true }),
        };
      },
      exec: () => {},
      batch: async () => [],
    };
  }

  try {
    if (typeof fs?.existsSync === "function" && typeof fs?.readFileSync === "function") {
      const schemaPath = path.resolve(process.cwd(), "schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf-8");
        sqlite.exec(schemaSql);
      }
    }
  } catch (err) {
    console.warn("Notice: Failed to execute schema.sql:", err);
  }

  const migrations = [
    "ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'si';",
    "ALTER TABLE deposits ADD COLUMN payment_method TEXT DEFAULT 'BANK';",
    "ALTER TABLE deposits ADD COLUMN r2_url TEXT;",
    "ALTER TABLE withdrawals ADD COLUMN payment_method TEXT DEFAULT 'BANK';",
    "ALTER TABLE withdrawals ADD COLUMN destination_account TEXT;",
    "ALTER TABLE deposits ADD COLUMN deleted_at TEXT;",
    "ALTER TABLE withdrawals ADD COLUMN deleted_at TEXT;",
  ];
  for (const m of migrations) {
    try {
      sqlite.exec(m);
    } catch {}
  }

  function createPreparedStatement(sql: string, params: any[] = []): D1PreparedStatement {
    return {
      bind(...values: any[]): D1PreparedStatement {
        return createPreparedStatement(sql, values);
      },
      async first<T = unknown>(colName?: string): Promise<T | null> {
        try {
          const stmt = sqlite.prepare(sql);
          const normalized = params.map(normalizeParam);
          const row = stmt.get(...normalized) as any;
          if (!row) return null;
          if (colName) return row[colName] ?? null;
          return row as T;
        } catch (err) {
          console.error("D1 first query error:", sql, err);
          return null;
        }
      },
      async all<T = unknown>(): Promise<{ results: T[]; success: boolean }> {
        try {
          const stmt = sqlite.prepare(sql);
          const normalized = params.map(normalizeParam);
          const rows = stmt.all(...normalized) as T[];
          return { results: rows || [], success: true };
        } catch (err) {
          console.error("D1 all query error:", sql, err);
          return { results: [], success: false };
        }
      },
      async run(): Promise<{ success: boolean; meta?: any }> {
        try {
          const stmt = sqlite.prepare(sql);
          const normalized = params.map(normalizeParam);
          const info = stmt.run(...normalized);
          return { success: true, meta: info };
        } catch (err) {
          console.error("D1 run query error:", sql, err);
          return { success: false };
        }
      },
    };
  }

  return {
    prepare(query: string): D1PreparedStatement {
      return createPreparedStatement(query, []);
    },
    exec(query: string) {
      return sqlite.exec(query);
    },
    async batch(statements: D1PreparedStatement[]): Promise<any[]> {
      try {
        sqlite.exec("BEGIN IMMEDIATE");
        const results: any[] = [];
        for (const stmt of statements) {
          const runRes = await stmt.run();
          results.push(runRes);
        }
        sqlite.exec("COMMIT");
        return results;
      } catch (err) {
        try {
          sqlite.exec("ROLLBACK");
        } catch {}
        console.error("D1 batch (local) error:", err);
        throw err;
      }
    },
  };
}
