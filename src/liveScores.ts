import type { Env } from "./types";
import { fetchOddsApiJson, hasOddsApiKeys } from "./oddsKeys";
import { canMakeOddsRequest } from "./oddsCreditManager";
import type { OddsScoreEvent } from "./tipsSettlement";
import { escapeMarkdown } from "./utils";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

export interface LiveScoreRecord {
  eventId: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string | null;
  scoreHome: string | null;
  scoreAway: string | null;
  completed: boolean;
  isLive: boolean;
  statusText: string;
  lastUpdate: string | null;
  fetchedAt: string;
}

function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function extractHomeAwayScores(event: OddsScoreEvent): { scoreHome: string | null; scoreAway: string | null } {
  if (!Array.isArray(event.scores) || event.scores.length < 2) {
    return { scoreHome: null, scoreAway: null };
  }
  const normHome = normalizeTeam(event.home_team || "");
  const normAway = normalizeTeam(event.away_team || "");
  let scoreHome: string | null = null;
  let scoreAway: string | null = null;
  for (const s of event.scores) {
    const n = normalizeTeam(s.name || "");
    if (n && n === normHome) scoreHome = String(s.score);
    else if (n && n === normAway) scoreAway = String(s.score);
  }
  if (scoreHome === null && scoreAway === null && event.scores.length >= 2) {
    scoreHome = String(event.scores[0]?.score ?? "");
    scoreAway = String(event.scores[1]?.score ?? "");
  }
  return { scoreHome, scoreAway };
}

export async function upsertLiveScoreEvents(
  env: Partial<Env>,
  events: OddsScoreEvent[],
  onlyEventIds?: ReadonlySet<string>
): Promise<number> {
  if (!env.DB || typeof env.DB.prepare !== "function" || events.length === 0) return 0;

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const filtered = onlyEventIds && onlyEventIds.size > 0
    ? events.filter((e) => onlyEventIds.has(e.id))
    : events.slice(0, 40);

  if (filtered.length === 0) return 0;

  const statements: any[] = [];
  for (const ev of filtered) {
    if (!ev?.id) continue;
    const { scoreHome, scoreAway } = extractHomeAwayScores(ev);
    const kickoffMs = ev.commence_time ? Date.parse(ev.commence_time) : NaN;
    const started = Number.isFinite(kickoffMs) ? kickoffMs <= nowMs : Boolean(scoreHome !== null || ev.completed);
    const completed = ev.completed ? 1 : 0;
    const isLive = !completed && started ? 1 : 0;
    const statusText = completed
      ? "FT"
      : (ev.status || (isLive ? "LIVE" : "UPCOMING"));

    statements.push(
      env.DB.prepare(`
        INSERT INTO live_score_cache (
          event_id, sport_key, sport_title, home_team, away_team, commence_time,
          score_home, score_away, completed, status_text, is_live, last_update, fetched_at
        )
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(event_id) DO UPDATE SET
          sport_key=excluded.sport_key,
          sport_title=excluded.sport_title,
          commence_time=COALESCE(excluded.commence_time, live_score_cache.commence_time),
          score_home=COALESCE(excluded.score_home, live_score_cache.score_home),
          score_away=COALESCE(excluded.score_away, live_score_cache.score_away),
          completed=excluded.completed,
          status_text=excluded.status_text,
          is_live=excluded.is_live,
          last_update=COALESCE(excluded.last_update, live_score_cache.last_update),
          fetched_at=excluded.fetched_at
      `).bind(
        ev.id,
        ev.sport_key,
        ev.sport_title || ev.sport_key,
        ev.home_team,
        ev.away_team,
        ev.commence_time || null,
        scoreHome,
        scoreAway,
        completed,
        statusText,
        isLive,
        ev.last_update || null,
        nowIso
      )
    );
  }

  let saved = 0;
  try {
    for (let i = 0; i < statements.length; i += 40) {
      await env.DB.batch(statements.slice(i, i + 40));
      saved += Math.min(40, statements.length - i);
    }
  } catch (err) {
    console.warn("[LiveScores] Cache upsert failed:", err instanceof Error ? err.message : err);
  }
  return saved;
}

function resolveChannelTarget(env: Partial<Env>): string {
  const raw = (env.TIPS_CHANNEL_ID || env.CHANNEL_USERNAME || "").trim();
  if (!raw) return "";
  return raw.startsWith("@") ? raw : raw.replace(/^id:\s*/i, "").trim();
}

