#!/usr/bin/env node

const apiKey = process.env.ODDS_API_KEY?.trim();
const requested = (process.env.TIPS_SPORTS || "soccer_epl,basketball_nba,auto:cricket,auto:table_tennis,auto:esports")
  .split(",").map((value) => value.trim()).filter(Boolean);
const MIN_REMAINING = Number(process.env.TIPS_MIN_REMAINING_CREDITS || "50");
const TEST_ODDS = process.env.CHECK_ODDS !== "0";

if (!apiKey) {
  console.error("[tips-provider] ODDS_API_KEY is not set.");
  process.exit(2);
}

function headersOf(response) {
  return {
    remaining: Number(response.headers.get("x-requests-remaining")),
    used: Number(response.headers.get("x-requests-used")),
    last: Number(response.headers.get("x-requests-last")),
  };
}

function printUsage(label, usage) {
  console.log(`[tips-provider] ${label} usage: remaining=${Number.isFinite(usage.remaining) ? usage.remaining : "unknown"}, used=${Number.isFinite(usage.used) ? usage.used : "unknown"}, last=${Number.isFinite(usage.last) ? usage.last : "unknown"}`);
}

function groupOf(sport) {
  const haystack = `${sport.key} ${sport.group || ""} ${sport.title || ""} ${sport.description || ""}`.toLowerCase();
  if (haystack.includes("cricket")) return "cricket";
  if (haystack.includes("table tennis") || haystack.includes("table_tennis") || haystack.includes("table-tennis")) return "table_tennis";
  if (haystack.includes("esport") || /(^|[._-])(cs2|csgo|dota2|valorant|lol)([._-]|$)/.test(haystack)) return "esports";
  return null;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    const body = await response.text();
    return { response, body, usage: headersOf(response) };
  } finally {
    clearTimeout(timeout);
  }
}

try {
  const sportsUrl = new URL("https://api.the-odds-api.com/v4/sports");
  sportsUrl.searchParams.set("apiKey", apiKey);
  const sportsResult = await fetchJson(sportsUrl);
  printUsage("/sports (quota-free discovery)", sportsResult.usage);
  if (!sportsResult.response.ok) {
    console.error(`[tips-provider] /sports failed: HTTP ${sportsResult.response.status}`);
    console.error(sportsResult.body.slice(0, 500));
    process.exit(1);
  }

  const sports = JSON.parse(sportsResult.body);
  if (!Array.isArray(sports)) throw new Error("Unexpected /sports response format");
  const active = sports.filter((sport) => sport && sport.key && sport.active !== false);
  console.log(`[tips-provider] /sports OK — ${active.length} active feed(s)`);

  const special = { cricket: [], table_tennis: [], esports: [] };
  for (const sport of active) {
    const group = groupOf(sport);
    if (group) special[group].push(sport);
  }
  for (const group of Object.keys(special)) {
    const feeds = special[group];
    console.log(`  ${group}: ${feeds.length} active feed(s)`);
    for (const feed of feeds.slice(0, 5)) console.log(`    - ${feed.key} | ${feed.title || feed.key}`);
  }

  const explicit = requested.filter((sport) => !sport.startsWith("auto:"));
  for (const key of explicit) {
    console.log(`  explicit: ${key} -> ${active.some((sport) => sport.key === key) ? "ACTIVE" : "NOT ACTIVE / NOT FOUND"}`);
  }

  if (!TEST_ODDS) {
    console.log("[tips-provider] CHECK_ODDS=0; live odds request skipped.");
    process.exit(0);
  }

  const remaining = sportsResult.usage.remaining;
  if (Number.isFinite(remaining) && remaining <= MIN_REMAINING) {
    throw new Error(`Credit guard: only ${remaining} credit(s) remain; refusing live odds test below safety floor ${MIN_REMAINING}.`);
  }

  const testFeed = explicit.find((key) => active.some((sport) => sport.key === key)) || active.find((sport) => groupOf(sport) === "cricket")?.key || active[0]?.key;
  if (!testFeed) throw new Error("No active sport feed available for live odds response test");

  const oddsUrl = new URL(`https://api.the-odds-api.com/v4/sports/${encodeURIComponent(testFeed)}/odds`);
  oddsUrl.searchParams.set("apiKey", apiKey);
  oddsUrl.searchParams.set("regions", process.env.TIPS_ODDS_REGIONS?.split(",")[0]?.trim() || "eu");
  oddsUrl.searchParams.set("markets", "h2h");
  oddsUrl.searchParams.set("oddsFormat", "decimal");
  oddsUrl.searchParams.set("dateFormat", "iso");

  console.log(`[tips-provider] Live odds test: ${testFeed} (1 market x 1 region; maximum 1 paid request)`);
  const oddsResult = await fetchJson(oddsUrl);
  printUsage(`/odds/${testFeed}`, oddsResult.usage);

  if (!oddsResult.response.ok) {
    console.error(`[tips-provider] live odds failed: HTTP ${oddsResult.response.status}`);
    console.error(oddsResult.body.slice(0, 500));
    process.exit(1);
  }

  const events = JSON.parse(oddsResult.body);
  if (!Array.isArray(events)) throw new Error("Unexpected /odds response format");
  console.log(`[tips-provider] LIVE RESPONSE OK — ${events.length} event(s) returned.`);
  if (events[0]) {
    console.log(`  sample: ${events[0].home_team} vs ${events[0].away_team}`);
    console.log(`  sport: ${events[0].sport_title || events[0].sport_key}`);
    console.log(`  commence: ${events[0].commence_time}`);
    console.log(`  bookmakers: ${events[0].bookmakers?.length || 0}`);
  }

  if (Number.isFinite(oddsResult.usage.remaining) && oddsResult.usage.remaining <= MIN_REMAINING) {
    console.warn(`[tips-provider] Safety floor reached after live test: ${oddsResult.usage.remaining} credit(s) remain.`);
  }
} catch (error) {
  console.error("[tips-provider] check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
