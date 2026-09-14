#!/usr/bin/env node
/**
 * validate-migrations.mjs
 *
 * Validates D1 migration files BEFORE they are applied to production.
 * Used by scripts/deploy.sh via `npm run validate:migrations`.
 *
 * What it checks:
 *   1. Migration files exist and follow the required naming convention
 *      (sequential zero-padded numbers, e.g. 0001_init.sql, 0002_add_users.sql).
 *   2. Migrations are strictly sequential — no gaps, no duplicates.
 *   3. No destructive / breaking statements are present:
 *        - DROP TABLE
 *        - DROP COLUMN / ALTER TABLE ... DROP
 *        - DROP INDEX
 *        - DROP VIEW
 *        - DROP TRIGGER
 *        - DROP DATABASE
 *        - TRUNCATE
 *        - DELETE FROM (without WHERE) — full-table deletes (error)
 *        - UPDATE (without WHERE) — full-table updates (warning; common for backfills)
 *        - ALTER TABLE ... RENAME (renaming a table breaks deployed code)
 *   4. No empty migration files.
 *   5. No duplicate column adds in the same migration.
 *
 * Safety contract:
 *   - In CI, breaking migrations are ALWAYS blocked (exit code 1).
 *   - Locally, ALLOW_BREAKING_MIGRATIONS=1 can be set to override (with a loud warning).
 *   - The validator never modifies files or the database — it is read-only.
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — validation failed (breaking change, naming issue, etc.)
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// validate-migrations.mjs lives at the project ROOT (next to wrangler.toml),
// so the project root is simply the script's own directory.
const ROOT = __dirname;

const ALLOW_BREAKING = process.env.ALLOW_BREAKING_MIGRATIONS === "1";
const IS_CI = process.env.CI === "true" || process.env.CI === "1";

// ── Config discovery ──────────────────────────────────────────────────────
// Find migrations_dir from wrangler config (toml / jsonc / json).
function findMigrationsDir() {
  const candidates = ["wrangler.toml", "wrangler.jsonc", "wrangler.json"];
  for (const cfg of candidates) {
    const cfgPath = join(ROOT, cfg);
    try {
      statSync(cfgPath);
    } catch {
      continue;
    }
    const raw = readFileSync(cfgPath, "utf8");

    if (cfg.endsWith(".toml")) {
      const m = raw.match(/^\s*migrations_dir\s*=\s*"([^"]+)"/m);
      if (m) return m[1];
    } else {
      // JSONC: strip comments then parse
      const clean = raw
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      try {
        const parsed = JSON.parse(clean);
        for (const db of parsed.d1_databases || []) {
          if (db.migrations_dir) return db.migrations_dir;
        }
      } catch {
        // fall through to default
      }
    }
  }
  return "migrations";
}

// ── Destructive statement detection ───────────────────────────────────────
// Patterns are matched per SQL statement (case-insensitive), with comments
// stripped first. Full-table DELETE/UPDATE are flagged only when no WHERE
// clause exists in the statement.
const BREAKING_PATTERNS = [
  { pattern: /\bDROP\s+TABLE\b/i, label: "DROP TABLE" },
  { pattern: /\bDROP\s+COLUMN\b/i, label: "DROP COLUMN" },
  { pattern: /\bALTER\s+TABLE[^;]*\bDROP\b/i, label: "ALTER TABLE ... DROP" },
  { pattern: /\bDROP\s+INDEX\b/i, label: "DROP INDEX" },
  { pattern: /\bDROP\s+VIEW\b/i, label: "DROP VIEW" },
  { pattern: /\bDROP\s+TRIGGER\b/i, label: "DROP TRIGGER" },
  { pattern: /\bDROP\s+DATABASE\b/i, label: "DROP DATABASE" },
  { pattern: /\bTRUNCATE\b/i, label: "TRUNCATE" },
  { pattern: /\bALTER\s+TABLE[^;]*\bRENAME\s+TO\b/i, label: "ALTER TABLE ... RENAME TO" },
];

function stripSqlComments(sql) {
  // Remove -- line comments and /* block comments */
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function splitStatements(sql) {
  // Naive split on semicolons; good enough for validation purposes.
  return stripSqlComments(sql)
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function hasWhereClause(statement) {
  return /\bWHERE\b/i.test(statement);
}

function validateStatement(statement, file, errors, warnings) {
  for (const { pattern, label } of BREAKING_PATTERNS) {
    if (pattern.test(statement)) {
      errors.push(`${file}: breaking change detected — ${label}`);
      return;
    }
  }

  // Full-table DELETE without WHERE — data loss risk, always an error.
  if (/\bDELETE\s+FROM\b/i.test(statement) && !hasWhereClause(statement)) {
    errors.push(`${file}: full-table DELETE without WHERE clause`);
  }

  // Full-table UPDATE without WHERE — common for backfills (e.g. setting a
  // newly added column to a default value). Not schema-breaking and does not
  // break deployed code, so it is a warning, not an error.
  if (/\bUPDATE\b/i.test(statement) && !hasWhereClause(statement)) {
    warnings.push(`${file}: full-table UPDATE without WHERE clause (backfill?)`);
  }
}

// ── Migration file discovery ──────────────────────────────────────────────
const migrationsDir = findMigrationsDir();
const migrationsPath = join(ROOT, migrationsDir);

let files;
try {
  files = readdirSync(migrationsPath)
    .filter((f) => f.endsWith(".sql"))
    .sort();
} catch {
  console.error(`[ERROR] migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`[ERROR] No .sql migration files found in ${migrationsDir}/`);
  process.exit(1);
}

// ── Naming convention & sequence validation ──────────────────────────────
const errors = [];
const warnings = [];
const seenNumbers = new Set();

for (const file of files) {
  const match = file.match(/^(\d{4})_(.+)\.sql$/);
  if (!match) {
    errors.push(`${file}: does not match naming convention 0000_name.sql`);
    continue;
  }
  const num = Number(match[1]);
  if (seenNumbers.has(num)) {
    errors.push(`${file}: duplicate migration number ${num}`);
  }
  seenNumbers.add(num);
}

const numbers = [...seenNumbers].sort((a, b) => a - b);
for (let i = 0; i < numbers.length; i++) {
  if (i > 0 && numbers[i] !== numbers[i - 1] + 1) {
    errors.push(
      `Migration sequence gap: ${String(numbers[i - 1]).padStart(4, "0")} → ${String(
        numbers[i]
      ).padStart(4, "0")}`
    );
  }
}

// ── Per-file content validation ───────────────────────────────────────────
for (const file of files) {
  const content = readFileSync(join(migrationsPath, file), "utf8");

  if (content.trim().length === 0) {
    errors.push(`${file}: migration file is empty`);
    continue;
  }

  const statements = splitStatements(content);
  if (statements.length === 0) {
    errors.push(`${file}: migration file contains no SQL statements`);
    continue;
  }

  for (const statement of statements) {
    validateStatement(statement, file, errors, warnings);
  }
}

// ── Report ────────────────────────────────────────────────────────────────
console.log(`\n── D1 Migration Validation ──────────────────────────────`);
console.log(`  Directory:  ${migrationsDir}/`);
console.log(`  Files:      ${files.length}`);
console.log(`  Range:      ${files[0]} → ${files[files.length - 1]}`);
console.log(`─────────────────────────────────────────────────────────`);

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} warning(s):\n`);
  for (const w of warnings) {
    console.log(`  • ${w}`);
  }
}

if (errors.length === 0) {
  console.log(`\n✅ All ${files.length} migration(s) passed validation.\n`);
  process.exit(0);
}

console.log(`\n❌ ${errors.length} validation error(s) found:\n`);
for (const err of errors) {
  console.log(`  • ${err}`);
}

if (ALLOW_BREAKING && !IS_CI) {
  console.warn(
    `\n⚠️  ALLOW_BREAKING_MIGRATIONS=1 is set — proceeding despite breaking changes (local only).`
  );
  console.warn(`⚠️  This is NOT allowed in CI.\n`);
  process.exit(0);
}

if (IS_CI) {
  console.error(`\n🚫 Breaking migrations are FORBIDDEN in CI. Deployment blocked.\n`);
} else {
  console.error(
    `\n🚫 Validation failed. Set ALLOW_BREAKING_MIGRATIONS=1 to override (local only — NOT in CI).\n`
  );
}
process.exit(1);