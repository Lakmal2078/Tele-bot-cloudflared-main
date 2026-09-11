import type { Env } from "./types";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const SLOT_CRONS = new Set(["30 2 * * *", "30 6 * * *", "30 12 * * *"]);
const TIP_LEASE_MINUTES = 15;
const ODDS_API_RETRIES = 2;

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
interface TipCandidate {
  event: OddsEvent;
  selection: string;
  market: string;
  averageOdds: number;
  impliedProbability: number;
  bookmakerCount: number;
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

export function chooseCandidate(events: OddsEvent[], minOdds: number, maxOdds: number): TipCandidate | null {
  const candidates: TipCandidate[] = [];

  for (const event of events) {
    if (!event.id || !event.commence_time || new Date(event.commence_time).getTime() <= Date.now()) continue;

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
      candidates.push({ event, selection, market: "h2h", averageOdds, impliedProbability, bookmakerCount });
    }
  }

  candidates.sort((a, b) =>
    b.impliedProbability - a.impliedProbability ||
    b.bookmakerCount - a.bookmakerCount ||
    a.averageOdds - b.averageOdds
  );
  return candidates[0] || null;
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

async function fetchCandidate(env: Env): Promise<TipCandidate> {
  if (!env.ODDS_API_KEY) throw new Error("ODDS_API_KEY is not configured");
  const sports = csv(env.TIPS_SPORTS, "soccer_epl");
  const regions = env.TIPS_ODDS_REGIONS || "uk,eu";
  const minOdds = Number(env.TIPS_MIN_ODDS || "1.40");
  const maxOdds = Number(env.TIPS_MAX_ODDS || "2.50");
  const hoursAhead = Math.max(2, Number(env.TIPS_HOURS_AHEAD || "48"));

  for (const sport of sports) {
    const url = new URL(`${ODDS_API_BASE}/sports/${encodeURIComponent(sport)}/odds`);
    url.searchParams.set("apiKey", env.ODDS_API_KEY);
    url.searchParams.set("regions", regions);
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "decimal");
    url.searchParams.set("dateFormat", "iso");
    try {
      const events = await getJson<OddsEvent[]>(url, 8000);
      const now = Date.now();
      const filtered = events.filter((event) => {
        const start = new Date(event.commence_time).getTime();
        return Number.isFinite(start) && start > now && start <= now + hoursAhead * 60 * 60 * 1000;
      });
      const candidate = chooseCandidate(filtered, minOdds, maxOdds);
      if (candidate) return candidate;
    } catch (error) {
      console.warn(`[Tips] Failed sport ${sport}:`, error instanceof Error ? error.message : error);
    }
  }
  throw new Error("No suitable upcoming odds candidate was found");
}

function formatTip(candidate: TipCandidate, slot: string, joinUrl?: string): string {
  const kickoff = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(candidate.event.commence_time));
  const joinLine = joinUrl
    ? `\n\n<a href="${escapeHtml(joinUrl)}">📣 Join our channel for more free tips</a>`
    : "";
  return [
    "⚽ <b>FREE TIP</b>",
    `🕐 ${escapeHtml(slot)} Sri Lanka time`,
    "━━━━━━━━━━━━━━━━━━",
    `🏆 <b>${escapeHtml(candidate.event.sport_title)}</b>`,
    `⚔️ ${escapeHtml(candidate.event.home_team)} vs ${escapeHtml(candidate.event.away_team)}`,
    `🗓️ ${escapeHtml(kickoff)} (Sri Lanka)`,
    "",
    `🎯 <b>Pick:</b> ${escapeHtml(candidate.selection)}`,
    `📊 <b>Market:</b> ${escapeHtml(candidate.market.toUpperCase())}`,
    `💹 <b>Average odds:</b> ${candidate.averageOdds.toFixed(2)}`,
    `🏪 <b>Bookmakers checked:</b> ${candidate.bookmakerCount}`,
    `📈 <b>Market implied probability:</b> ${(candidate.impliedProbability * 100).toFixed(1)}%`,
    "",
    "⚠️ <b>Important:</b> Odds are market data, not a guarantee of a winning result. Bet responsibly and only what you can afford to lose.",
    joinLine,
  ].join("\n");
}

async function claimTipSlot(env: Env, scheduledKey: string, slot: string): Promise<{ claimed: boolean; id: number; leaseToken: string }> {
  const leaseToken = crypto.randomUUID();

  // INSERT OR IGNORE is critical: overlapping cron invocations must never turn the
  // unique-key conflict into a failure that marks another invocation's row FAILED.
  await env.DB.prepare(
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

export async function runScheduledTip(env: Env, cron: string): Promise<{ status: string; slot: string }> {
  if (!SLOT_CRONS.has(cron)) return { status: "ignored", slot: "" };
  if (!env.TIPS_CHANNEL_ID) throw new Error("TIPS_CHANNEL_ID is not configured");

  const slot = slotForCron(cron)!;
  const scheduledKey = `${sriLankaDate()}:${slot}`;
  const claim = await claimTipSlot(env, scheduledKey, slot);
  if (!claim.claimed) {
    const row = await env.DB.prepare(`SELECT status FROM tip_posts WHERE id = ?`).bind(claim.id).first<{ status: string }>();
    return { status: row?.status === "POSTED" ? "already_posted" : "processing", slot };
  }

  try {
    const candidate = await fetchCandidate(env);
    const joinUrl = env.TIPS_CHANNEL_URL || (env.TIPS_CHANNEL_ID.startsWith("@") ? `https://t.me/${env.TIPS_CHANNEL_ID.slice(1)}` : undefined);
    const message = formatTip(candidate, slot, joinUrl);
    const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(env.BOT_TOKEN)}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.TIPS_CHANNEL_ID, text: message, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const telegram = (await response.json()) as { ok: boolean; description?: string; result?: { message_id?: number } };
    if (!response.ok || !telegram.ok) throw new Error(`Telegram send failed: ${telegram.description || response.status}`);

    const updated = await env.DB.prepare(
      `UPDATE tip_posts
          SET status='POSTED', event_id=?, sport_key=?, sport_title=?, home_team=?, away_team=?, commence_time=?,
              market=?, selection=?, odds=?, message_id=?, posted_at=datetime('now'), updated_at=datetime('now'),
              lease_token=NULL, lease_expires_at=NULL, error=NULL
        WHERE scheduled_key=? AND lease_token=?`
    ).bind(
      candidate.event.id, candidate.event.sport_key, candidate.event.sport_title, candidate.event.home_team,
      candidate.event.away_team, candidate.event.commence_time, candidate.market, candidate.selection,
      candidate.averageOdds, telegram.result?.message_id ?? null, scheduledKey, claim.leaseToken
    ).run();

    const changes = updated.meta?.changes ?? (updated.success ? 1 : 0);
    if (changes === 0) {
      // Do not overwrite another worker's ownership. The Telegram message was sent,
      // so the slot is deliberately left for operational reconciliation instead of
      // being marked FAILED and retried blindly.
      console.error(`[Tips] Telegram send succeeded but lease ownership was lost for ${scheduledKey}`);
      return { status: "sent_unconfirmed", slot };
    }

    return { status: "posted", slot };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await env.DB.prepare(
      `UPDATE tip_posts
          SET status='FAILED', error=?, updated_at=datetime('now'), lease_token=NULL, lease_expires_at=NULL
        WHERE scheduled_key=? AND lease_token=?`
    ).bind(message.slice(0, 1000), scheduledKey, claim.leaseToken).run();
    throw error;
  }
}
