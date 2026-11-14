import type { Env } from "./types";
import { fetchOddsApiJson, hasOddsApiKeys } from "./oddsKeys";
import { canMakeOddsRequest, getMonthlyCreditSummary } from "./oddsCreditManager";
import { escapeMarkdown } from "./utils";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const MIN_VALUE_ALERT_EDGE = 0.04; // +4.0% expected value edge
const MIN_VALUE_ALERT_CONSENSUS = 0.50;
const MIN_VALUE_ALERT_BOOKMAKERS = 3;
const MAX_VALUE_ALERTS_PER_BATCH = 2;

export interface OddsOutcomeLike {
  name: string;
  price: number;
}

export interface OddsMarketLike {
  key: string;
  outcomes: OddsOutcomeLike[];
}

export interface OddsBookmakerLike {
  key: string;
  title: string;
  markets: OddsMarketLike[];
}

export interface OddsEventLike {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmakerLike[];
}

export interface BookmakerSnapshotRow {
  key: string;
  title: string;
  homeOdds: number | null;
  drawOdds: number | null;
  awayOdds: number | null;
}

export interface BestOddsSnapshot {
  eventId: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  bestHomeOdds: number | null;
  bestHomeBookmaker: string | null;
  bestDrawOdds: number | null;
  bestDrawBookmaker: string | null;
  bestAwayOdds: number | null;
  bestAwayBookmaker: string | null;
  prevBestHomeOdds: number | null;
  prevBestAwayOdds: number | null;
  bestSelection: string | null;
  bestValueScore: number | null;
  bestConsensusProb: number | null;
  bookmakers: BookmakerSnapshotRow[];
  fetchedAt: string;
}

export interface ValueAlertRecord {
  dedupKey: string;
  eventId: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  selection: string;
  bestOdds: number;
  bookmaker: string;
  consensusProb: number;
  valueScore: number;
  alertedAt: string;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizeTeamMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function resolveChannelTarget(env: Partial<Env>): string {
  const raw = (env.TIPS_CHANNEL_ID || env.CHANNEL_USERNAME || "").trim();
  if (!raw) return "";
  return raw.startsWith("@") ? raw : raw.replace(/^id:\s*/i, "").trim();
}

function resolveJoinUrl(env: Partial<Env>): string | undefined {
  const url = (env.CHANNEL_URL || env.TIPS_CHANNEL_URL || "").trim();
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const username = (env.CHANNEL_USERNAME || "").trim().replace(/^@/, "");
  return username ? `https://t.me/${username}` : undefined;
}

async function postChannelMarkdown(
  env: Partial<Env>,
  text: string,
  buttonUrl?: string,
  buttonText = "⚡ Compare & Bet on 1xBet"
): Promise<number | null> {
  const chatId = resolveChannelTarget(env);
  if (!env.BOT_TOKEN || !chatId) return null;
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  };
  if (buttonUrl && (buttonUrl.startsWith("http://") || buttonUrl.startsWith("https://"))) {
    payload.reply_markup = { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] };
  }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await resp.json()) as { ok?: boolean; result?: { message_id?: number } };
    return data?.ok ? (data.result?.message_id ?? null) : null;
  } catch {
    return null;
  }
}

interface ValueOpportunity {
  event: OddsEventLike;
  selection: string;
  bestOdds: number;
  bestBookmaker: string;
  consensusProb: number;
  valueScore: number;
  bookmakerCount: number;
}

