import type { Env } from "./types";
import { getTipQualityConfig, type TipQualityConfig } from "./config";
import { escapeMarkdown, escapeCode } from "./utils";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
export const TIPS_CRONS = {
  SL_0800: "30 2 * * *",
  SL_1200: "30 6 * * *",
  SL_1800: "30 12 * * *",
  SETTLEMENT: "15 * * * *",
} as const;

export const SLOT_CRONS: ReadonlySet<string> = new Set<string>([
  TIPS_CRONS.SL_0800,
  TIPS_CRONS.SL_1200,
  TIPS_CRONS.SL_1800,
]);
const TIP_LEASE_MINUTES = 15;
const ODDS_API_RETRIES = 2;
const DEFAULT_TIPS_PER_SLOT = 3;
const MAX_ODDS_FEEDS_PER_SLOT = 6;
const MIN_REMAINING_CREDITS = 50;
const MAX_DISCOVERED_SPORTS_PER_GROUP = 3;

interface OddsOutcome { name: string; price: number; }
interface OddsMarket { key: string; outcomes: OddsOutcome[]; }
interface OddsBookmaker { key: string; title: string; markets: OddsMarket[]; }
interface OddsEvent { id: string; sport_key: string; sport_title: string; commence_time: string; home_team: string; away_team: string; bookmakers: OddsBookmaker[]; }
interface OddsSport { key: string; group?: string; title?: string; description?: string; active?: boolean; }

export interface TipCandidate {
  event: OddsEvent;
  selection: string;
  market: string;
  bestPrice?: number;
  consensusProbability?: number;
  valueScore?: number;
  bookmakerCount: number;
  confidence?: "High" | "Medium" | "Low";
  /** @deprecated retained for existing consumers while they migrate. */
  averageOdds?: number;
  /** @deprecated retained for existing consumers while they migrate. */
  impliedProbability?: number;
  sportGroup: string;
  emoji: string;
}
export interface PostedTipSummary { eventId: string; sportKey: string; sportTitle: string; homeTeam: string; awayTeam: string; commenceTime: string; selection: string; market: string; odds: number; bookmakerCount: number; marketProbability: number; }

function csv(value: string | undefined, fallback: string): string[] { return (value || fallback).split(",").map((item) => item.trim()).filter(Boolean); }
function _escapeHtml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function decimalPrice(price: number): number { return Number.isFinite(price) && price > 1 ? price : 0; }
function sportMeta(sportKey: string, title: string): { group: string; emoji: string } { const key = `${sportKey} ${title}`.toLowerCase(); if (key.includes("cricket")) return { group: "cricket", emoji: "🏏" }; if (key.includes("soccer") || key.includes("football")) return { group: "football", emoji: "⚽" }; if (key.includes("basketball")) return { group: "basketball", emoji: "🏀" }; if (key.includes("table") && key.includes("tennis")) return { group: "table_tennis", emoji: "🏓" }; if (key.includes("esport") || key.includes("cs2") || key.includes("dota") || key.includes("valorant")) return { group: "esports", emoji: "🎮" }; if (key.includes("tennis")) return { group: "tennis", emoji: "🎾" }; return { group: sportKey, emoji: "🏆" }; }
function median(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
function confidenceFor(probability: number): TipCandidate["confidence"] { return probability >= 0.70 ? "High" : probability >= 0.60 ? "Medium" : "Low"; }

export function chooseCandidates(
  events: OddsEvent[], minOdds: number, maxOdds: number, limit = DEFAULT_TIPS_PER_SLOT,
  minBookmakers: number | undefined = undefined, excludeEventIds: ReadonlySet<string> = new Set(), quality: Partial<TipQualityConfig> = {}
): TipCandidate[] {
  const qualityMode = Object.keys(quality).length > 0;
  const effectiveMinBookmakers = minBookmakers ?? 2;
  const thresholds: TipQualityConfig = qualityMode
    ? { minConsensus: 0.55, minValue: 0.02, minBookmakers: effectiveMinBookmakers, maxStaleHours: 24, ...quality }
    : { minConsensus: 0, minValue: -Infinity, minBookmakers: effectiveMinBookmakers, maxStaleHours: 72 };
  const candidates: TipCandidate[] = [];
  for (const event of events) {
    if (!event.id || excludeEventIds.has(event.id)) continue;
    const start = new Date(event.commence_time).getTime();
    if (!event.commence_time || !Number.isFinite(start) || (qualityMode && (start <= Date.now() || start > Date.now() + thresholds.maxStaleHours * 3600000))) continue;
    const meta = sportMeta(event.sport_key, event.sport_title);
    const marketRows: Array<{ prices: Map<string, number>; fair: Map<string, number> }> = [];
    for (const bookmaker of event.bookmakers || []) {
      const market = (bookmaker.markets || []).find((item) => item.key === "h2h");
      const valid = (market?.outcomes || []).map((outcome) => ({ name: outcome.name, price: decimalPrice(Number(outcome.price)) })).filter((outcome) => outcome.price > 0);
      if (!market || valid.length < (qualityMode ? 2 : 1)) continue;
      const overround = valid.reduce((sum, outcome) => sum + 1 / outcome.price, 0);
      const prices = new Map(valid.map((outcome) => [outcome.name, outcome.price]));
      const fair = new Map(valid.map((outcome) => [outcome.name, (1 / outcome.price) / overround]));
      marketRows.push({ prices, fair });
    }
    const selections = new Set(marketRows.flatMap((row) => [...row.prices.keys()]));
    for (const selection of selections) {
      const prices = marketRows.map((row) => row.prices.get(selection)).filter((value): value is number => value !== undefined);
      const fairProbabilities = marketRows.map((row) => row.fair.get(selection)).filter((value): value is number => value !== undefined);
      const bookmakerCount = prices.length;
      if (bookmakerCount < thresholds.minBookmakers || fairProbabilities.length < thresholds.minBookmakers) continue;
      const consensusProbability = median(fairProbabilities);
      const bestPrice = Math.max(...prices);
      const valueScore = consensusProbability * bestPrice - 1;
      if (consensusProbability < thresholds.minConsensus || (qualityMode && (consensusProbability > 0.95 || consensusProbability < 0.05))) continue;
      if (bestPrice < minOdds || bestPrice > maxOdds || valueScore < thresholds.minValue) continue;
      candidates.push({ event, selection, market: "h2h", bestPrice, consensusProbability, valueScore, bookmakerCount, confidence: confidenceFor(consensusProbability), averageOdds: prices.reduce((sum, price) => sum + price, 0) / prices.length, impliedProbability: fairProbabilities.reduce((sum, probability) => sum + probability, 0) / fairProbabilities.length, sportGroup: meta.group, emoji: meta.emoji });
    }
  }
  candidates.sort((a, b) => qualityMode
    ? (b.valueScore ?? 0) - (a.valueScore ?? 0) || (b.consensusProbability ?? 0) - (a.consensusProbability ?? 0) || b.bookmakerCount - a.bookmakerCount || (a.bestPrice ?? 0) - (b.bestPrice ?? 0)
    : (a.averageOdds ?? a.bestPrice ?? 0) - (b.averageOdds ?? b.bestPrice ?? 0));
  const selected: TipCandidate[] = [];
  const usedSports = new Set<string>(); const usedEvents = new Set<string>();
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (usedSports.has(candidate.sportGroup) || usedEvents.has(candidate.event.id)) continue;
    selected.push(candidate); usedSports.add(candidate.sportGroup); usedEvents.add(candidate.event.id);
  }
  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (usedEvents.has(candidate.event.id)) continue;
    selected.push(candidate); usedEvents.add(candidate.event.id);
  }
  return selected;
}

