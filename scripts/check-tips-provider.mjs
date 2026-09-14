#!/usr/bin/env node

const apiKey = process.env.ODDS_API_KEY?.trim();
const requested = (process.env.TIPS_SPORTS || "soccer_epl,soccer_uefa_champs_league,basketball_nba,auto:cricket,auto:table_tennis,auto:esports")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!apiKey) {
  console.error("[tips-provider] ODDS_API_KEY is not set.");
  process.exit(2);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);

function groupOf(sport) {
  const haystack = `${sport.key} ${sport.group || ""} ${sport.title || ""} ${sport.description || ""}`.toLowerCase();
  if (haystack.includes("cricket")) return "cricket";
  if (haystack.includes("table tennis") || haystack.includes("table_tennis") || haystack.includes("table-tennis")) return "table_tennis";
  if (haystack.includes("esport") || /(^|[._-])(cs2|csgo|dota2|valorant|lol)([._-]|$)/.test(haystack)) return "esports";
  return null;
}

try {
  const url = new URL("https://api.the-odds-api.com/v4/sports");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: controller.signal,
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`[tips-provider] /sports failed: HTTP ${response.status}`);
    console.error(body.slice(0, 300));
    process.exit(1);
  }

  const sports = JSON.parse(body);
  if (!Array.isArray(sports)) throw new Error("Unexpected /sports response format");

  const active = sports.filter((sport) => sport && sport.key && sport.active !== false);
  const special = { cricket: [], table_tennis: [], esports: [] };
  for (const sport of active) {
    const group = groupOf(sport);
    if (group) special[group].push(sport);
  }

  console.log(`[tips-provider] /sports OK — ${active.length} active feed(s)`);

  for (const group of Object.keys(special)) {
    const feeds = special[group];
    console.log(`  ${group}: ${feeds.length} active feed(s)`);
    for (const feed of feeds.slice(0, 5)) {
      console.log(`    - ${feed.key} | ${feed.title || feed.key}`);
    }
  }

  const explicit = requested.filter((sport) => !sport.startsWith("auto:"));
  let failed = 0;
  for (const key of explicit) {
    const exists = active.some((sport) => sport.key === key);
    if (exists) console.log(`  explicit: ${key} -> ACTIVE`);
    else {
      console.warn(`  explicit: ${key} -> NOT ACTIVE / NOT FOUND`);
      failed += 1;
    }
  }

  const missingRequestedGroups = requested
    .filter((value) => value.startsWith("auto:"))
    .map((value) => value.slice(5))
    .filter((group) => !special[group]?.length);

  if (missingRequestedGroups.length) {
    console.warn(`  auto groups without active feeds: ${missingRequestedGroups.join(", ")}`);
  }

  if (failed > 0) process.exitCode = 1;
} catch (error) {
  console.error("[tips-provider] check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
