import type { Env } from "./types";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const SLOT_CRONS = new Set(["30 2 * * *", "30 6 * * *", "30 12 * * *"]);
const TIP_LEASE_MINUTES = 15;
const ODDS_API_RETRIES = 2;
const DEFAULT_TIPS_PER_SLOT = 3;

interface OddsOutcome { name: string; price: number; }
interface OddsMarket { key: string; outcomes: OddsOutcome[]; }
interface OddsBookmaker { key: string; title: string; markets: OddsMarket[]; }
interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

export interface TipCandidate {
  event: OddsEvent;
  selection: string;
  market: string;
  averageOdds: number;
  impliedProbability: number;
  bookmakerCount: number;
  sportGroup: string;
  emoji: string;
}

export interface PostedTipSummary {
  eventId: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  selection: string;
  market: string;
  odds: number;
  bookmakerCount: number;
  marketProbability: number;
}

function csv(value: string | undefined, fallback: string): string[] {
  return (value || fallback).split(",").map((item) => item.trim()).filter(Boolean);
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function decimalPrice(price: number): number {
  return Number.isFinite(price) && price > 1 ? price : 0;
}

function sportMeta(sportKey: string, title: string): { group: string; emoji: string } {
  const key = `${sportKey} ${title}`.toLowerCase();
  if (key.includes("cricket")) return { group: "cricket", emoji: "🏏" };
  if (key.includes("soccer") || key.includes("football")) return { group: "football", emoji: "⚽" };
  if (key.includes("basketball")) return { group: "basketball", emoji: "🏀" };
  if (key.includes("table") && key.includes("tennis")) return { group: "table_tennis", emoji: "🏓" };
  if (key.includes("esport") || key.includes("cs2") || key.includes("dota") || key.includes("valorant")) {
    return { group: "esports", emoji: "🎮" };
  }
  if (key.includes("tennis")) return { group: "tennis", emoji: "🎾" };
  return { group: sportKey, emoji: "🏆" };
}

function candidateScore(candidate: TipCandidate): number {
  // This is a market-quality score, not a prediction of the match result.
  const probabilityScore = candidate.impliedProbability * 100;
  const bookmakerScore = Math.min(candidate.bookmakerCount, 8) * 2;
  const oddsPenalty = candidate.averageOdds > 2.2 ? (candidate.averageOdds - 2.2) * 4 : 0;
  return probabilityScore + bookmakerScore - oddsPenalty;
}

export function chooseCandidates(events: OddsEvent[], minOdds: number, maxOdds: number, limit = DEFAULT_TIPS_PER_SLOT): TipCandidate[] {
  const candidates: TipCandidate[] = [];

  for (const event of events) {
    if (!event.id || !event.commence_time || new Date(event.commence_time).getTime() <= Date.now()) continue;

    const meta = sportMeta(event.sport_key, event.sport_title);
    const bySelection = new Map<string, number[]>();
    let bookmakerCount = 0;

    for (const bookmaker of event.bookmakers || []) {
      const market = (bookmaker.markets || []).find((item) => item.key === "h2h");
      if (!market) continue;
      bookmakerCount += 1;
      for (const outcome of market.outcomes || []) {
        const price = decimalPrice(Number(outcome.price));
        if (!price) continue;
        const prices = bySelection.get(outcome.name) || [];
        prices.push(price);
        bySelection.set(outcome.name, prices);
      }
    }

    for (const [selection, prices] of bySelection) {
      if (prices.length < 2) continue;
      const averageOdds = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      if (averageOdds < minOdds || averageOdds > maxOdds) continue;
      const impliedProbability = prices.reduce((sum, price) => sum + 1 / price, 0) / prices.length;
      candidates.push({
        event,
        selection,
        market: "h2h",
        averageOdds,
        impliedProbability,
        bookmakerCount,
        sportGroup: meta.group,
        emoji: meta.emoji,
      });
    }
  }

  candidates.sort((a, b) => candidateScore(b) - candidateScore(a) || b.bookmakerCount - a.bookmakerCount || a.averageOdds - b.averageOdds);

  // Prefer different sports in the same post. If fewer than `limit` sports qualify,
  // fill the remaining positions with the next-best unique events.
  const selected: TipCandidate[] = [];
  const usedSports = new Set<string>();
  const usedEvents = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (usedSports.has(candidate.sportGroup) || usedEvents.has(candidate.event.id)) continue;
    selected.push(candidate);
    usedSports.add(candidate.sportGroup);
    usedEvents.add(candidate.event.id);
  }

  if (selected.length < limit) {
    for (const candidate of candidates) {
      if (selected.length >= limit) break;
      if (usedEvents.has(candidate.event.id)) continue;
      selected.push(candidate);
      usedEvents.add(candidate.event.id);
    }
  }

  return selected;
}