export function extractEventBestOdds(event: OddsEventLike): {
  snapshot: Omit<BestOddsSnapshot, "prevBestHomeOdds" | "prevBestAwayOdds" | "fetchedAt">;
  bestValueOpportunity: ValueOpportunity | null;
} {
  const bookmakers: BookmakerSnapshotRow[] = [];
  const marketRows: Array<{
    bookTitle: string;
    prices: Map<string, number>;
    fair: Map<string, number>;
  }> = [];

  let bestHomeOdds: number | null = null;
  let bestHomeBookmaker: string | null = null;
  let bestDrawOdds: number | null = null;
  let bestDrawBookmaker: string | null = null;
  let bestAwayOdds: number | null = null;
  let bestAwayBookmaker: string | null = null;

  for (const bm of event.bookmakers || []) {
    const h2h = (bm.markets || []).find((m) => m.key === "h2h");
    if (!h2h || !Array.isArray(h2h.outcomes) || h2h.outcomes.length === 0) continue;
    const valid = h2h.outcomes
      .map((o) => ({ name: String(o.name || "").trim(), price: Number(o.price) }))
      .filter((o) => o.name && Number.isFinite(o.price) && o.price > 1.01);
    if (valid.length === 0) continue;

    let homeOdds: number | null = null;
    let drawOdds: number | null = null;
    let awayOdds: number | null = null;

    for (const o of valid) {
      if (normalizeTeamMatch(o.name, event.home_team)) {
        homeOdds = o.price;
        if (bestHomeOdds === null || o.price > bestHomeOdds) {
          bestHomeOdds = o.price;
          bestHomeBookmaker = bm.title || bm.key;
        }
      } else if (normalizeTeamMatch(o.name, event.away_team)) {
        awayOdds = o.price;
        if (bestAwayOdds === null || o.price > bestAwayOdds) {
          bestAwayOdds = o.price;
          bestAwayBookmaker = bm.title || bm.key;
        }
      } else if (/^draw$/i.test(o.name)) {
        drawOdds = o.price;
        if (bestDrawOdds === null || o.price > bestDrawOdds) {
          bestDrawOdds = o.price;
          bestDrawBookmaker = bm.title || bm.key;
        }
      }
    }

    bookmakers.push({
      key: bm.key,
      title: bm.title || bm.key,
      homeOdds,
      drawOdds,
      awayOdds,
    });

    if (valid.length >= 2) {
      const overround = valid.reduce((sum, o) => sum + 1 / o.price, 0);
      marketRows.push({
        bookTitle: bm.title || bm.key,
        prices: new Map(valid.map((o) => [o.name, o.price])),
        fair: new Map(valid.map((o) => [o.name, (1 / o.price) / (overround || 1)])),
      });
    }
  }

  let bestOpp: ValueOpportunity | null = null;
  const selections = new Set(marketRows.flatMap((r) => [...r.prices.keys()]));
  for (const selection of selections) {
    const entries = marketRows
      .map((r) => ({
        bookTitle: r.bookTitle,
        price: r.prices.get(selection),
        fair: r.fair.get(selection),
      }))
      .filter((e): e is { bookTitle: string; price: number; fair: number } =>
        e.price !== undefined && e.fair !== undefined
      );

    if (entries.length < 2) continue;
    const consensusProb = median(entries.map((e) => e.fair));
    const medPrice = median(entries.map((e) => e.price));
    // Sanitize outlier spikes (> 1.35x median) when finding realistic best bookmaker odds
    const realistic = entries.filter((e) => e.price <= medPrice * 1.35);
    const pool = realistic.length > 0 ? realistic : entries;
    const top = pool.reduce((best, cur) => (cur.price > best.price ? cur : best), pool[0]);
    const valueScore = consensusProb * top.price - 1;

    if (!bestOpp || valueScore > bestOpp.valueScore) {
      bestOpp = {
        event,
        selection,
        bestOdds: top.price,
        bestBookmaker: top.bookTitle,
        consensusProb,
        valueScore,
        bookmakerCount: entries.length,
      };
    }
  }

  // Keep top 6 bookmakers sorted by highest home/away price for compact storage
  const sortedBookmakers = bookmakers
    .sort((a, b) => Math.max(b.homeOdds ?? 0, b.awayOdds ?? 0) - Math.max(a.homeOdds ?? 0, a.awayOdds ?? 0))
    .slice(0, 6);

  return {
    snapshot: {
      eventId: event.id,
      sportKey: event.sport_key,
      sportTitle: event.sport_title || event.sport_key,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: event.commence_time,
      bestHomeOdds,
      bestHomeBookmaker,
      bestDrawOdds,
      bestDrawBookmaker,
      bestAwayOdds,
      bestAwayBookmaker,
      bestSelection: bestOpp?.selection ?? null,
      bestValueScore: bestOpp ? Math.round(bestOpp.valueScore * 10000) / 10000 : null,
      bestConsensusProb: bestOpp ? Math.round(bestOpp.consensusProb * 10000) / 10000 : null,
      bookmakers: sortedBookmakers,
    },
    bestValueOpportunity: bestOpp,
  };
}

/**
 * Reuses any fetched /odds API payload at ZERO extra credit cost to update:
 * 1) Best Odds Finder comparison snapshots + movement deltas in D1
 * 2) Deduplicated Value Odds Alerts to the Telegram channel (paused automatically at >= 950 credits)
 */
