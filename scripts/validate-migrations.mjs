#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dir = path.join(root, 'migrations');
const allowBreaking = process.env.ALLOW_BREAKING_MIGRATIONS === '1';

if (!fs.existsSync(dir)) {
  console.error('[migration] migrations/ directory is missing.');
  process.exit(1);
}

const files = fs.readdirSync(dir)
  .filter((name) => name.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b, 'en'));

if (files.length === 0) {
  console.error('[migration] No .sql migration files found.');
  process.exit(1);
}

const numbers = [];
const breaking = [];

for (const file of files) {
  const match = /^(\d+)_([a-z0-9][a-z0-9_-]*)\.sql$/.exec(file);
  if (!match) {
    console.error(`[migration] Invalid filename: ${file}`);
    console.error('[migration] Expected: <number>_<description>.sql');
    process.exit(1);
  }

  const number = Number(match[1]);
  if (!Number.isSafeInteger(number)) {
    console.error(`[migration] Invalid migration number: ${file}`);
    process.exit(1);
  }
  if (numbers.includes(number)) {
    console.error(`[migration] Duplicate migration number: ${number}`);
    process.exit(1);
  }
  numbers.push(number);

  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  const normalized = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').toUpperCase();

  const patterns = [
    /\bDROP\s+(TABLE|COLUMN|INDEX|VIEW|TRIGGER)\b/,
    /\bALTER\s+TABLE\b[\s\S]*\bDROP\s+COLUMN\b/,
    /\bALTER\s+TABLE\b[\s\S]*\bRENAME\s+(TO|COLUMN)\b/
  ];

  if (patterns.some((pattern) => pattern.test(normalized))) {
    breaking.push(file);
  }
}

numbers.sort((a, b) => a - b);
for (let i = 1; i < numbers.length; i += 1) {
  if (numbers[i] === numbers[i - 1]) {
    console.error(`[migration] Duplicate migration number: ${numbers[i]}`);
    process.exit(1);
  }
}

if (breaking.length > 0 && !allowBreaking) {
  console.error('[migration] Potentially breaking migration(s) detected:');
  for (const file of breaking) console.error(`  - ${file}`);
  console.error('[migration] Production migrations must be backward-compatible by default.');
  console.error('[migration] If a coordinated breaking migration is intentional, run with ALLOW_BREAKING_MIGRATIONS=1 after a reviewed rollout plan.');
  process.exit(1);
}

console.log(`[migration] Validated ${files.length} migration file(s): ${files.join(', ')}`);
if (breaking.length > 0) {
  console.warn(`[migration] WARNING: ${breaking.length} breaking migration(s) explicitly allowed.`);
}