/** Backwards-compatible single-candidate helper used by existing tests/callers. */
export function chooseCandidate(events: OddsEvent[], minOdds: number, maxOdds: number): TipCandidate | null {
  return chooseCandidates(events, minOdds, maxOdds, 1)[0] || null;
}

function retryDelayMs(attempt: number, retryAfter: string | null): number {
  const retrySeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(retrySeconds) && retrySeconds >= 0) return Math.min(retrySeconds * 1000, 5000);
  return Math.min(500 * 2 ** attempt, 4000);
}

async function getJson<T>(url: URL, timeoutMs: number): Promise<T> {
  for (let attempt = 0; attempt <= ODDS_API_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const text = await response.text();
      if (response.ok) return JSON.parse(text) as T;

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === ODDS_API_RETRIES) {
        throw new Error(`Odds API ${response.status}: ${text.slice(0, 300)}`);
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt, response.headers.get("Retry-After"))));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Odds API request failed after retries");
}

export function slotForCron(cron: string): "08:00" | "12:00" | "18:00" | null {
  if (cron === "30 2 * * *") return "08:00";
  if (cron === "30 6 * * *") return "12:00";
  if (cron === "30 12 * * *") return "18:00";
  return null;
}

export function sriLankaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function tipCount(env: Env): number {
  const parsed = Number(env.TIPS_PER_SLOT || DEFAULT_TIPS_PER_SLOT);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : DEFAULT_TIPS_PER_SLOT;
}

async function fetchCandidates(env: Env): Promise<TipCandidate[]> {
  if (!env.ODDS_API_KEY) throw new Error("ODDS_API_KEY is not configured");

  const sports = csv(env.TIPS_SPORTS, "soccer_epl,basketball_nba,cricket_international_t20");
  const regions = env.TIPS_ODDS_REGIONS || "uk,eu";
  const minOdds = Number(env.TIPS_MIN_ODDS || "1.40");
  const maxOdds = Number(env.TIPS_MAX_ODDS || "2.50");
  const hoursAhead = Math.max(2, Number(env.TIPS_HOURS_AHEAD || "48"));

  const results = await Promise.allSettled(sports.map(async (sport) => {
    const url = new URL(`${ODDS_API_BASE}/sports/${encodeURIComponent(sport)}/odds`);
    url.searchParams.set("apiKey", env.ODDS_API_KEY!);
    url.searchParams.set("regions", regions);
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");

    const events = await getJson<OddsEvent[]>(url, 8000);
    const now = Date.now();
    const filtered = events.filter((event) => {
      const start = new Date(event.commence_time).getTime();
      return Number.isFinite(start) && start > now && start <= now + hoursAhead * 60 * 60 * 1000;
    });
    return chooseCandidates(filtered, minOdds, maxOdds, sports.length);
  }));

  const candidates: TipCandidate[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") candidates.push(...result.value);
    else console.warn("[Tips] Sport feed failed:", result.reason instanceof Error ? result.reason.message : result.reason);
  }

  const deduped = new Map<string, TipCandidate>();
  for (const candidate of candidates) {
    const current = deduped.get(candidate.event.id);
    if (!current || candidateScore(candidate) > candidateScore(current)) deduped.set(candidate.event.id, candidate);
  }

  const uniqueCandidates = [...deduped.values()].sort((a, b) => candidateScore(b) - candidateScore(a));
  return chooseCandidates(uniqueCandidates.map((candidate) => candidate.event), minOdds, maxOdds, tipCount(env));
}

function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(iso));
}

function toPostedSummary(candidate: TipCandidate): PostedTipSummary {
  return {
    eventId: candidate.event.id,
    sportKey: candidate.event.sport_key,
    sportTitle: candidate.event.sport_title,
    homeTeam: candidate.event.home_team,
    awayTeam: candidate.event.away_team,
    commenceTime: candidate.event.commence_time,
    selection: candidate.selection,
    market: candidate.market,
    odds: candidate.averageOdds,
    bookmakerCount: candidate.bookmakerCount,
    marketProbability: candidate.impliedProbability,
  };
}