export async function processOddsIntelligence(
  env: Partial<Env>,
  events: OddsEventLike[],
  options?: { dispatchValueAlerts?: boolean }
): Promise<{ snapshotsSaved: number; alertsSent: number }> {
  if (!env.DB || typeof env.DB.prepare !== "function" || events.length === 0) {
    return { snapshotsSaved: 0, alertsSent: 0 };
  }

  const now = Date.now();
  const cutoffMs = now + 72 * 3600_000;
  const upcomingEvents = events.filter((e) => {
    const start = e.commence_time ? Date.parse(e.commence_time) : NaN;
    return Boolean(e.id) && Number.isFinite(start) && start > now && start <= cutoffMs && Array.isArray(e.bookmakers) && e.bookmakers.length > 0;
  });
  if (upcomingEvents.length === 0) return { snapshotsSaved: 0, alertsSent: 0 };

  // Preload prior best odds to capture odds movement without extra queries
  const prevMap = new Map<string, { home: number | null; away: number | null }>();
  const eventIds = upcomingEvents.map((e) => e.id).slice(0, 80);
  try {
    if (eventIds.length > 0) {
      const placeholders = eventIds.map(() => "?").join(",");
      const rows = (await env.DB.prepare(
        `SELECT event_id, best_home_odds, best_away_odds FROM odds_snapshots WHERE event_id IN (${placeholders})`
      ).bind(...eventIds).all<{ event_id: string; best_home_odds: number | null; best_away_odds: number | null }>()).results || [];
      for (const r of rows) {
        if (r?.event_id) prevMap.set(r.event_id, { home: r.best_home_odds ?? null, away: r.best_away_odds ?? null });
      }
    }
  } catch {
    return { snapshotsSaved: 0, alertsSent: 0 };
  }

  const statements: any[] = [];
  const candidates: ValueOpportunity[] = [];
  const nowIso = new Date(now).toISOString();

  for (const event of upcomingEvents.slice(0, 60)) {
    const { snapshot, bestValueOpportunity } = extractEventBestOdds(event);
    if (snapshot.bookmakers.length === 0) continue;
    const prev = prevMap.get(event.id);
    const prevHome = prev?.home !== undefined && prev.home !== snapshot.bestHomeOdds ? prev.home : null;
    const prevAway = prev?.away !== undefined && prev.away !== snapshot.bestAwayOdds ? prev.away : null;

    statements.push(
      env.DB.prepare(`
        INSERT INTO odds_snapshots (
          event_id, sport_key, sport_title, home_team, away_team, commence_time, market,
          best_home_odds, best_home_bookmaker, best_draw_odds, best_draw_bookmaker,
          best_away_odds, best_away_bookmaker, prev_best_home_odds, prev_best_away_odds,
          best_selection, best_value_score, best_consensus_prob, bookmakers_json, fetched_at
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(event_id) DO UPDATE SET
          sport_key=excluded.sport_key,
          sport_title=excluded.sport_title,
          commence_time=excluded.commence_time,
          best_home_odds=excluded.best_home_odds,
          best_home_bookmaker=excluded.best_home_bookmaker,
          best_draw_odds=excluded.best_draw_odds,
          best_draw_bookmaker=excluded.best_draw_bookmaker,
          best_away_odds=excluded.best_away_odds,
          best_away_bookmaker=excluded.best_away_bookmaker,
          prev_best_home_odds=CASE
            WHEN odds_snapshots.best_home_odds IS NOT NULL AND odds_snapshots.best_home_odds != excluded.best_home_odds
            THEN odds_snapshots.best_home_odds
            ELSE odds_snapshots.prev_best_home_odds
          END,
          prev_best_away_odds=CASE
            WHEN odds_snapshots.best_away_odds IS NOT NULL AND odds_snapshots.best_away_odds != excluded.best_away_odds
            THEN odds_snapshots.best_away_odds
            ELSE odds_snapshots.prev_best_away_odds
          END,
          best_selection=excluded.best_selection,
          best_value_score=excluded.best_value_score,
          best_consensus_prob=excluded.best_consensus_prob,
          bookmakers_json=excluded.bookmakers_json,
          fetched_at=excluded.fetched_at
      `).bind(
        snapshot.eventId,
        snapshot.sportKey,
        snapshot.sportTitle,
        snapshot.homeTeam,
        snapshot.awayTeam,
        snapshot.commenceTime,
        "h2h",
        snapshot.bestHomeOdds,
        snapshot.bestHomeBookmaker,
        snapshot.bestDrawOdds,
        snapshot.bestDrawBookmaker,
        snapshot.bestAwayOdds,
        snapshot.bestAwayBookmaker,
        prevHome,
        prevAway,
        snapshot.bestSelection,
        snapshot.bestValueScore,
        snapshot.bestConsensusProb,
        JSON.stringify(snapshot.bookmakers),
        nowIso
      )
    );

    if (
      bestValueOpportunity &&
      bestValueOpportunity.bookmakerCount >= MIN_VALUE_ALERT_BOOKMAKERS &&
      bestValueOpportunity.consensusProb >= MIN_VALUE_ALERT_CONSENSUS &&
      bestValueOpportunity.valueScore >= MIN_VALUE_ALERT_EDGE &&
      bestValueOpportunity.bestOdds >= 1.35 &&
      bestValueOpportunity.bestOdds <= 3.20
    ) {
      candidates.push(bestValueOpportunity);
    }
  }

  let snapshotsSaved = 0;
  try {
    for (let i = 0; i < statements.length; i += 40) {
      await env.DB.batch(statements.slice(i, i + 40));
      snapshotsSaved += Math.min(40, statements.length - i);
    }
  } catch (err) {
    console.warn("[BestOdds] Snapshot save failed:", err instanceof Error ? err.message : err);
  }

  let alertsSent = 0;
  if (options?.dispatchValueAlerts !== false && candidates.length > 0 && env.BOT_TOKEN && resolveChannelTarget(env)) {
    const budget = await getMonthlyCreditSummary(env);
    // Stop extra Value Alerts cleanly at >= 950 credits per credit protection spec
    if (budget.tier !== "CRITICAL_950" && budget.tier !== "HARD_STOP_1000") {
      candidates.sort((a, b) => b.valueScore - a.valueScore);
      for (const opp of candidates) {
        if (alertsSent >= MAX_VALUE_ALERTS_PER_BATCH) break;
        const dedupKey = `${opp.event.id}:${opp.selection}`;
        try {
          const existing = await env.DB.prepare(
            `SELECT best_odds, alerted_at FROM value_odds_alerts WHERE dedup_key = ?`
          ).bind(dedupKey).first<{ best_odds?: number; alerted_at?: string }>();

          if (existing) {
            const ageHours = existing.alerted_at ? (now - Date.parse(existing.alerted_at)) / 3600_000 : 0;
            const improved = opp.bestOdds - Number(existing.best_odds || 0);
            // Prevent duplicate alerts unless odds drifted upward >= 0.15 after 6 hours
            if (!(ageHours >= 6 && improved >= 0.15)) {
              continue;
            }
          }

          const edgePct = (opp.valueScore * 100).toFixed(1);
          const probPct = (opp.consensusProb * 100).toFixed(1);
          const msg = [
            "🔥 *VALUE ODDS ALERT (වටිනා අවස්ථාවක්)* 💎",
            "━━━━━━━━━━━━━━━━━━━━━━━━━",
            `🏆 *${escapeMarkdown(opp.event.sport_title || opp.event.sport_key)}*`,
            `⚽ *${escapeMarkdown(opp.event.home_team)}* vs *${escapeMarkdown(opp.event.away_team)}*`,
            `🎯 *Pick:* ${escapeMarkdown(opp.selection)}`,
            `💹 *Best Odds:* *${opp.bestOdds.toFixed(2)}* (${escapeMarkdown(opp.bestBookmaker)})`,
            `📊 *No-Vig Consensus:* ${probPct}% · *Edge:* *+${edgePct}%* (${opp.bookmakerCount} books)`,
            "━━━━━━━━━━━━━━━━━━━━━━━━━",
            "⚠️ _18+ පමණි. Odds වෙනස් විය හැක (Market odds fluctuate)._",
          ].join("\n");

          const betLink = (env.XBET_LINK || "").trim() || resolveJoinUrl(env);
          const msgId = await postChannelMarkdown(env, msg, betLink);
          if (msgId !== null) {
            alertsSent += 1;
            await env.DB.prepare(`
              INSERT INTO value_odds_alerts (
                dedup_key, event_id, sport_key, sport_title, home_team, away_team,
                commence_time, selection, best_odds, bookmaker, consensus_prob, value_score, telegram_message_id, alerted_at
              )
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
              ON CONFLICT(dedup_key) DO UPDATE SET
                best_odds=excluded.best_odds,
                bookmaker=excluded.bookmaker,
                consensus_prob=excluded.consensus_prob,
                value_score=excluded.value_score,
                telegram_message_id=excluded.telegram_message_id,
                alerted_at=datetime('now')
            `).bind(
              dedupKey,
              opp.event.id,
              opp.event.sport_key,
              opp.event.sport_title || opp.event.sport_key,
              opp.event.home_team,
              opp.event.away_team,
              opp.event.commence_time,
              opp.selection,
              opp.bestOdds,
              opp.bestBookmaker,
              opp.consensusProb,
              opp.valueScore,
              msgId
            ).run();
          }
        } catch (err) {
          console.warn("[ValueAlerts] Alert dispatch skipped:", err instanceof Error ? err.message : err);
        }
      }
    }
  }

  return { snapshotsSaved, alertsSent };
}