export function chooseCandidate(events: OddsEvent[], minOdds: number, maxOdds: number, excludeEventIds?: ReadonlySet<string>): TipCandidate | null { return chooseCandidates(events, minOdds, maxOdds, 1, 2, excludeEventIds)[0] || null; }
function retryDelayMs(attempt: number, retryAfter: string | null): number { const retrySeconds = retryAfter ? Number(retryAfter) : NaN; if (Number.isFinite(retrySeconds) && retrySeconds >= 0) return Math.min(retrySeconds * 1000, 5000); return Math.min(500 * 2 ** attempt, 4000); }

class OddsCreditGuard {
  private paidRequestAttempts = 0;
  private remaining: number | null = null;
  private usedFromHeader: number | null = null;
  private readonly maxPaidRequests: number;
  private readonly minRemaining: number;

  constructor(maxPaidRequests: number, minRemaining: number) {
    this.maxPaidRequests = maxPaidRequests;
    this.minRemaining = minRemaining;
  }

  update(response: Response): void {
    const remaining = Number(response.headers.get("x-requests-remaining"));
    if (Number.isFinite(remaining)) this.remaining = remaining;
    const used = Number(response.headers.get("x-requests-used"));
    if (Number.isFinite(used)) this.usedFromHeader = used;
  }

  beforePaidRequest(): void {
    if (this.paidRequestAttempts >= this.maxPaidRequests) {
      throw new Error(`Odds API credit guard stopped further paid requests after ${this.maxPaidRequests} request(s)`);
    }
    if (this.remaining !== null && this.remaining <= this.minRemaining) {
      throw new Error(`Odds API credit guard stopped paid requests: ${this.remaining} credit(s) remaining (minimum ${this.minRemaining})`);
    }
    this.paidRequestAttempts += 1;
  }

  snapshot(): { paidRequestAttempts: number; remaining: number | null; usedFromHeader: number | null } {
    return { paidRequestAttempts: this.paidRequestAttempts, remaining: this.remaining, usedFromHeader: this.usedFromHeader };
  }
}

