#!/usr/bin/env node
/**
 * scan-env.mjs
 *
 * Scans existing environment variables in .env, validates format and integrity,
 * detects missing mandatory and recommended keys, and provides an interactive
 * or automated prompt to easily fill them in.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import crypto from "node:crypto";

const ENV_FILE = path.resolve(process.cwd(), ".env");
const ENV_EXAMPLE_FILE = path.resolve(process.cwd(), ".env.example");

// Colors for terminal formatting
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

/**
 * Key definitions with categories, validation logic, and generation capabilities
 */
export const KEY_DEFINITIONS = [
  // ── CORE MANDATORY BOT KEYS ──
  {
    key: "BOT_TOKEN",
    category: "Core Telegram",
    mandatory: true,
    description: "Telegram Bot Token from @BotFather (e.g. 1234567890:ABCdef...)",
    validate: (val) => {
      if (!val || val.trim().length === 0) return "Missing required Bot Token";
      if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(val.trim())) {
        return "Invalid format. Expected format: <numeric_bot_id>:<token_secret>";
      }
      return null;
    },
  },
  {
    key: "BOT_USERNAME",
    category: "Core Telegram",
    mandatory: false,
    description: "Telegram Bot Username (e.g. fast_1xbetcash_bot)",
    defaultVal: "fast_1xbetcash_bot",
    validate: (val) => {
      if (!val || val.trim().length === 0) return null;
      if (!/^[A-Za-z0-9_]{5,32}$/.test(val.replace(/^@/, "").trim())) {
        return "Must be 5-32 alphanumeric characters and underscores";
      }
      return null;
    },
  },
  {
    key: "ADMIN_IDS",
    category: "Core Telegram",
    mandatory: true,
    description: "Numeric Telegram IDs of Bot Admins (comma-separated, e.g. 7990858914)",
    validate: (val) => {
      if (!val || val.trim().length === 0) return "Missing admin Telegram ID(s)";
      const parts = val.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length === 0) return "At least one Telegram admin ID is required";
      for (const p of parts) {
        if (!/^\d+$/.test(p) || Number(p) <= 0) {
          return `Invalid ID "${p}". Must be positive numeric Telegram user ID`;
        }
      }
      return null;
    },
  },
  {
    key: "WEBHOOK_SECRET",
    category: "Core Security",
    mandatory: true,
    description: "Secret token for verifying incoming Telegram webhook requests (min 16 chars)",
    defaultGenerator: () => crypto.randomBytes(16).toString("hex"),
    validate: (val) => {
      if (!val || val.trim().length === 0) return "Missing WEBHOOK_SECRET";
      if (val.trim().length < 16) return `Must be at least 16 characters (current: ${val.trim().length})`;
      return null;
    },
  },
  {
    key: "CHANNEL_URL",
    category: "Channel & Community",
    mandatory: false, // either CHANNEL_URL or CHANNEL_USERNAME is required
    description: "Official Telegram Channel URL (e.g. https://t.me/fast_xbet_official_tips)",
    defaultVal: "https://t.me/fast_xbet_official_tips",
    validate: (val, env) => {
      const username = env.CHANNEL_USERNAME?.trim();
      const url = val?.trim();
      if (!url && !username) {
        return "Either CHANNEL_URL or CHANNEL_USERNAME must be provided";
      }
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        return "Must be a valid URL starting with https://";
      }
      return null;
    },
  },
  {
    key: "CHANNEL_USERNAME",
    category: "Channel & Community",
    mandatory: false,
    description: "Official Telegram Channel handle with @ (e.g. @fast_xbet_official_tips)",
    defaultVal: "@fast_xbet_official_tips",
  },
  {
    key: "ADMIN_API_SECRET",
    category: "Core Security",
    mandatory: false,
    description: "Secret token for authenticating Admin Web Panel API (min 24 chars)",
    defaultGenerator: () => crypto.randomBytes(32).toString("base64"),
    validate: (val) => {
      if (val && val.trim().length < 24) {
        return `Must be at least 24 characters (current: ${val.trim().length})`;
      }
      return null;
    },
  },

  // ── PAYMENT METHODS (At least 1 required) ──
  {
    key: "EZCASH_NUMBER",
    category: "Payment Methods",
    mandatory: false,
    description: "eZ Cash mobile wallet number (e.g. 0765865387)",
  },
  {
    key: "MCASH_NUMBER",
    category: "Payment Methods",
    mandatory: false,
    description: "mCash mobile wallet number (e.g. 0765865387)",
  },
  {
    key: "FRIMI_NUMBER",
    category: "Payment Methods",
    mandatory: false,
    description: "FriMi account / mobile number (e.g. 0765865387)",
  },
  {
    key: "IPAY_NUMBER",
    category: "Payment Methods",
    mandatory: false,
    description: "iPay account / mobile number (e.g. 0740452530)",
  },
  {
    key: "BANK_DETAILS",
    category: "Payment Methods",
    mandatory: false,
    description: "Bank transfer account details for deposits (optional)",
  },
  {
    key: "WHATSAPP_NUMBER",
    category: "Support & Contact",
    mandatory: false,
    description: "Customer support WhatsApp number with country code (e.g. 94776763093)",
  },

  // ── TRANSACTION LIMITS ──
  {
    key: "MIN_TRANSACTION_LKR",
    category: "Limits & Controls",
    mandatory: false,
    description: "Minimum deposit/withdrawal amount in LKR (default: 1000)",
    defaultVal: "1000",
    validate: (val) => {
      if (!val) return null;
      const num = Number(val);
      if (isNaN(num) || num <= 0) return "Must be a positive number";
      return null;
    },
  },
  {
    key: "MAX_TRANSACTION_LKR",
    category: "Limits & Controls",
    mandatory: false,
    description: "Maximum deposit/withdrawal amount in LKR (default: 500000)",
    defaultVal: "500000",
    validate: (val, env) => {
      if (!val) return null;
      const num = Number(val);
      if (isNaN(num) || num <= 0) return "Must be a positive number";
      const min = Number(env.MIN_TRANSACTION_LKR || 1000);
      if (num < min) return `Cannot be less than MIN_TRANSACTION_LKR (${min})`;
      return null;
    },
  },

  // ── 1XBET AFFILIATE SETTINGS ──
  {
    key: "XBET_LINK",
    category: "1xBet Affiliate",
    mandatory: false,
    description: "Your official 1xBet referral/affiliate registration link",
    defaultVal: "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622",
  },
  {
    key: "XBET_PROMO_CODE",
    category: "1xBet Affiliate",
    mandatory: false,
    description: "1xBet promotional bonus code for new users (e.g. VGSL)",
    defaultVal: "VGSL",
  },

  // ── AUTOMATED SPORTS TIPS ──
  {
    key: "ODDS_API_KEY",
    category: "Sports Betting Tips",
    mandatory: false,
    description: "The Odds API key for live real-time bookmaker odds (the-odds-api.com)",
  },
  {
    key: "TIPS_CHANNEL_ID",
    category: "Sports Betting Tips",
    mandatory: false,
    description: "Telegram Channel ID where automated tips are posted (e.g. -1004336999467)",
    validate: (val) => {
      if (!val) return null;
      if (val.includes("ID:") || val.includes("id:")) {
        return "Must only contain the numeric ID, remove 'ID:' prefix (e.g. -1004336999467)";
      }
      return null;
    },
  },
  {
    key: "TIPS_SPORTS",
    category: "Sports Betting Tips",
    mandatory: false,
    description: "Comma-separated sports feeds to fetch tips for",
    defaultVal: "soccer_epl,soccer_uefa_champs_league,basketball_nba,tennis_atp",
  },
  {
    key: "TIPS_ODDS_REGIONS",
    category: "Sports Betting Tips",
    mandatory: false,
    description: "Regions for bookmaker odds calculation (e.g. uk,eu)",
    defaultVal: "uk,eu",
  },
  {
    key: "TIPS_MIN_ODDS",
    category: "Sports Betting Tips",
    mandatory: false,
    description: "Minimum odds threshold for tip selection (e.g. 1.40)",
    defaultVal: "1.40",
  },
  {
    key: "TIPS_MAX_ODDS",
    category: "Sports Betting Tips",
    mandatory: false,
    description: "Maximum odds threshold for tip selection (e.g. 2.50)",
    defaultVal: "2.50",
  },
  {
    key: "TIPS_PER_SLOT",
    category: "Sports Betting Tips",
    mandatory: false,
    description: "Number of matches per tips post (1-5)",
    defaultVal: "3",
  },

  // ── CLOUDFLARE R2 STORAGE ──
  {
    key: "R2_ACCOUNT_ID",
    category: "Cloudflare R2 Media",
    mandatory: false,
    description: "Cloudflare Account ID for receipt image storage in R2",
  },
  {
    key: "R2_ACCESS_KEY_ID",
    category: "Cloudflare R2 Media",
    mandatory: false,
    description: "R2 API Access Key ID",
  },
  {
    key: "R2_SECRET_ACCESS_KEY",
    category: "Cloudflare R2 Media",
    mandatory: false,
    description: "R2 API Secret Access Key",
  },
  {
    key: "R2_BUCKET_NAME",
    category: "Cloudflare R2 Media",
    mandatory: false,
    description: "R2 Bucket name for storing chat media (default: chat-media)",
    defaultVal: "chat-media",
  },
  {
    key: "R2_PUBLIC_DOMAIN",
    category: "Cloudflare R2 Media",
    mandatory: false,
    description: "Public URL domain for viewing stored receipts (e.g. https://pub-...r2.dev)",
  },
];

