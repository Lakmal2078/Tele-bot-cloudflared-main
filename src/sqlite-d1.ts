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
  private readonly rawDb: DatabaseSync;
  private readonly query: string;

  constructor(
    rawDb: DatabaseSync,
    query: string,
    initialValues: unknown[] = []
  ) {
    this.rawDb = rawDb;
    this.query = query;
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

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString: string | null = null;
  let inTrigger = false;
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1] || "";

    // Skip single-line comments
    if (!inString && char === "-" && nextChar === "-") {
      const lineEnd = sql.indexOf("\n", i);
      if (lineEnd === -1) break;
      i = lineEnd + 1;
      continue;
    }
    // Skip multi-line comments
    if (!inString && char === "/" && nextChar === "*") {
      const blockEnd = sql.indexOf("*/", i + 2);
      if (blockEnd === -1) break;
      i = blockEnd + 2;
      continue;
    }

    // String literals
    if (char === "'" || char === '"' || char === "`") {
      if (inString === char) {
        if (nextChar === char) {
          current += char + nextChar;
          i += 2;
          continue;
        }
        inString = null;
      } else if (!inString) {
        inString = char;
      }
    }

    if (!inString) {
      const remaining = sql.slice(i);
      if (!inTrigger && /^\bBEGIN\b/i.test(remaining)) {
        inTrigger = true;
      } else if (inTrigger && /^\bEND\s*;/i.test(remaining)) {
        inTrigger = false;
      }

      if (char === ";" && !inTrigger) {
        const stmt = current.trim();
        if (stmt.length > 0) {
          statements.push(stmt);
        }
        current = "";
        i++;
        continue;
      }
    }

    current += char;
    i++;
  }

  const remainingStmt = current.trim();
  if (remainingStmt.length > 0) {
    statements.push(remainingStmt);
  }

  return statements;
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
        // Ensure standard D1 migration tracking table exists
        rawDb.exec(`
          CREATE TABLE IF NOT EXISTS d1_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Check which migrations have already been recorded
        const appliedRows = rawDb.prepare("SELECT name FROM d1_migrations").all() as { name: string }[];
        const appliedSet = new Set(appliedRows.map((r) => r.name));

        const files = fs
          .readdirSync(migrationsDir)
          .filter((f) => f.endsWith(".sql"))
          .sort();

        for (const file of files) {
          if (appliedSet.has(file)) {
            continue;
          }

          const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
          const statements = splitSqlStatements(sql);

          for (const stmt of statements) {
            try {
              rawDb.exec(stmt);
            } catch (err: any) {
              // Gracefully handle duplicate columns when bootstrapping existing databases
              if (err?.message && err.message.toLowerCase().includes("duplicate column name")) {
                continue;
              }
              throw err;
            }
          }

          rawDb.prepare("INSERT OR IGNORE INTO d1_migrations (name) VALUES (?)").run(file);
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