async function getJson<T>(url: URL, timeoutMs: number, guard?: OddsCreditGuard, countAsPaidRequest = false): Promise<T> {
  for (let attempt = 0; attempt <= ODDS_API_RETRIES; attempt += 1) {
    if (guard && countAsPaidRequest) guard.beforePaidRequest();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal });
      if (guard) guard.update(response);
      const text = await response.text();
      if (response.ok) return JSON.parse(text) as T;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === ODDS_API_RETRIES) throw new Error(`Odds API ${response.status}: ${text.slice(0, 300)}`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, response.headers.get("Retry-After"))));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Odds API request failed after retries");
}

export function slotForCron(cron: string): "08:00" | "12:00" | "18:00" | null { if (cron === "30 2 * * *") return "08:00"; if (cron === "30 6 * * *") return "12:00"; if (cron === "30 12 * * *") return "18:00"; return null; }
export function sriLankaDate(date = new Date()): string { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date); const get = (type: string) => parts.find((part) => part.type === type)?.value || "00"; return `${get("year")}-${get("month")}-${get("day")}`; }
function tipCount(env: Env): number { const parsed = Number(env.TIPS_PER_SLOT || DEFAULT_TIPS_PER_SLOT); return Number.isInteger(parsed) && parsed >= 3 && parsed <= 5 ? parsed : DEFAULT_TIPS_PER_SLOT; }
function sportMatchesGroup(sport: OddsSport, group: string): boolean { const haystack = `${sport.key} ${sport.group || ""} ${sport.title || ""} ${sport.description || ""}`.toLowerCase(); if (group === "table_tennis") return haystack.includes("table tennis") || haystack.includes("table_tennis") || haystack.includes("table-tennis"); if (group === "esports") return haystack.includes("esport") || /(^|[._-])(cs2|csgo|dota2|valorant|lol)([._-]|$)/.test(haystack); if (group === "cricket") return haystack.includes("cricket"); return false; }

async function discoverSpecialSports(apiKey: string, requested: string[], guard: OddsCreditGuard): Promise<string[]> {
  const autoGroups = requested.filter((value) => value.startsWith("auto:")).map((value) => value.slice(5).toLowerCase());
  if (autoGroups.length === 0) return [];
  const url = new URL(`${ODDS_API_BASE}/sports`);
  url.searchParams.set("apiKey", apiKey);
  const sports = await getJson<OddsSport[]>(url, 8000, guard, false);
  const discovered: string[] = [];
  for (const group of autoGroups) {
    let added = 0;
    for (const sport of sports) {
      if (!sport.key || sport.active === false || !sportMatchesGroup(sport, group)) continue;
      if (!discovered.includes(sport.key)) discovered.push(sport.key);
      added += 1;
      if (added >= MAX_DISCOVERED_SPORTS_PER_GROUP) break;
    }
    console.log(`[Tips] Auto-discovery ${group}: ${added} active sport feed(s)`);
  }
  return discovered;
}

function selectPaidFeeds(explicitSports: string[], discoveredSports: string[], maxFeeds: number): string[] {
  const selected: string[] = [];
  const add = (sport: string) => {
    if (!sport || selected.includes(sport) || selected.length >= maxFeeds) return;
    selected.push(sport);
  };

  for (const sport of explicitSports) add(sport);
  for (const sport of discoveredSports) add(sport);

  return selected;
}

/**
 * Retrieves the set of event IDs already posted today to prevent repeating
 * the same match across morning, noon, and evening slots.
 */