function formatTipMessage(candidates: TipCandidate[], slot: string, joinUrl?: string): string {
  const lines = [
    "🇱🇰 <b>FREE TIPS — SRI LANKA</b>",
    `🕐 <b>${escapeHtml(slot)} Sri Lanka time</b>`,
    `🎯 <b>${candidates.length} quality tip${candidates.length === 1 ? "" : "s"}</b>`,
    "━━━━━━━━━━━━━━━━━━",
  ];

  candidates.forEach((candidate, index) => {
    lines.push(
      `${candidate.emoji} <b>TIP ${index + 1} — ${escapeHtml(candidate.event.sport_title)}</b>`,
      `⚔️ ${escapeHtml(candidate.event.home_team)} vs ${escapeHtml(candidate.event.away_team)}`,
      `🗓️ ${escapeHtml(formatKickoff(candidate.event.commence_time))} (SL)`,
      `🎯 <b>Pick:</b> ${escapeHtml(candidate.selection)}`,
      `📊 <b>Market:</b> ${escapeHtml(candidate.market.toUpperCase())}`,
      `💹 <b>Average odds:</b> ${candidate.averageOdds.toFixed(2)}`,
      `🏪 <b>Bookmakers:</b> ${candidate.bookmakerCount}`,
      `📈 <b>Market probability:</b> ${(candidate.impliedProbability * 100).toFixed(1)}%`,
      "━━━━━━━━━━━━━━━━━━",
    );
  });

  lines.push(
    "ℹ️ Picks are ranked using bookmaker-market data. Market probability is not a guarantee or a prediction model.",
    "⚠️ <b>Bet responsibly.</b> Never stake money you cannot afford to lose.",
  );

  if (joinUrl) lines.push(`\n<a href="${escapeHtml(joinUrl)}">📣 Join our channel for more free tips</a>`);
  return lines.join("\n");
}

function formatFallbackTip(slot: string, joinUrl?: string): string {
  const lines = [
    "🇱🇰 <b>FREE TIPS UPDATE</b>",
    `🕐 <b>${escapeHtml(slot)} Sri Lanka time</b>`,
    "━━━━━━━━━━━━━━━━━━",
    "ℹ️ No qualifying matches were available for this slot.",
    "✅ We do not publish forced or low-confidence picks.",
    "📢 The next scheduled update will be published automatically.",
    "",
    "⚠️ Bet responsibly and only what you can afford to lose.",
  ];
  if (joinUrl) lines.push(`\n<a href="${escapeHtml(joinUrl)}">📣 Join our channel</a>`);
  return lines.join("\n");
}

async function postTelegramMessage(env: Env, message: string): Promise<number | null> {
  const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(env.BOT_TOKEN)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TIPS_CHANNEL_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const telegram = (await response.json()) as { ok: boolean; description?: string; result?: { message_id?: number } };
  if (!response.ok || !telegram.ok) {
    throw new Error(`Telegram send failed: ${telegram.description || response.status}`);
  }
  return telegram.result?.message_id ?? null;
}

async function claimTipSlot(env: Env, scheduledKey: string, slot: string): Promise<{ claimed: boolean; id: number; leaseToken: string }> {
  const leaseToken = crypto.randomUUID();

  const insertResult = await env.DB.prepare(
    `INSERT OR IGNORE INTO tip_posts
      (scheduled_key, slot_time, status, lease_token, lease_expires_at, attempt_count, created_at, updated_at)
     VALUES (?, ?, 'PROCESSING', ?, datetime('now', '+${TIP_LEASE_MINUTES} minutes'), 1, datetime('now'), datetime('now'))`
  ).bind(scheduledKey, slot, leaseToken).run();

  const row = await env.DB.prepare(
    `SELECT id, status, lease_token, lease_expires_at
     FROM tip_posts WHERE scheduled_key = ?`
  ).bind(scheduledKey).first<{ id: number; status: string; lease_token: string | null; lease_expires_at: string | null }>();

  if (!row) throw new Error("Tip slot record could not be created or loaded");
  if (row.status === "POSTED") return { claimed: false, id: row.id, leaseToken };

  const insertChanges = insertResult.meta?.changes ?? 0;
  if (insertChanges > 0) return { claimed: true, id: row.id, leaseToken };

  if (row.status === "PROCESSING" && row.lease_expires_at && row.lease_expires_at > new Date().toISOString().replace("T", " ").slice(0, 19)) {
    return { claimed: false, id: row.id, leaseToken };
  }

  const result = await env.DB.prepare(
    `UPDATE tip_posts
        SET status='PROCESSING', lease_token=?, lease_expires_at=datetime('now', '+${TIP_LEASE_MINUTES} minutes'),
            attempt_count=attempt_count+1, error=NULL, updated_at=datetime('now')
      WHERE id=? AND status <> 'POSTED'
        AND (status <> 'PROCESSING' OR lease_expires_at IS NULL OR lease_expires_at <= datetime('now'))`
  ).bind(leaseToken, row.id).run();

  const changes = result.meta?.changes ?? (result.success ? 1 : 0);
  return { claimed: changes > 0, id: row.id, leaseToken };
}

