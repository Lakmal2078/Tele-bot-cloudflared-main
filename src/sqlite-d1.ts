import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { D1Database, D1PreparedStatement } from "./types";

function normalizeBindValue(value: unknown): string | number | bigint | null | Uint8Array {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string" || typeof value === "bigint") return value;
  if (value instanceof Uint8Array) return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

class NodeD1PreparedStatement implements D1PreparedStatement {
  private boundValues: unknown[] = [];

  constructor(
    private readonly rawDb: DatabaseSync,
    private readonly query: string,
    initialValues: unknown[] = []
  ) {
    this.boundValues = [...initialValues];
  }

  bind(...values: unknown[]): D1PreparedStatement {
    return new NodeD1PreparedStatement(this.rawDb, this.query, values);
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    try {
      const stmt = this.rawDb.prepare(this.query);
      const normalized = this.boundValues.map(normalizeBindValue);
      const row = stmt.get(...(normalized as any[])) as Record<string, unknown> | undefined;
      if (!row) return null;
      if (colName) {
        return (row[colName] as T) ?? null;
      }
      return row as T;
    } catch (err) {
      console.error(`[SQLite-D1] Query error in first() for query "${this.query}":`, err);
      throw err;
    }
  }

  async all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta?: any }> {
    try {
      const stmt = this.rawDb.prepare(this.query);
      const normalized = this.boundValues.map(normalizeBindValue);
      const rows = stmt.all(...(normalized as any[])) as T[];
      return {
        results: rows,
        success: true,
        meta: { changes: 0 },
      };
    } catch (err) {
      console.error(`[SQLite-D1] Query error in all() for query "${this.query}":`, err);
      throw err;
    }
  }

  async run(): Promise<{ success: boolean; results?: any[]; meta?: any }> {
    try {
      const stmt = this.rawDb.prepare(this.query);
      const normalized = this.boundValues.map(normalizeBindValue);
      const hasReturning = /RETURNING/i.test(this.query);
      if (hasReturning) {
        const rows = stmt.all(...(normalized as any[])) as Record<string, unknown>[];
        const lastRowId = rows.length > 0 && typeof rows[0]?.id === "number" ? rows[0].id : 0;
        return {
          success: true,
          results: rows,
          meta: {
            changes: rows.length,
            last_row_id: lastRowId,
          },
        };
      }
      const result = stmt.run(...(normalized as any[]));
      return {
        success: true,
        results: [],
        meta: {
          changes: result.changes,
          last_row_id: Number(result.lastInsertRowid),
        },
      };
    } catch (err) {
      console.error(`[SQLite-D1] Query error in run() for query "${this.query}":`, err);
      throw err;
    }
  }
}

export function createD1Database(dbPath?: string, autoMigrate = true): D1Database {
  let targetPath = dbPath || ":memory:";
  if (targetPath !== ":memory:") {
    const resolved = path.resolve(targetPath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    targetPath = resolved;
  }

  const rawDb = new DatabaseSync(targetPath);
  rawDb.exec("PRAGMA journal_mode = WAL;");
  rawDb.exec("PRAGMA foreign_keys = ON;");

  if (autoMigrate) {
    try {
      const migrationsDir = path.resolve(process.cwd(), "migrations");
      if (fs.existsSync(migrationsDir)) {
        const files = fs
          .readdirSync(migrationsDir)
          .filter((f) => f.endsWith(".sql"))
          .sort();
        for (const file of files) {
          const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
          rawDb.exec(sql);
        }
      }
    } catch (migErr) {
      console.error("[SQLite-D1] Error applying migrations:", migErr);
    }
  }

  return {
    prepare(query: string): D1PreparedStatement {
      return new NodeD1PreparedStatement(rawDb, query);
    },
    exec(query: string): any {
      return rawDb.exec(query);
    },
    async batch(statements: D1PreparedStatement[]): Promise<any[]> {
      const results: any[] = [];
      rawDb.exec("BEGIN TRANSACTION;");
      try {
        for (const s of statements) {
          const res = await s.run();
          results.push(res);
        }
        rawDb.exec("COMMIT;");
        return results;
      } catch (err) {
        rawDb.exec("ROLLBACK;");
        throw err;
      }
    },
  };
}