export async function getCachedBestOdds(
  env: Partial<Env>,
  options?: { limit?: number; sportQuery?: string }
): Promise<{ items: BestOddsSnapshot[]; latestFetchedAt: string | null }> {
  if (!env.DB || typeof env.DB.prepare !== "function") return { items: [], latestFetchedAt: null };
  const limit = Math.max(1, Math.min(options?.limit ?? 10, 30));
  const q = options?.sportQuery?.trim().toLowerCase() || "";

  try {
    const rows = (await env.DB.prepare(`
      SELECT * FROM odds_snapshots
      WHERE datetime(commence_time) > datetime('now', '-30 minutes')
      ORDER BY COALESCE(best_value_score, -1) DESC, commence_time ASC
      LIMIT ?
    `).bind(q ? 40 : limit).all<Record<string, unknown>>()).results || [];

    const parsed: BestOddsSnapshot[] = [];
    for (const r of rows) {
      if (!r?.event_id) continue;
      const item: BestOddsSnapshot = {
        eventId: String(r.event_id),
        sportKey: String(r.sport_key || ""),
        sportTitle: String(r.sport_title || r.sport_key || ""),
        homeTeam: String(r.home_team || ""),
        awayTeam: String(r.away_team || ""),
        commenceTime: String(r.commence_time || ""),
        bestHomeOdds: r.best_home_odds != null ? Number(r.best_home_odds) : null,
        bestHomeBookmaker: r.best_home_bookmaker ? String(r.best_home_bookmaker) : null,
        bestDrawOdds: r.best_draw_odds != null ? Number(r.best_draw_odds) : null,
        bestDrawBookmaker: r.best_draw_bookmaker ? String(r.best_draw_bookmaker) : null,
        bestAwayOdds: r.best_away_odds != null ? Number(r.best_away_odds) : null,
        bestAwayBookmaker: r.best_away_bookmaker ? String(r.best_away_bookmaker) : null,
        prevBestHomeOdds: r.prev_best_home_odds != null ? Number(r.prev_best_home_odds) : null,
        prevBestAwayOdds: r.prev_best_away_odds != null ? Number(r.prev_best_away_odds) : null,
        bestSelection: r.best_selection ? String(r.best_selection) : null,
        bestValueScore: r.best_value_score != null ? Number(r.best_value_score) : null,
        bestConsensusProb: r.best_consensus_prob != null ? Number(r.best_consensus_prob) : null,
        bookmakers: (() => {
          try {
            const arr = JSON.parse(String(r.bookmakers_json || "[]"));
            return Array.isArray(arr) ? arr : [];
          } catch {
            return [];
          }
        })(),
        fetchedAt: String(r.fetched_at || ""),
      };
      if (q) {
        const hay = `${item.sportKey} ${item.sportTitle} ${item.homeTeam} ${item.awayTeam}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      parsed.push(item);
      if (parsed.length >= limit) break;
    }

    const latestFetchedAt = parsed.reduce<string | null>((latest, cur) => {
      if (!cur.fetchedAt) return latest;
      return !latest || cur.fetchedAt > latest ? cur.fetchedAt : latest;
    }, null);

    return { items: parsed, latestFetchedAt };
  } catch {
    return { items: [], latestFetchedAt: null };
  }
}

export async function getRecentValueAlerts(env: Partial<Env>, limit = 10): Promise<ValueAlertRecord[]> {
  if (!env.DB || typeof env.DB.prepare !== "function") return [];
  try {
    const rows = (await env.DB.prepare(`
      SELECT dedup_key, event_id, sport_key, sport_title, home_team, away_team,
             commence_time, selection, best_odds, bookmaker, consensus_prob, value_score, alerted_at
      FROM value_odds_alerts
      ORDER BY alerted_at DESC
      LIMIT ?
    `).bind(Math.max(1, Math.min(limit, 30))).all<Record<string, unknown>>()).results || [];

    return rows
      .filter((r) => Boolean(r?.dedup_key))
      .map((r) => ({
        dedupKey: String(r.dedup_key),
        eventId: String(r.event_id),
        sportKey: String(r.sport_key || ""),
        sportTitle: String(r.sport_title || ""),
        homeTeam: String(r.home_team || ""),
        awayTeam: String(r.away_team || ""),
        commenceTime: String(r.commence_time || ""),
        selection: String(r.selection || ""),
        bestOdds: Number(r.best_odds || 0),
        bookmaker: String(r.bookmaker || ""),
        consensusProb: Number(r.consensus_prob || 0),
        valueScore: Number(r.value_score || 0),
        alertedAt: String(r.alerted_at || ""),
      }));
  } catch {
    return [];
  }
}

/**
 * Controlled refresh used by on-demand /odds bot command (only when cache is empty or stale > 45m)
 * or Admin manual refresh, strictly governed by the D1 credit manager.
 */
export async function refreshBestOddsOnDemand(
  env: Env,
  options?: { sportKey?: string; bucket?: "on_demand" | "odds_refresh"; maxAgeMinutes?: number }
): Promise<{
  items: BestOddsSnapshot[];
  refreshed: boolean;
  cacheUsed: boolean;
  notice?: string;
}> {
  const bucket = options?.bucket ?? "on_demand";
  const maxAgeMinutes = options?.maxAgeMinutes ?? 45;
  const cached = await getCachedBestOdds(env, { limit: 10, sportQuery: options?.sportKey });

  const latestAgeMin = cached.latestFetchedAt
    ? (Date.now() - Date.parse(cached.latestFetchedAt.endsWith("Z") ? cached.latestFetchedAt : `${cached.latestFetchedAt}Z`)) / 60_000
    : Infinity;

  if (cached.items.length > 0 && Number.isFinite(latestAgeMin) && latestAgeMin <= maxAgeMinutes) {
    return { items: cached.items, refreshed: false, cacheUsed: true };
  }

  if (!hasOddsApiKeys(env)) {
    return { items: cached.items, refreshed: false, cacheUsed: true, notice: "Odds API not configured" };
  }

  const gate = await canMakeOddsRequest(env, bucket, 1);
  if (!gate.allowed) {
    return {
      items: cached.items,
      refreshed: false,
      cacheUsed: true,
      notice: gate.reason,
    };
  }

  const targetSport = options?.sportKey && !options.sportKey.includes(" ")
    ? options.sportKey
    : (cached.items[0]?.sportKey || "soccer_epl");
  const region = (env.TIPS_ODDS_REGIONS || "eu").split(",")[0]?.trim() || "eu";

  try {
    const { data } = await fetchOddsApiJson<OddsEventLike[]>(
      env,
      (apiKey) => {
        const u = new URL(`${ODDS_API_BASE}/sports/${encodeURIComponent(targetSport)}/odds`);
        u.searchParams.set("apiKey", apiKey);
        u.searchParams.set("regions", region);
        u.searchParams.set("markets", "h2h");
        u.searchParams.set("oddsFormat", "decimal");
        u.searchParams.set("dateFormat", "iso");
        return u;
      },
      {
        timeoutMs: 8000,
        retries: 1,
        creditContext: {
          bucket,
          estimatedCost: 1,
          endpoint: `/v4/sports/${targetSport}/odds`,
        },
      }
    );
    await processOddsIntelligence(env, Array.isArray(data) ? data : [], {
      dispatchValueAlerts: bucket === "odds_refresh",
    });
    const updated = await getCachedBestOdds(env, { limit: 10, sportQuery: options?.sportKey });
    return { items: updated.items, refreshed: true, cacheUsed: false };
  } catch (err) {
    return {
      items: cached.items,
      refreshed: false,
      cacheUsed: true,
      notice: err instanceof Error ? err.message : String(err),
    };
  }
}