async function sendChannelScoreNotification(env: Partial<Env>, text: string): Promise<boolean> {
  const chatId = resolveChannelTarget(env);
  if (!env.BOT_TOKEN || !chatId) return false;
  try {
    const resp = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    const data = (await resp.json()) as { ok?: boolean };
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

/**
 * Hourly :37 Live Scores update for active posted tip matches:
 * - Reuses score events already fetched during settlement (0 extra credits)
 * - Only spends 1 credit per in-play sport NOT yet fetched if budget < 900 & scores bucket < 160
 * - Sends deduplicated score notifications to Telegram channel only when score/status changed
 */
export async function updateLiveScoresForActiveTips(
  env: Partial<Env>,
  alreadyFetchedSports: ReadonlySet<string> = new Set()
): Promise<{ trackedMatches: number; sportsFetched: number; channelNotifications: number }> {
  if (!env.DB || typeof env.DB.prepare !== "function") {
    return { trackedMatches: 0, sportsFetched: 0, channelNotifications: 0 };
  }

  let tracked: Array<{ eventId: string; sportKey: string; homeTeam: string; awayTeam: string; selection?: string }> = [];
  try {
    const postRows = (await env.DB.prepare(`
      SELECT id, event_id, sport_key, home_team, away_team, selection, commence_time, tips_json
      FROM tip_posts
      WHERE status = 'POSTED'
        AND (result IS NULL OR result = 'PENDING')
        AND datetime(commence_time) <= datetime('now')
        AND datetime(commence_time) >= datetime('now', '-6 hours')
      ORDER BY commence_time DESC
      LIMIT 12
    `).all<Record<string, unknown>>()).results || [];

    const seenEvents = new Set<string>();
    for (const post of postRows) {
      let picks: any[] = [];
      try {
        picks = post.tips_json ? JSON.parse(String(post.tips_json)) : [];
      } catch {
        picks = [];
      }
      if (Array.isArray(picks) && picks.length > 0) {
        for (const p of picks) {
          const eid = String(p?.eventId || "");
          const skey = String(p?.sportKey || post.sport_key || "");
          if (!eid || !skey || seenEvents.has(eid)) continue;
          seenEvents.add(eid);
          tracked.push({
            eventId: eid,
            sportKey: skey,
            homeTeam: String(p?.homeTeam || post.home_team || ""),
            awayTeam: String(p?.awayTeam || post.away_team || ""),
            selection: p?.selection ? String(p.selection) : undefined,
          });
        }
      } else if (post.event_id && post.sport_key) {
        const eid = String(post.event_id);
        if (!seenEvents.has(eid)) {
          seenEvents.add(eid);
          tracked.push({
            eventId: eid,
            sportKey: String(post.sport_key),
            homeTeam: String(post.home_team || ""),
            awayTeam: String(post.away_team || ""),
            selection: post.selection ? String(post.selection) : undefined,
          });
        }
      }
    }
  } catch {
    return { trackedMatches: 0, sportsFetched: 0, channelNotifications: 0 };
  }

  if (tracked.length === 0) {
    return { trackedMatches: 0, sportsFetched: 0, channelNotifications: 0 };
  }

  const trackedIds = new Set(tracked.map((t) => t.eventId));
  const sportsToFetch = [...new Set(tracked.map((t) => t.sportKey))].filter(
    (s) => !alreadyFetchedSports.has(s)
  );

  let sportsFetched = 0;
  if (hasOddsApiKeys(env) && sportsToFetch.length > 0) {
    for (const sport of sportsToFetch.slice(0, 3)) {
      const gate = await canMakeOddsRequest(env, "scores", 1, { isSettlementRetry: false });
      if (!gate.allowed) break;
      try {
        const { data } = await fetchOddsApiJson<OddsScoreEvent[]>(
          env as Env,
          (apiKey) => {
            const url = new URL(`${ODDS_API_BASE}/sports/${encodeURIComponent(sport)}/scores`);
            url.searchParams.set("apiKey", apiKey);
            url.searchParams.set("dateFormat", "iso"); // 1 credit (no daysFrom)
            return url;
          },
          {
            timeoutMs: 8000,
            retries: 1,
            creditContext: {
              bucket: "scores",
              estimatedCost: 1,
              endpoint: `/v4/sports/${sport}/scores`,
              isSettlementRetry: false,
            },
          }
        );
        if (Array.isArray(data)) {
          await upsertLiveScoreEvents(env, data, trackedIds);
          sportsFetched += 1;
        }
      } catch (err) {
        console.warn(`[LiveScores] Live fetch skipped for ${sport}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  // Compare latest cached scores with last_notified_score to emit clean deduplicated updates
  let channelNotifications = 0;
  try {
    const placeholders = [...trackedIds].map(() => "?").join(",");
    const cached = (await env.DB.prepare(
      `SELECT event_id, sport_title, home_team, away_team, score_home, score_away, completed, status_text, last_notified_score
       FROM live_score_cache
       WHERE event_id IN (${placeholders})
         AND score_home IS NOT NULL AND score_away IS NOT NULL`
    ).bind(...trackedIds).all<Record<string, unknown>>()).results || [];

    const changedLines: string[] = [];
    const ackUpdates: any[] = [];
    for (const row of cached) {
      const scoreSig = `${row.completed ? "FT" : "LIVE"}:${row.score_home}-${row.score_away}`;
      if (String(row.last_notified_score || "") === scoreSig) continue;

      const statusBadge = Number(row.completed) === 1 ? "🏁 *FT*" : "🔴 *LIVE*";
      changedLines.push(
        `${statusBadge} (${escapeMarkdown(String(row.sport_title || "Sports"))})\n` +
        `*${escapeMarkdown(String(row.home_team))}*  ${row.score_home} - ${row.score_away}  *${escapeMarkdown(String(row.away_team))}*`
      );
      ackUpdates.push(
        env.DB.prepare(
          `UPDATE live_score_cache SET last_notified_score = ? WHERE event_id = ?`
        ).bind(scoreSig, String(row.event_id))
      );
    }

    if (changedLines.length > 0 && env.BOT_TOKEN && resolveChannelTarget(env)) {
      const message = [
        "📡 *LIVE SCORE UPDATE (සජීවී ලකුණු)* ⚽",
        "━━━━━━━━━━━━━━━━━━━━━━━━━",
        changedLines.join("\n\n"),
        "━━━━━━━━━━━━━━━━━━━━━━━━━",
        "ℹ️ _Hourly score tracker for active daily tips._",
      ].join("\n");
      const sent = await sendChannelScoreNotification(env, message);
      if (sent) {
        channelNotifications = changedLines.length;
        await env.DB.batch(ackUpdates);
      }
    }
  } catch (err) {
    console.warn("[LiveScores] Channel notification check failed:", err instanceof Error ? err.message : err);
  }

  return { trackedMatches: tracked.length, sportsFetched, channelNotifications };
}

export async function getCachedLiveScores(
  env: Partial<Env>,
  limit = 12
): Promise<{ items: LiveScoreRecord[]; latestFetchedAt: string | null }> {
  if (!env.DB || typeof env.DB.prepare !== "function") return { items: [], latestFetchedAt: null };

  const safeLimit = Math.max(1, Math.min(limit, 30));
  try {
    const rows = (await env.DB.prepare(`
      SELECT event_id, sport_key, sport_title, home_team, away_team, commence_time,
             score_home, score_away, completed, status_text, is_live, last_update, fetched_at
      FROM live_score_cache
      WHERE datetime(fetched_at) >= datetime('now', '-36 hours')
      ORDER BY is_live DESC, completed ASC, COALESCE(commence_time, fetched_at) DESC
      LIMIT ?
    `).bind(safeLimit).all<Record<string, unknown>>()).results || [];

    const items: LiveScoreRecord[] = rows
      .filter((r) => Boolean(r?.event_id))
      .map((r) => ({
        eventId: String(r.event_id),
        sportKey: String(r.sport_key || ""),
        sportTitle: String(r.sport_title || r.sport_key || "Sports"),
        homeTeam: String(r.home_team || ""),
        awayTeam: String(r.away_team || ""),
        commenceTime: r.commence_time ? String(r.commence_time) : null,
        scoreHome: r.score_home != null ? String(r.score_home) : null,
        scoreAway: r.score_away != null ? String(r.score_away) : null,
        completed: Number(r.completed || 0) === 1,
        isLive: Number(r.is_live || 0) === 1,
        statusText: String(r.status_text || (Number(r.completed || 0) === 1 ? "FT" : "LIVE")),
        lastUpdate: r.last_update ? String(r.last_update) : null,
        fetchedAt: String(r.fetched_at || ""),
      }));

    // Supplement with recent settled tip_results if live_score_cache is still sparse
    if (items.length < 4) {
      const seen = new Set(items.map((i) => i.eventId));
      const settledRows = (await env.DB.prepare(`
        SELECT event_id, sport_key, sport_title, home_team, away_team, commence_time,
               score_home, score_away, completed, settled_at, updated_at
        FROM tip_results
        WHERE score_home IS NOT NULL AND score_away IS NOT NULL
        ORDER BY COALESCE(settled_at, updated_at) DESC
        LIMIT ?
      `).bind(safeLimit).all<Record<string, unknown>>()).results || [];

      for (const r of settledRows) {
        const eid = String(r?.event_id || "");
        if (!eid || seen.has(eid)) continue;
        seen.add(eid);
        items.push({
          eventId: eid,
          sportKey: String(r.sport_key || ""),
          sportTitle: String(r.sport_title || r.sport_key || "Sports"),
          homeTeam: String(r.home_team || ""),
          awayTeam: String(r.away_team || ""),
          commenceTime: r.commence_time ? String(r.commence_time) : null,
          scoreHome: String(r.score_home),
          scoreAway: String(r.score_away),
          completed: Number(r.completed || 0) === 1,
          isLive: false,
          statusText: Number(r.completed || 0) === 1 ? "FT" : "PENDING",
          lastUpdate: r.settled_at ? String(r.settled_at) : null,
          fetchedAt: String(r.updated_at || ""),
        });
        if (items.length >= safeLimit) break;
      }
    }

    const latestFetchedAt = items.reduce<string | null>((latest, cur) => {
      if (!cur.fetchedAt) return latest;
      return !latest || cur.fetchedAt > latest ? cur.fetchedAt : latest;
    }, null);

    return { items, latestFetchedAt };
  } catch {
    return { items: [], latestFetchedAt: null };
  }
}

/**
 * On-demand /scores bot helper: serves D1 cache first (0 credits), refreshing live
 * via the 80-credit on_demand bucket only when cache is stale (> 15m) & budget < 950.
 */
export async function getLiveScoresOnDemand(
  env: Env,
  options?: { maxAgeMinutes?: number; forceLive?: boolean }
): Promise<{ items: LiveScoreRecord[]; refreshed: boolean; cacheUsed: boolean; notice?: string }> {
  const maxAgeMinutes = options?.maxAgeMinutes ?? 15;
  const cached = await getCachedLiveScores(env, 12);

  const latestAgeMin = cached.latestFetchedAt
    ? (Date.now() - Date.parse(cached.latestFetchedAt.endsWith("Z") ? cached.latestFetchedAt : `${cached.latestFetchedAt}Z`)) / 60_000
    : Infinity;

  if (!options?.forceLive && cached.items.length > 0 && Number.isFinite(latestAgeMin) && latestAgeMin <= maxAgeMinutes) {
    return { items: cached.items, refreshed: false, cacheUsed: true };
  }

  if (!hasOddsApiKeys(env)) {
    return { items: cached.items, refreshed: false, cacheUsed: true, notice: "Odds API not configured" };
  }

  const gate = await canMakeOddsRequest(env, "on_demand", 1);
  if (!gate.allowed) {
    return { items: cached.items, refreshed: false, cacheUsed: true, notice: gate.reason };
  }

  // Choose the most relevant active tip sport_key (fallback to soccer_epl)
  let targetSport = cached.items[0]?.sportKey || "";
  if (!targetSport && env.DB) {
    try {
      const row = await env.DB.prepare(
        `SELECT sport_key FROM tip_posts WHERE status = 'POSTED' AND sport_key IS NOT NULL ORDER BY created_at DESC LIMIT 1`
      ).first<{ sport_key?: string }>();
      targetSport = row?.sport_key || "";
    } catch {}
  }
  if (!targetSport) targetSport = "soccer_epl";

  try {
    const { data } = await fetchOddsApiJson<OddsScoreEvent[]>(
      env,
      (apiKey) => {
        const url = new URL(`${ODDS_API_BASE}/sports/${encodeURIComponent(targetSport)}/scores`);
        url.searchParams.set("apiKey", apiKey);
        url.searchParams.set("dateFormat", "iso");
        return url;
      },
      {
        timeoutMs: 8000,
        retries: 1,
        creditContext: {
          bucket: "on_demand",
          estimatedCost: 1,
          endpoint: `/v4/sports/${targetSport}/scores`,
        },
      }
    );
    if (Array.isArray(data)) {
      await upsertLiveScoreEvents(env, data);
    }
    const updated = await getCachedLiveScores(env, 12);
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