export async function getTodayPostedEventIds(env: Env): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!env.DB) return ids;

  try {
    const rows = await env.DB.prepare(`
      SELECT event_id, tips_json
      FROM tip_posts
      WHERE status = 'POSTED'
        AND (date(created_at) = date('now') OR (posted_at IS NOT NULL AND date(posted_at) = date('now')))
    `).all<{ event_id: string | null; tips_json: string | null }>();

    for (const r of rows.results || []) {
      if (r.event_id) ids.add(r.event_id);
      if (r.tips_json) {
        try {
          const payload = JSON.parse(r.tips_json);
          if (Array.isArray(payload)) {
            for (const item of payload) {
              const id = item.eventId || item.event_id;
              if (id) ids.add(id);
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn("[Tips] Failed to fetch today's posted event IDs:", err);
  }

  return ids;
}

export const getTodaysPostedEventIds = getTodayPostedEventIds;

async function fetchCandidates(env: Env): Promise<TipCandidate[]> {
  if (!env.ODDS_API_KEY) throw new Error("ODDS_API_KEY is not configured");

  const defaultSports =
    "soccer_epl,soccer_uefa_champs_league,soccer_spain_la_liga,soccer_italy_serie_a,soccer_germany_bundesliga,basketball_nba,tennis_atp,auto:table_tennis,auto:esports";
  const requested = csv(env.TIPS_SPORTS, defaultSports);
  const explicitSports = requested.filter((sport) => !sport.startsWith("auto:"));
  // Free-plan safe: honour TIPS_MAX_FEEDS (default 3). Cap at MAX_ODDS_FEEDS_PER_SLOT.
  const parsedMaxFeeds = Number(env.TIPS_MAX_FEEDS || 3);
  const maxFeeds = Math.min(
    MAX_ODDS_FEEDS_PER_SLOT,
    Math.max(1, Number.isFinite(parsedMaxFeeds) ? Math.floor(parsedMaxFeeds) : 3),
  );
  const guard = new OddsCreditGuard(maxFeeds, MIN_REMAINING_CREDITS);

  let discovered: string[] = [];
  try {
    discovered = await discoverSpecialSports(env.ODDS_API_KEY, requested, guard);
  } catch (error) {
    console.warn("[Tips] Special-sport discovery failed:", error instanceof Error ? error.message : error);
  }

  const sports = selectPaidFeeds(explicitSports, discovered, maxFeeds);
  if (sports.length === 0) throw new Error("No configured or discovered sport feeds are available");

  const regions = (env.TIPS_ODDS_REGIONS || "eu").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 1).join(",") || "eu";
  const minOdds = Number(env.TIPS_MIN_ODDS || "1.40");
  const maxOdds = Number(env.TIPS_MAX_ODDS || "2.50");
  const hoursAhead = Math.max(2, Number(env.TIPS_HOURS_AHEAD || "48"));
  const quality = getTipQualityConfig(env);
  const targetCount = Math.max(3, tipCount(env));

  const allEvents: OddsEvent[] = [];

  for (const sport of sports) {
    try {
      const url = new URL(`${ODDS_API_BASE}/sports/${encodeURIComponent(sport)}/odds`);
      url.searchParams.set("apiKey", env.ODDS_API_KEY);
      url.searchParams.set("regions", regions);
      url.searchParams.set("markets", "h2h");
      url.searchParams.set("oddsFormat", "decimal");
      url.searchParams.set("dateFormat", "iso");
      const events = await getJson<OddsEvent[]>(url, 8000, guard, true);
      const now = Date.now();
      const filtered = events.filter((event) => {
        const start = new Date(event.commence_time).getTime();
        return Number.isFinite(start) && start > now && start <= now + Math.max(hoursAhead, 72) * 60 * 60 * 1000;
      });
      allEvents.push(...filtered);
      console.log(`[Tips] ${sport}: ${filtered.length} upcoming event(s)`);
    } catch (error) {
      console.warn(`[Tips] Sport feed failed for ${sport}:`, error instanceof Error ? error.message : error);
      if (String(error).includes("credit guard")) break;
    }
  }

  const eventMap = new Map<string, OddsEvent>();
  for (const ev of allEvents) {
    if (!eventMap.has(ev.id)) eventMap.set(ev.id, ev);
  }
  const uniqueEvents = [...eventMap.values()];

  // Exclude events already posted earlier today to prevent duplicate tips across 08:00, 12:00, and 18:00 slots
  const todayPostedIds = await getTodayPostedEventIds(env);

  const now = Date.now();
  const primaryEvents = uniqueEvents.filter((ev) => {
    const start = new Date(ev.commence_time).getTime();
    return start <= now + hoursAhead * 60 * 60 * 1000;
  });

  const selected = chooseCandidates(primaryEvents, minOdds, maxOdds, targetCount, quality.minBookmakers, todayPostedIds, quality);

  const usage = guard.snapshot();
  console.log(`[Tips] Credit guard: paid_requests=${usage.paidRequestAttempts}/${maxFeeds}, remaining=${usage.remaining ?? "unknown"}, used=${usage.usedFromHeader ?? "unknown"}, selected=${selected.length} tip(s)`);
  return selected;
}

function cleanSportTitle(title: string): string {
  if (!title) return "Sports";
  return title
    .replace(/^English\s+/i, "")
    .replace(/^UEFA\s+/i, "")
    .replace(/\s+Tour$/i, "")
    .trim();
}

function formatKickoff(iso: string): string {
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Colombo",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
    return `${get("day")} ${get("month")} • ${get("hour")}:${get("minute")} (SL)`;
  } catch {
    return iso;
  }
}

function toPostedSummary(candidate: TipCandidate): PostedTipSummary { return { eventId: candidate.event.id, sportKey: candidate.event.sport_key, sportTitle: candidate.event.sport_title, homeTeam: candidate.event.home_team, awayTeam: candidate.event.away_team, commenceTime: candidate.event.commence_time, selection: candidate.selection, market: candidate.market, odds: candidate.bestPrice ?? candidate.averageOdds ?? 0, bookmakerCount: candidate.bookmakerCount, marketProbability: candidate.consensusProbability ?? candidate.impliedProbability ?? 0 }; }

export function formatTipMessage(candidates: TipCandidate[], slot: string, joinUrl?: string): string {
  const numberBadges = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  const totalMultiplier = candidates.reduce((acc, c) => acc * (c.bestPrice ?? c.averageOdds ?? 0), 1);

  const header = [
    "🇱🇰 *FREE TIPS — SRI LANKA* 🎯",
    `⏰ *වේලාව (Time):* ${escapeMarkdown(slot)} (Sri Lanka)`,
    `🔥 *අද දින හොඳම Tips ${candidates.length}ක් (Top Daily Picks)*`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
  ].join("\n");

  const matchBlocks = candidates.map((candidate, index) => {
    const badge = numberBadges[index] || `[${index + 1}]`;
    const sportName = cleanSportTitle(candidate.event.sport_title);
    const bestPrice = candidate.bestPrice ?? candidate.averageOdds ?? 0;
    const consensusProbability = candidate.consensusProbability ?? candidate.impliedProbability ?? 0;
    const valueScore = candidate.valueScore ?? (consensusProbability * bestPrice - 1);
    const probPercent = (consensusProbability * 100).toFixed(1);
    const marketKey = (candidate.market || "h2h").toLowerCase();
    const marketTag = marketKey === "h2h" || marketKey === "1x2" ? "1X2" : marketKey.includes("over") || marketKey.includes("under") || marketKey === "totals" ? "O/U" : candidate.market.toUpperCase();
    const pickLabel = marketTag === "1X2"
      ? (/draw/i.test(candidate.selection) ? "Draw" : `${candidate.selection} Win`)
      : candidate.selection;

    return [
      `${badge} ⚽ *${escapeMarkdown(sportName)}*`,
      `*${escapeMarkdown(candidate.event.home_team)}*  vs  *${escapeMarkdown(candidate.event.away_team)}*`,
      `🕒 ${escapeMarkdown(formatKickoff(candidate.event.commence_time))}`,
      `🏷 *${escapeMarkdown(marketTag)}* · ${escapeMarkdown(pickLabel)} · *${bestPrice.toFixed(2)}*`,
      `📈 Consensus ${probPercent}% · 💎 Value +${(valueScore * 100).toFixed(1)}% · 🏪 ${candidate.bookmakerCount} books`,
      `🎯 Confidence: ${candidate.confidence ?? confidenceFor(consensusProbability)}`,
    ].join("\n");
  });

  const matchesContent = matchBlocks.join("\n\n─────────────────────────\n\n");

  const footer = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    `💰 *සමස්ත Multiplier Odds (Accumulator):* *~${totalMultiplier.toFixed(2)}*`,
    "🕒 _Odds පලකල මොහොතේ අගයන් වේ (Odds subject to live market changes)._",
    "⚡ _Accumulator (Acca) bets අධික අවදානම් සහිතයි (High Risk). Single bets නිර්දේශ කරමු._",
    "ℹ️ _Picks use no-vig median market consensus and positive expected value. This is an estimate, not a guarantee._",
    "⚠️ _18+ පමණි. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න. Never stake money you cannot afford to lose._",
  ].join("\n");

  const parts = [header, matchesContent, footer];

  if (joinUrl) {
    parts.push(`📣 [👉 අපගේ නිල Channel එකට එක්වන්න (Join Channel)](${joinUrl})`);
  }

  return parts.join("\n\n");
}

export const formatTipMessageMarkdown = formatTipMessage;

export function formatFallbackTip(slot: string, joinUrl?: string): string {
  const lines = [
    "🇱🇰 *FREE TIPS UPDATE (ශ්‍රී ලංකා)*",
    `⏰ *වේලාව (Time):* ${escapeMarkdown(slot)} (Sri Lanka)`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    "ℹ️ මෙම slot එක සඳහා ප්‍රමාණවත් ප්‍රමිතියෙන් යුතු තරඟ වාර්තා වී නොමැත.",
    "✅ අප කිසිවිටකත් අඩු විශ්වාසනීයත්වයකින් යුතු හෝ බොරු tips පළ නොකරයි.",
    "📢 ඊළඟ scheduled tips update එක නියමිත වේලාවට පළ වනු ඇත.",
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    "⚠️ _18+ පමණි. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න._",
  ];
  if (joinUrl) {
    lines.push("", `📣 [👉 අපගේ Channel එකට එක්වන්න](${joinUrl})`);
  }
  return lines.join("\n");
}

export interface TelegramInlineKeyboardButton {
  text: string;
  url: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export const DEFAULT_XBET_LINK = "https://reffpa.com/L?tag=d_2481353m_1622c_&site=2481353&ad=1622";

export function buildMatchBetLink(baseUrl: string | undefined, candidate: TipCandidate): string {
  const raw = baseUrl?.trim() ? baseUrl.trim() : DEFAULT_XBET_LINK;
  const matchName = `${candidate.event.home_team} vs ${candidate.event.away_team}`;

  try {
    const url = new URL(raw);
    url.searchParams.set("match", matchName);
    url.searchParams.set("event_id", candidate.event.id);
    if (candidate.selection) {
      url.searchParams.set("pick", candidate.selection);
    }
    if (candidate.event.sport_key) {
      url.searchParams.set("sport", candidate.event.sport_key);
    }
    // Standard affiliate sub-parameters for 1xPartners tracking
    if (url.hostname.includes("reffpa") || url.searchParams.has("tag")) {
      url.searchParams.set("sub1", candidate.event.id || "match");
      url.searchParams.set("sub2", candidate.selection || "pick");
    }
    return url.toString();
  } catch {
    const sep = raw.includes("?") ? "&" : "?";
    return `${raw}${sep}match=${encodeURIComponent(matchName)}&event_id=${encodeURIComponent(candidate.event.id)}`;
  }
}

export function formatMatchButtonLabel(candidate: TipCandidate, index: number): string {
  const numberBadges = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  const badge = numberBadges[index] || `[${index + 1}]`;
  const home = candidate.event.home_team.trim();
  const away = candidate.event.away_team.trim();
  let match = `${home} vs ${away}`;
  if (match.length > 48) {
    match = match.slice(0, 47).trim() + "…";
  }
  return `${badge} ${candidate.emoji} Bet: ${match}`;
}

/**
 * Ensures that Telegram links are never mistaken for tracking endpoints.
 * Tracking base URLs must be real web servers, not t.me / telegram channels.
 */
export function isUsableTrackingHost(url?: string): url is string {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "t.me" ||
      host.endsWith(".t.me") ||
      host.includes("telegram.me") ||
      host.includes("telegram.org")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes any telegram channel string into a valid https://t.me/... clickable link.
 * Handles @username, t.me/username, https://t.me/username, or bare username.
 */
export function normalizeChannelUrl(url?: string, username?: string): string | undefined {
  if (url && typeof url === "string") {
    let trimmed = url.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
      return trimmed;
    }
    if (trimmed.startsWith("t.me/")) {
      return `https://${trimmed}`;
    }
    if (trimmed.startsWith("@")) {
      return `https://t.me/${trimmed.slice(1)}`;
    }
    return `https://t.me/${trimmed}`;
  }
  if (username && typeof username === "string") {
    const trimmed = username.trim().replace(/^@/, "");
    if (trimmed) {
      return `https://t.me/${trimmed}`;
    }
  }
  return undefined;
}

export function buildTipsInlineKeyboard(
  candidates: TipCandidate[],
  xbetLink?: string,
  joinUrl?: string,
  trackingBaseUrl?: string,
  tipPostId?: number
): TelegramInlineKeyboardMarkup {
  const rows: TelegramInlineKeyboardButton[][] = [];
  const useTracking = isUsableTrackingHost(trackingBaseUrl) && Boolean(tipPostId);

  // Individual match buttons linking directly to 1xBet or tracking endpoint
  candidates.forEach((candidate, index) => {
    const text = formatMatchButtonLabel(candidate, index);
    let url: string;
    if (useTracking && trackingBaseUrl && tipPostId) {
      url = `${trackingBaseUrl.replace(/\/$/, "")}/go/tip/${tipPostId}?event=${encodeURIComponent(candidate.event.id)}&pick=${encodeURIComponent(candidate.selection)}`;
    } else {
      url = buildMatchBetLink(xbetLink, candidate);
    }
    rows.push([{ text, url }]);
  });

  // Accumulator / Multiplier button if there are 2 or more candidates
  if (candidates.length > 1) {
    const totalMultiplier = candidates.reduce((acc, c) => acc * (c.bestPrice ?? c.averageOdds ?? 0), 1);
    const raw = xbetLink?.trim() ? xbetLink.trim() : DEFAULT_XBET_LINK;
    let accumUrl: string;
    if (useTracking && trackingBaseUrl && tipPostId) {
      accumUrl = `${trackingBaseUrl.replace(/\/$/, "")}/go/tip/${tipPostId}?type=accumulator`;
    } else {
      try {
        const u = new URL(raw);
        u.searchParams.set("bet_type", "accumulator");
        u.searchParams.set("multiplier", totalMultiplier.toFixed(2));
        accumUrl = u.toString();
      } catch {
        accumUrl = raw;
      }
    }
    rows.push([
      {
        text: `⚡ Bet Accumulator (~${totalMultiplier.toFixed(2)}) on 1xBet`,
        url: accumUrl,
      },
    ]);
  }

  // Official Channel button if joinUrl is provided
  const cleanJoinUrl = normalizeChannelUrl(joinUrl);
  if (cleanJoinUrl && cleanJoinUrl.startsWith("http")) {
    rows.push([
      {
        text: "📣 Join Official Channel",
        url: cleanJoinUrl,
      },
    ]);
  }

  return { inline_keyboard: rows };
}

export function buildFallbackInlineKeyboard(
  xbetLink?: string,
  joinUrl?: string
): TelegramInlineKeyboardMarkup {
  const rows: TelegramInlineKeyboardButton[][] = [];
  const raw = xbetLink?.trim() ? xbetLink.trim() : DEFAULT_XBET_LINK;
  rows.push([{ text: "🎲 Go to 1xBet", url: raw }]);

  const cleanJoinUrl = normalizeChannelUrl(joinUrl);
  if (cleanJoinUrl && cleanJoinUrl.startsWith("http")) {
    rows.push([{ text: "📣 Join Official Channel", url: cleanJoinUrl }]);
  }

  return { inline_keyboard: rows };
}

async function postTelegramMessage(
  env: Env,
  message: string,
  parseMode: "HTML" | "Markdown" = "Markdown",
  replyMarkup?: TelegramInlineKeyboardMarkup
): Promise<number | null> {
  const payload: Record<string, unknown> = {
    chat_id: (env.TIPS_CHANNEL_ID || "").replace(/^id:\s*/i, "").trim(),
    text: message,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  };
  if (replyMarkup && replyMarkup.inline_keyboard && replyMarkup.inline_keyboard.length > 0) {
    payload.reply_markup = replyMarkup;
  }

  let response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(env.BOT_TOKEN)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let telegram = (await response.json()) as { ok: boolean; description?: string; result?: { message_id?: number } };
  if (!telegram.ok && telegram.description?.toLowerCase().includes("can't parse entities")) {
    console.warn(`[Tips] Telegram Markdown parsing failed (${telegram.description}), retrying with plain text`);
    response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(env.BOT_TOKEN)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        text: message.replace(/[*_`]/g, ""),
        parse_mode: undefined,
      }),
    });
    telegram = (await response.json()) as { ok: boolean; description?: string; result?: { message_id?: number } };
  }
  if (!response.ok || !telegram.ok) throw new Error(`Telegram send failed: ${telegram.description || response.status}`);
  return telegram.result?.message_id ?? null;
}

/**
 * Atomically claims a scheduled slot to prevent duplicate posts across multiple workers.
 */
async function claimTipSlot(
  env: Env,
  scheduledKey: string,
  slot: string
): Promise<{ claimed: boolean; id: number; leaseToken: string }> {
  const leaseToken = crypto.randomUUID();
  const insertResult = await env.DB.prepare(`
    INSERT OR IGNORE INTO tip_posts (
      scheduled_key, slot_time, status, lease_token,
      lease_expires_at, attempt_count, created_at, updated_at
    ) VALUES (
      ?, ?, 'PROCESSING', ?, datetime('now', '+${TIP_LEASE_MINUTES} minutes'),
      1, datetime('now'), datetime('now')
    )
  `).bind(scheduledKey, slot, leaseToken).run();

  const row = await env.DB.prepare(`
    SELECT id, status, lease_token, lease_expires_at
    FROM tip_posts
    WHERE scheduled_key = ?
  `).bind(scheduledKey).first<{
    id: number;
    status: string;
    lease_token: string | null;
    lease_expires_at: string | null;
  }>();

  if (!row) throw new Error("Tip slot record could not be created or loaded");
  if (row.status === "POSTED") return { claimed: false, id: row.id, leaseToken };

  const insertChanges = insertResult.meta?.changes ?? 0;
  if (insertChanges > 0) return { claimed: true, id: row.id, leaseToken };

  if (row.status === "PROCESSING" && row.lease_expires_at && row.lease_expires_at > new Date().toISOString().replace("T", " ").slice(0, 19)) {
    return { claimed: false, id: row.id, leaseToken };
  }

  const result = await env.DB.prepare(`
    UPDATE tip_posts
    SET status='PROCESSING',
        lease_token=?,
        lease_expires_at=datetime('now', '+${TIP_LEASE_MINUTES} minutes'),
        attempt_count=attempt_count+1,
        error=NULL,
        updated_at=datetime('now')
    WHERE id=?
      AND status <> 'POSTED'
      AND (status <> 'PROCESSING' OR lease_expires_at IS NULL OR lease_expires_at <= datetime('now'))
  `).bind(leaseToken, row.id).run();

  const changes = result.meta?.changes ?? (result.success ? 1 : 0);
  return { claimed: changes > 0, id: row.id, leaseToken };
}

/**
 * Updates a tip record as POSTED with full candidate JSON payload and message ID.
 */
async function markTipPosted(
  env: Env,
  id: number,
  candidates: TipCandidate[],
  telegramMessageId: number | null
): Promise<void> {
  const first = candidates[0];
  const payload = JSON.stringify(candidates.map(toPostedSummary));

  await env.DB.prepare(`
    UPDATE tip_posts
    SET status='POSTED',
        event_id=?,
        sport_key=?,
        sport_title=?,
        home_team=?,
        away_team=?,
        commence_time=?,
        market=?,
        selection=?,
        odds=?,
        message_id=?,
        tips_json=?,
        posted_at=datetime('now'),
        error=NULL,
        lease_token=NULL,
        lease_expires_at=NULL,
        updated_at=datetime('now')
    WHERE id=?
  `).bind(
    first?.event.id ?? null,
    first?.event.sport_key ?? null,
    first?.event.sport_title ?? null,
    first?.event.home_team ?? null,
    first?.event.away_team ?? null,
    first?.event.commence_time ?? null,
    first?.market ?? null,
    first?.selection ?? null,
    first ? (first.bestPrice ?? first.averageOdds ?? null) : null,
    telegramMessageId,
    payload,
    id
  ).run();
}

/**
 * Marks a tip slot as FAILED with error message and clears lease token.
 */
async function markTipFailed(env: Env, id: number, error: string): Promise<void> {
  await env.DB.prepare(`
    UPDATE tip_posts
    SET status='FAILED',
        error=?,
        lease_token=NULL,
        lease_expires_at=NULL,
        updated_at=datetime('now')
    WHERE id=?
      AND status <> 'POSTED'
  `).bind(error, id).run();
}

/**
 * Sends urgent alert notifications to all configured admin Telegram accounts.
 */
export async function sendAdminAlert(env: Env, alertMessage: string): Promise<void> {
  if (!env.BOT_TOKEN) return;

  const targets: string[] = [];
  if (env.ADMIN_CHANNEL_ID) {
    targets.push(env.ADMIN_CHANNEL_ID.replace(/^id:\s*/i, "").trim());
  }
  if (env.ADMIN_IDS) {
    for (const raw of env.ADMIN_IDS.split(",")) {
      const trimmed = raw.trim();
      if (trimmed && /^-?\d+$/.test(trimmed)) {
        targets.push(trimmed);
      }
    }
  }

  const uniqueTargets = [...new Set(targets)];
  for (const chatId of uniqueTargets) {
    try {
      await fetch(`https://api.telegram.org/bot${encodeURIComponent(env.BOT_TOKEN)}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: alertMessage,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });
    } catch (err) {
      console.warn(`[Tips Admin Alert] Failed to send alert to ${chatId}:`, err);
    }
  }
}

/**
 * Runs scheduled tips publication for a specific cron trigger.
 */
export async function runScheduledTip(
  env: Env,
  cron: string
): Promise<{ status: string; slot: string }> {
  if (!SLOT_CRONS.has(cron)) return { status: "skipped", slot: "" };
  const slot = slotForCron(cron);
  if (!slot) return { status: "skipped", slot: "" };

  const scheduledKey = `${sriLankaDate()}:${slot}`;
  let claim: { claimed: boolean; id: number; leaseToken: string };

  try {
    claim = await claimTipSlot(env, scheduledKey, slot);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Tips] claimTipSlot failed for ${scheduledKey}:`, errorMsg);
    await sendAdminAlert(
      env,
      `🚨 *[TIPS CLAIM ERROR]*\n⏰ *Slot:* ${slot} Sri Lanka\n⚠️ *Error:* ${escapeMarkdown(errorMsg)}`
    ).catch(() => {});
    return { status: "claim_failed", slot };
  }

  if (!claim.claimed) {
    return { status: "already_claimed", slot };
  }

  // Channel URL: prioritize official main channel, fallback to tips channel
  const joinUrl =
    normalizeChannelUrl(env.CHANNEL_URL, env.CHANNEL_USERNAME) ||
    normalizeChannelUrl(env.TIPS_CHANNEL_URL) ||
    undefined;
  const xbetLink = env.XBET_LINK || DEFAULT_XBET_LINK;
  // CHANNEL_URL is a Telegram channel URL and must never be passed as a tracking base
  const trackingBase = undefined;

  try {
    let message: string;
    let candidates: TipCandidate[] = [];
    let keyboard: TelegramInlineKeyboardMarkup;

    try {
      candidates = await fetchCandidates(env);
      if (candidates.length === 0) throw new Error("No qualifying candidates were found");
      message = formatTipMessage(candidates, slot, joinUrl);
      keyboard = buildTipsInlineKeyboard(candidates, xbetLink, joinUrl, trackingBase, claim.id);
    } catch (fetchError) {
      console.warn(
        `[Tips] fetchCandidates failed for ${scheduledKey}:`,
        fetchError instanceof Error ? fetchError.message : fetchError
      );
      message = formatFallbackTip(slot, joinUrl);
      keyboard = buildFallbackInlineKeyboard(xbetLink, joinUrl);
    }

    const telegramMessageId = await postTelegramMessage(env, message, "Markdown", keyboard);
    await markTipPosted(env, claim.id, candidates, telegramMessageId);

    console.log(
      `[Tips] Posted ${candidates.length} tip(s) with match buttons for ${scheduledKey} (msg ${telegramMessageId})`
    );
    return { status: candidates.length > 0 ? "posted" : "posted_fallback", slot };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Tips] runScheduledTip failed for ${scheduledKey}:`, errorMsg);

    await markTipFailed(env, claim.id, errorMsg).catch((e) =>
      console.error(`[Tips] markTipFailed also failed:`, e instanceof Error ? e.message : e)
    );

    // P0: Alert admin immediately on failed tips execution
    await sendAdminAlert(
      env,
      `🚨 *[ALERT] Scheduled Tip Failed!*\n\n⏰ *Slot:* ${slot} Sri Lanka Time\n🔑 *Key:* \`${scheduledKey}\`\n⚠️ *Error:* ${escapeMarkdown(errorMsg)}\n\n_Please check The Odds API credits or Telegram channel permissions._`
    ).catch(() => {});

    return { status: "failed", slot };
  }
}