/**
 * Parse a .env formatted string into an object and key order array
 */
export function parseEnvFile(content) {
  const env = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    // Strip wrapping quotes if present
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

/**
 * Serialize key-value pairs back to a clean .env format, preserving comments or grouping nicely
 */
export function serializeEnvFile(env) {
  const categories = {};
  const knownKeys = new Set();

  for (const def of KEY_DEFINITIONS) {
    knownKeys.add(def.key);
    categories[def.category] = categories[def.category] || [];
    categories[def.category].push({
      key: def.key,
      val: env[def.key] ?? "",
      description: def.description,
    });
  }

  // Handle any custom extra keys
  const extraKeys = [];
  for (const [k, v] of Object.entries(env)) {
    if (!knownKeys.has(k)) {
      extraKeys.push({ key: k, val: v });
    }
  }

  const outputLines = [];
  outputLines.push("# ====================================================================");
  outputLines.push("# 1xBet Fast Cash Telegram Bot Environment Configuration");
  outputLines.push(`# Last scanned & updated: ${new Date().toISOString()}`);
  outputLines.push("# ====================================================================\n");

  for (const [catName, items] of Object.entries(categories)) {
    outputLines.push(`# ── ${catName.toUpperCase()} ──`);
    for (const item of items) {
      outputLines.push(`${item.key}=${item.val}`);
    }
    outputLines.push("");
  }

  if (extraKeys.length > 0) {
    outputLines.push("# ── CUSTOM / OTHER VARIABLES ──");
    for (const item of extraKeys) {
      outputLines.push(`${item.key}=${item.val}`);
    }
    outputLines.push("");
  }

  return outputLines.join("\n");
}

/**
 * Scan env object and return diagnostic results
 */
export function scanEnvironment(env) {
  const results = {
    valid: true,
    items: [],
    missingMandatory: [],
    formatIssues: [],
    paymentCheckPassed: false,
  };

  // 1. Check channel linkage (at least one)
  const hasChannel = Boolean(env.CHANNEL_URL?.trim() || env.CHANNEL_USERNAME?.trim());

  // 2. Check payment methods (at least one)
  const hasPayment = Boolean(
    env.BANK_DETAILS?.trim() ||
    env.EZCASH_NUMBER?.trim() ||
    env.MCASH_NUMBER?.trim() ||
    env.FRIMI_NUMBER?.trim() ||
    env.IPAY_NUMBER?.trim() ||
    env.WHATSAPP_NUMBER?.trim() ||
    env.DEPOSIT_INSTRUCTIONS?.trim()
  );
  results.paymentCheckPassed = hasPayment;

  for (const def of KEY_DEFINITIONS) {
    const rawVal = env[def.key];
    const val = typeof rawVal === "string" ? rawVal.trim() : "";
    const isSet = val.length > 0;

    let status = "ok"; // "ok" | "missing_mandatory" | "format_error" | "optional_unset"
    let message = "";

    if (def.mandatory && !isSet) {
      status = "missing_mandatory";
      message = "Mandatory key is missing or empty";
      results.missingMandatory.push({ key: def.key, def, message });
      results.valid = false;
    } else if (isSet && def.validate) {
      const err = def.validate(val, env);
      if (err) {
        status = "format_error";
        message = err;
        results.formatIssues.push({ key: def.key, def, val, message });
        results.valid = false;
      }
    } else if (!isSet) {
      status = "optional_unset";
    }

    results.items.push({
      key: def.key,
      category: def.category,
      mandatory: def.mandatory,
      isSet,
      val,
      status,
      message,
      description: def.description,
      defaultGenerator: def.defaultGenerator,
      defaultVal: def.defaultVal,
    });
  }

  // Check channel constraint
  if (!hasChannel) {
    results.valid = false;
    results.missingMandatory.push({
      key: "CHANNEL_URL",
      def: KEY_DEFINITIONS.find((d) => d.key === "CHANNEL_URL"),
      message: "At least one Telegram Channel link (CHANNEL_URL or CHANNEL_USERNAME) must be set",
    });
  }

  // Check payment constraint
  if (!hasPayment) {
    results.valid = false;
    results.missingMandatory.push({
      key: "EZCASH_NUMBER",
      def: KEY_DEFINITIONS.find((d) => d.key === "EZCASH_NUMBER"),
      message: "At least one deposit payment method (e.g. EZCASH_NUMBER, FRIMI_NUMBER, IPAY_NUMBER) must be configured",
    });
  }

  return results;
}

/**
 * Print formatted diagnostic report
 */
export function printScanReport(scanResults) {
  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan} 🔍  1xBet Fast Cash - Environment Variables Scan Report        ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}\n`);

  let currentCat = "";
  for (const item of scanResults.items) {
    if (item.category !== currentCat) {
      currentCat = item.category;
      console.log(`${c.bold}${c.blue}── ${currentCat.toUpperCase()} ──${c.reset}`);
    }

    if (item.status === "ok") {
      const displayVal =
        item.key.includes("TOKEN") || item.key.includes("SECRET") || item.key.includes("KEY")
          ? item.val.length > 8
            ? `${item.val.slice(0, 4)}...${item.val.slice(-4)}`
            : "••••••••"
          : item.val;
      console.log(`  ${c.green}✅ ${item.key.padEnd(22)}${c.reset} : ${c.dim}${displayVal}${c.reset}`);
    } else if (item.status === "missing_mandatory") {
      console.log(`  ${c.red}❌ ${item.key.padEnd(22)}${c.reset} : ${c.red}${c.bold}MISSING (MANDATORY)${c.reset} - ${item.message}`);
    } else if (item.status === "format_error") {
      console.log(`  ${c.yellow}⚠️  ${item.key.padEnd(22)}${c.reset} : ${c.yellow}${c.bold}FORMAT ISSUE${c.reset} - ${item.message}`);
    } else {
      console.log(`  ${c.dim}⚪ ${item.key.padEnd(22)} : [Not configured (optional)]${c.reset}`);
    }
  }

  console.log("");
  if (!scanResults.paymentCheckPassed) {
    console.log(`  ${c.red}❌ PAYMENT METHODS ERROR:${c.reset} No payment method configured (EZCASH_NUMBER, FRIMI_NUMBER, IPAY_NUMBER, BANK_DETAILS, etc.)`);
  }

  console.log(`\n${c.bold}Summary:${c.reset}`);
  if (scanResults.valid) {
    console.log(`  ${c.green}🎉 All mandatory environment variables are properly configured and valid!${c.reset}\n`);
  } else {
    console.log(`  ${c.red}❌ Found ${scanResults.missingMandatory.length} missing mandatory key(s) and ${scanResults.formatIssues.length} format issue(s).${c.reset}\n`);
  }
}

/**
 * Ask a question interactively via readline
 */
function askQuestion(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive prompt loop to fill in missing or invalid variables
 */
export async function promptToFillMissing(env, scanResults) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`${c.bold}${c.magenta}────────────────────────────────────────────────────────────────${c.reset}`);
  console.log(`${c.bold}${c.magenta} ✍️  Interactive Environment Setup - Fill in Missing Keys       ${c.reset}`);
  console.log(`${c.bold}${c.magenta}────────────────────────────────────────────────────────────────${c.reset}`);
  console.log(`${c.dim}Press Enter without typing to keep the suggested/default value.${c.reset}\n`);

  const keysToPrompt = [];

  // 1. Prioritize missing mandatory keys and format issues
  for (const miss of scanResults.missingMandatory) {
    if (!keysToPrompt.some((k) => k.key === miss.key)) {
      keysToPrompt.push(miss.def || KEY_DEFINITIONS.find((d) => d.key === miss.key));
    }
  }

  for (const err of scanResults.formatIssues) {
    if (!keysToPrompt.some((k) => k.key === err.key)) {
      keysToPrompt.push(err.def || KEY_DEFINITIONS.find((d) => d.key === err.key));
    }
  }

  // If no critical issues, ask if the user wants to configure optional keys
  if (keysToPrompt.length === 0) {
    const askOptional = await askQuestion(
      rl,
      `${c.cyan}Do you want to review and configure any optional keys? [y/N]: ${c.reset}`
    );
    if (askOptional.toLowerCase() === "y") {
      for (const def of KEY_DEFINITIONS) {
        if (!env[def.key]) {
          keysToPrompt.push(def);
        }
      }
    }
  }

  if (keysToPrompt.length === 0) {
    console.log(`${c.green}No variables need prompting.${c.reset}`);
    rl.close();
    return env;
  }

  const updatedEnv = { ...env };

  for (const def of keysToPrompt) {
    if (!def) continue;

    console.log(`\n${c.bold}${c.yellow}👉 ${def.key}${c.reset} ${def.mandatory ? c.red + "[REQUIRED]" : c.dim + "[OPTIONAL]"}${c.reset}`);
    console.log(`   ${c.dim}${def.description}${c.reset}`);

    let suggested = "";
    if (typeof def.defaultGenerator === "function") {
      suggested = def.defaultGenerator();
      console.log(`   ${c.cyan}Generated default:${c.reset} ${suggested}`);
    } else if (def.defaultVal) {
      suggested = def.defaultVal;
      console.log(`   ${c.cyan}Default value:${c.reset} ${suggested}`);
    } else if (env[def.key]) {
      suggested = env[def.key];
      console.log(`   ${c.cyan}Current value:${c.reset} ${suggested}`);
    }

    let accepted = false;
    while (!accepted) {
      const answer = await askQuestion(
        rl,
        `   ${c.bold}Enter value for ${def.key}${suggested ? " (Enter for default)" : ""}: ${c.reset}`
      );

      let finalVal = answer || suggested;

      // Clean up common user input artifacts (like typing "ID: -10043...")
      if (def.key === "TIPS_CHANNEL_ID" && (finalVal.includes("ID:") || finalVal.includes("id:"))) {
        finalVal = finalVal.replace(/id:\s*/i, "").trim();
      }

      if (def.validate) {
        const error = def.validate(finalVal, updatedEnv);
        if (error) {
          console.log(`   ${c.red}⚠️  ${error}. Please try again.${c.reset}`);
          continue;
        }
      }

      if (finalVal) {
        updatedEnv[def.key] = finalVal;
        console.log(`   ${c.green}✓ ${def.key} set to: ${finalVal.length > 25 ? finalVal.slice(0, 10) + "..." : finalVal}${c.reset}`);
      } else if (!def.mandatory) {
        console.log(`   ${c.dim}Skipped.${c.reset}`);
      }

      accepted = true;
    }
  }

  rl.close();

  // Save changes to .env
  saveEnvToFile(updatedEnv);
  return updatedEnv;
}

/**
 * Backup and write new .env file
 */
export function saveEnvToFile(env) {
  const content = serializeEnvFile(env);

  if (fs.existsSync(ENV_FILE)) {
    const backupPath = `${ENV_FILE}.backup`;
    try {
      fs.copyFileSync(ENV_FILE, backupPath);
      console.log(`\n${c.dim}📦 Created backup at ${backupPath}${c.reset}`);
    } catch {
      // ignore backup error
    }
  }

  fs.writeFileSync(ENV_FILE, content, "utf8");
  console.log(`${c.bold}${c.green}💾 Saved updated environment variables to .env successfully!${c.reset}\n`);
}

/**
 * Main execution handler
 */
export async function main() {
  const args = process.argv.slice(2);
  const isCheckMode = args.includes("--check") || args.includes("-c");
  const isAutoGenerate = args.includes("--generate-secrets");
  const isNonInteractive = !process.stdin.isTTY || isCheckMode;

  let rawContent = "";
  if (fs.existsSync(ENV_FILE)) {
    rawContent = fs.readFileSync(ENV_FILE, "utf8");
  } else if (fs.existsSync(ENV_EXAMPLE_FILE)) {
    console.log(`${c.yellow}⚠️ .env not found. Loading template from .env.example...${c.reset}`);
    rawContent = fs.readFileSync(ENV_EXAMPLE_FILE, "utf8");
  }

  let env = parseEnvFile(rawContent);

  // If --generate-secrets flag is given, auto-fill any missing secrets
  if (isAutoGenerate) {
    if (!env.WEBHOOK_SECRET || env.WEBHOOK_SECRET.length < 16) {
      env.WEBHOOK_SECRET = crypto.randomBytes(16).toString("hex");
      console.log(`${c.green}✓ Generated secure WEBHOOK_SECRET${c.reset}`);
    }
    if (!env.ADMIN_API_SECRET || env.ADMIN_API_SECRET.length < 24) {
      env.ADMIN_API_SECRET = crypto.randomBytes(32).toString("base64");
      console.log(`${c.green}✓ Generated secure ADMIN_API_SECRET${c.reset}`);
    }
    saveEnvToFile(env);
  }

  const scanResults = scanEnvironment(env);
  printScanReport(scanResults);

  if (isCheckMode) {
    if (!scanResults.valid) {
      console.error(`${c.red}Scan failed: missing mandatory environment variables.${c.reset}`);
      process.exit(1);
    }
    console.log(`${c.green}Environment check passed.${c.reset}`);
    process.exit(0);
  }

  // In interactive terminal mode, offer to prompt for missing keys
  if (!isNonInteractive) {
    if (!scanResults.valid || args.includes("--fix")) {
      const updatedEnv = await promptToFillMissing(env, scanResults);
      const secondCheck = scanEnvironment(updatedEnv);
      if (secondCheck.valid) {
        console.log(`${c.bold}${c.green}✨ All required variables are now satisfied!${c.reset}`);
      }
    }
  } else if (!scanResults.valid) {
    console.log(`${c.yellow}Tip: Run "npm run env:fix" or "node scripts/scan-env.mjs" in an interactive terminal to enter missing values.${c.reset}`);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Fatal error during scan:", err);
    process.exit(1);
  });
}