async function markTipPosted(env: Env, id: number, candidates: TipCandidate[], telegramMessageId: number | null): Promise<void> {
  const first = candidates[0];
  const payload = JSON.stringify(candidates.map(toPostedSummary));
  await env.DB.prepare(
    `UPDATE tip_posts
        SET status='POSTED', event_id=?, sport_key=?, sport_title=?, home_team=?, away_team=?, commence_time=?,
            market=?, selection=?, odds=?, message_id=?, tips_json=?, posted_at=datetime('now'),
            error=NULL, lease_token=NULL, lease_expires_at=NULL, updated_at=datetime('now')
      WHERE id=?`
  ).bind(
    first?.event.id ?? null,
    first?.event.sport_key ?? null,
    first?.event.sport_title ?? null,
    first?.event.home_team ?? null,
    first?.event.away_team ?? null,
    first?.event.commence_time ?? null,
    first?.market ?? null,
    first?.selection ?? null,
    first?.averageOdds ?? null,
    telegramMessageId,
    payload,
    id,
  ).run();
}

async function markTipFailed(env: Env, id: number, error: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE tip_posts
        SET status='FAILED', error=?, lease_token=NULL, lease_expires_at=NULL, updated_at=datetime('now')
      WHERE id=? AND status <> 'POSTED'`
  ).bind(error, id).run();
}

export async function runScheduledTip(env: Env, cron: string): Promise<{ status: string; slot: string }> {
  if (!SLOT_CRONS.has(cron)) return { status: "skipped", slot: "" };
  const slot = slotForCron(cron);
  if (!slot) return { status: "skipped", slot: "" };

  const scheduledKey = `${sriLankaDate()}:${slot}`;

  let claim: { claimed: boolean; id: number; leaseToken: string };
  try {
    claim = await claimTipSlot(env, scheduledKey, slot);
  } catch (error) {
    console.error(`[Tips] claimTipSlot failed for ${scheduledKey}:`, error instanceof Error ? error.message : error);
    return { status: "claim_failed", slot };
  }

  if (!claim.claimed) {
    console.log(`[Tips] Slot ${scheduledKey} already claimed or posted — skipping.`);
    return { status: "already_claimed", slot };
  }

  const joinUrl = env.TIPS_CHANNEL_URL || undefined;

  try {
    let message: string;
    let candidates: TipCandidate[] = [];

    try {
      candidates = await fetchCandidates(env);
      if (candidates.length === 0) throw new Error("No qualifying candidates were found");
      message = formatTipMessage(candidates, slot, joinUrl);
    } catch (fetchError) {
      console.warn(`[Tips] fetchCandidates failed for ${scheduledKey}:`, fetchError instanceof Error ? fetchError.message : fetchError);
      message = formatFallbackTip(slot, joinUrl);
    }

    const telegramMessageId = await postTelegramMessage(env, message);
    await markTipPosted(env, claim.id, candidates, telegramMessageId);
    console.log(`[Tips] Posted ${candidates.length} tip(s) for ${scheduledKey} (msg ${telegramMessageId})`);
    return { status: candidates.length > 0 ? "posted" : "posted_fallback", slot };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Tips] runScheduledTip failed for ${scheduledKey}:`, errorMsg);
    await markTipFailed(env, claim.id, errorMsg).catch((e) =>
      console.error(`[Tips] markTipFailed also failed:`, e instanceof Error ? e.message : e)
    );
    return { status: "failed", slot };
  }
}
