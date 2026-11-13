import type { Env } from "./types";
import { escapeMarkdown } from "./utils";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

export interface OddsScoreItem {
  name: string;
  score: string;
}

export interface OddsScoreEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  cancelled?: boolean;
  status?: string;
  away_team: string;
  scores: OddsScoreItem[] | null;
  last_update?: string | null;
}

export interface PickResultRecord {
  id?: number;
  tip_post_id: number;
  event_id: string;
  sport_key: string;
  sport_title?: string;
  home_team: string;
  away_team: string;
  commence_time?: string;
  selection: string;
  market: string;
  odds: number;
  result: "PENDING" | "WON" | "LOST" | "VOID";
  score_home?: string | null;
  score_away?: string | null;
  completed: number;
  settled_at?: string | null;
}

export interface SettlementSummary {
  checkedPosts: number;
  evaluatedPicks: number;
  wonPicks: number;
  lostPicks: number;
  voidPicks: number;
  settledPosts: number;
  editedTelegramMessages: number;
  errors: string[];
  skippedCompletedPicks?: number;
  requeuedBackoff?: number;
}

/**
 * Normalizes team name or selection string for fuzzy matching (removes FC, United, accents, etc.)
 */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(c\.?f\.?|f\.?c\.?|a\.?f\.?c\.?|s\.?c\.?|f\.?k\.?|s\.?k\.?|s\.?s\.?c\.?|united|utd|city|town|club)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parseNumericScore(raw: string | undefined | null): number {
  if (!raw) return NaN;
  const trimmed = String(raw).trim();
  const direct = Number(trimmed);
  if (Number.isFinite(direct)) return direct;
  // Cricket runs notation: "185/6" -> 185 runs
  const cricketMatch = trimmed.match(/^(\d+)(?:\/\d+)?/);
  if (cricketMatch) return Number(cricketMatch[1]);
  return NaN;
}

/**
 * Evaluates whether a pick won, lost, or voided based on match scores.
 */
export function evaluatePickResult(
  selection: string,
  homeTeam: string,
  awayTeam: string,
  scores: OddsScoreItem[] | null | undefined,
  completed: boolean
): { result: "PENDING" | "WON" | "LOST" | "VOID"; scoreHome: string | null; scoreAway: string | null } {
  if (!completed || !scores || scores.length < 2) {
    return { result: "PENDING", scoreHome: null, scoreAway: null };
  }

  const normHome = normalizeTeamName(homeTeam);
  const normAway = normalizeTeamName(awayTeam);

  let homeScoreNum = NaN;
  let awayScoreNum = NaN;
  let rawHomeScore: string | null = null;
  let rawAwayScore: string | null = null;

  for (const item of scores) {
    const normItemName = normalizeTeamName(item.name);
    const val = parseNumericScore(item.score);
    if (normItemName && normItemName === normHome) {
      homeScoreNum = val;
      rawHomeScore = item.score;
    } else if (normItemName && normItemName === normAway) {
      awayScoreNum = val;
      rawAwayScore = item.score;
    }
  }

  if (Number.isNaN(homeScoreNum) || Number.isNaN(awayScoreNum)) {
    return { result: "PENDING", scoreHome: rawHomeScore, scoreAway: rawAwayScore };
  }

  // Totals Market evaluation (e.g. "Over 2.5", "Under 215.5")
  const isOverPick = /^over\b/i.test(selection.trim());
  const isUnderPick = /^under\b/i.test(selection.trim());
  if (isOverPick || isUnderPick) {
    const lineMatch = selection.match(/[\d.]+/);
    if (lineMatch) {
      const line = Number(lineMatch[0]);
      const totalScore = homeScoreNum + awayScoreNum;
      if (totalScore === line) {
        return { result: "VOID", scoreHome: rawHomeScore, scoreAway: rawAwayScore };
      }
      const won = isOverPick ? totalScore > line : totalScore < line;
      return { result: won ? "WON" : "LOST", scoreHome: rawHomeScore, scoreAway: rawAwayScore };
    }
  }

  const normSelection = normalizeTeamName(selection);
  const isDrawPick =
    normSelection === "draw" ||
    normSelection === "tie" ||
    normSelection === "x" ||
    selection.toLowerCase() === "draw";

  // Match outcome calculation
  if (homeScoreNum > awayScoreNum) {
    // Home Win
    const pickedHome =
      normSelection === normHome ||
      normSelection.includes(normHome) ||
      normHome.includes(normSelection) ||
      selection.toLowerCase() === "home" ||
      selection.toLowerCase() === "1";
    return {
      result: pickedHome ? "WON" : "LOST",
      scoreHome: rawHomeScore,
      scoreAway: rawAwayScore,
    };
  }

  if (awayScoreNum > homeScoreNum) {
    // Away Win
    const pickedAway =
      normSelection === normAway ||
      normSelection.includes(normAway) ||
      normAway.includes(normSelection) ||
      selection.toLowerCase() === "away" ||
      selection.toLowerCase() === "2";
    return {
      result: pickedAway ? "WON" : "LOST",
      scoreHome: rawHomeScore,
      scoreAway: rawAwayScore,
    };
  }

  // Draw / Tie
  return {
    result: isDrawPick ? "WON" : "LOST",
    scoreHome: rawHomeScore,
    scoreAway: rawAwayScore,
  };
}

/**
 * Fetches completed match scores from The Odds API scores endpoint.
 * Note: /v4/sports/{sport}/scores/?daysFrom=1..3 does NOT count against paid request quota on free plans.
 */
export async function fetchScoresForSport(
  apiKey: string,
  sportKey: string,
  daysFrom = 3
): Promise<OddsScoreEvent[]> {
  const url = new URL(`${ODDS_API_BASE}/sports/${encodeURIComponent(sportKey)}/scores`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("daysFrom", String(daysFrom));
  url.searchParams.set("dateFormat", "iso");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Scores API ${response.status}: ${errText.slice(0, 200)}`);
    }
    return (await response.json()) as OddsScoreEvent[];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Updates an existing Telegram channel tip message to reflect settled results with visual badges.
 */
export async function updateTelegramMessageWithResults(
  env: Env,
  messageId: number,
  picks: PickResultRecord[],
  overallResult: "WON" | "LOST" | "VOID" | "PARTIAL"
): Promise<boolean> {
  const rawChannelTarget = (env.TIPS_CHANNEL_ID || env.CHANNEL_USERNAME || "").trim();
  if (!env.BOT_TOKEN || !rawChannelTarget) return false;
  const chatId = rawChannelTarget.startsWith("@")
    ? rawChannelTarget
    : rawChannelTarget.replace(/^id:\s*/i, "").trim();

  const wonCount = picks.filter((p) => p.result === "WON").length;
  const totalCount = picks.length;
  const winPercent = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

  const badgeHeader =
    overallResult === "WON"
      ? `🏆 *RESULTS: 100% WON! (${wonCount}/${totalCount})* ✅`
      : overallResult === "PARTIAL" || wonCount > 0
      ? `📊 *RESULTS: ${wonCount}/${totalCount} WON (${winPercent}%)* 🎯`
      : `🏁 *RESULTS: FINISHED (${wonCount}/${totalCount})*`;

  const numberBadges = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  const pickBlocks = picks.map((p, idx) => {
    const b = numberBadges[idx] || `[${idx + 1}]`;
    const resIcon = p.result === "WON" ? "✅ *WON*" : p.result === "LOST" ? "❌ *LOST*" : p.result === "VOID" ? "⚪ *VOID*" : "⏳ *PENDING*";
    const scoreStr = p.score_home !== null && p.score_away !== null ? ` | 🥅 *Score:* ${p.score_home}-${p.score_away}` : "";
    return [
      `${b} *${escapeMarkdown(p.home_team)}* vs *${escapeMarkdown(p.away_team)}*`,
      `🎯 *Pick:* \`${escapeMarkdown(p.selection)}\` — ${resIcon}${scoreStr}`,
      `💹 *Odds:* *${p.odds.toFixed(2)}*`,
    ].join("\n");
  });

  const updatedText = [
    "🇱🇰 *FREE TIPS RESULT UPDATE* 🎯",
    badgeHeader,
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    pickBlocks.join("\n\n─────────────────────────\n\n"),
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    "ℹ️ _Results automatically verified via live official sports scores._",
    "⚠️ _18+ පමණි. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න._",
  ].join("\n");

  try {
    const resp = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: updatedText,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    const data = (await resp.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.warn(`[Tips Settlement] editMessageText returned not ok: ${data.description}`);
    }
    return data.ok;
  } catch (err) {
    console.error("[Tips Settlement] Failed to edit Telegram message:", err);
    return false;
  }
}

async function editTelegramOnce(
  env: Env,
  postId: number,
  messageId: number,
  picks: PickResultRecord[],
  overall: "WON" | "LOST" | "VOID" | "PARTIAL",
  nowIso: string
): Promise<boolean> {
  const claim = await env.DB.prepare(`
    UPDATE tip_posts SET telegram_edited_at='SENDING', updated_at=datetime('now')
    WHERE id=? AND (telegram_edited_at IS NULL OR
      (telegram_edited_at='SENDING' AND updated_at <= datetime('now','-10 minutes')))
  `).bind(postId).run();
  if ((claim.meta?.changes ?? 0) !== 1) return false;
  const sent = await updateTelegramMessageWithResults(env, messageId, picks, overall);
  await env.DB.prepare(`
    UPDATE tip_posts SET telegram_edited_at=?, updated_at=datetime('now')
    WHERE id=? AND telegram_edited_at='SENDING'
  `).bind(sent ? nowIso : null, postId).run();
  return sent;
}

/**
 * Main settlement routine: inspects pending tip posts, queries scores, records results,
 * and updates Telegram channel posts.
 */
export async function settlePendingTips(
  env: Env,
  options?: { maxPosts?: number; sendTelegramUpdate?: boolean; bypassBackoff?: boolean }
): Promise<SettlementSummary> {
  const summary: SettlementSummary = {
    checkedPosts: 0, evaluatedPicks: 0, wonPicks: 0, lostPicks: 0,
    voidPicks: 0, settledPosts: 0, editedTelegramMessages: 0,
    skippedCompletedPicks: 0, requeuedBackoff: 0, errors: [],
  };
  if (!env.DB) { summary.errors.push("Database binding is not available"); return summary; }
  if (!env.ODDS_API_KEY) { summary.errors.push("ODDS_API_KEY is not configured"); return summary; }

  const limit = Math.max(1, Math.min(options?.maxPosts ?? 10, 100));
  const now = new Date();
  const nowIso = now.toISOString();
  const rows = (await env.DB.prepare(`
    SELECT id, scheduled_key, slot_time, event_id, sport_key, sport_title, home_team, away_team,
           commence_time, market, selection, odds, message_id, tips_json, result, settled_at
    FROM tip_posts
    WHERE status = 'POSTED'
      AND (result IS NULL OR result = 'PENDING' OR (result IN ('WON','LOST','VOID','PARTIAL') AND telegram_edited_at IS NULL))
      AND (commence_time IS NULL OR datetime(commence_time) <= datetime('now'))
      AND (? = 1 OR next_retry_at IS NULL OR datetime(next_retry_at) <= datetime('now') OR result IN ('WON','LOST','VOID','PARTIAL'))
    ORDER BY CASE WHEN last_checked_at IS NULL THEN 0 ELSE 1 END,
             last_checked_at ASC,
             COALESCE(next_retry_at, commence_time, created_at) ASC,
             id ASC
    LIMIT ?
  `).bind(options?.bypassBackoff ? 1 : 0, limit).all<any>()).results;

  summary.checkedPosts = rows.length;
  const parsedByPost = new Map<number, PickResultRecord[]>();
  const scoresByEventId = new Map<string, OddsScoreEvent>();
  const sportKeys = new Set<string>();

  // Load existing pick states first; terminal picks are never fetched or evaluated again.
  for (const post of rows) {
    let raw: any[] = [];
    try { raw = post.tips_json ? JSON.parse(post.tips_json) : []; } catch { raw = []; }
    if (!Array.isArray(raw) || raw.length === 0) {
      if (post.event_id && post.selection) raw = [{
        eventId: post.event_id, sportKey: post.sport_key || "soccer",
        sportTitle: post.sport_title, homeTeam: post.home_team, awayTeam: post.away_team,
        commenceTime: post.commence_time, selection: post.selection, market: post.market, odds: post.odds,
      }];
    }
    const picks: PickResultRecord[] = [];
    for (const item of raw) {
      const eventId = String(item.eventId || "");
      if (!eventId) continue;
      const existing = await env.DB.prepare(
        "SELECT result, score_home, score_away, completed, settled_at FROM tip_results WHERE tip_post_id = ? AND event_id = ?"
      ).bind(post.id, eventId).first<any>();
      const terminal = existing && ["WON", "LOST", "VOID"].includes(String(existing.result).toUpperCase()) && Number(existing.completed) === 1;
      if (terminal) {
        summary.skippedCompletedPicks = (summary.skippedCompletedPicks || 0) + 1;
        picks.push({
          tip_post_id: post.id, event_id: eventId, sport_key: String(item.sportKey || post.sport_key || ""),
          sport_title: item.sportTitle || post.sport_title || "", home_team: item.homeTeam || post.home_team || "",
          away_team: item.awayTeam || post.away_team || "", commence_time: item.commenceTime || post.commence_time || undefined,
          selection: item.selection || post.selection || "", market: item.market || post.market || "h2h",
          odds: Number(item.odds || post.odds || 1.5), result: existing.result, score_home: existing.score_home,
          score_away: existing.score_away, completed: 1, settled_at: existing.settled_at,
        });
        continue;
      }
      const pick: PickResultRecord = {
        tip_post_id: post.id, event_id: eventId, sport_key: String(item.sportKey || post.sport_key || ""),
        sport_title: item.sportTitle || post.sport_title || "", home_team: item.homeTeam || post.home_team || "",
        away_team: item.awayTeam || post.away_team || "", commence_time: item.commenceTime || post.commence_time || undefined,
        selection: item.selection || post.selection || "", market: item.market || post.market || "h2h",
        odds: Number(item.odds || post.odds || 1.5), result: "PENDING", completed: 0,
      };
      picks.push(pick);
      if (pick.sport_key) sportKeys.add(pick.sport_key);
    }
    parsedByPost.set(Number(post.id), picks);
  }

  for (const sport of sportKeys) {
    try {
      for (const event of await fetchScoresForSport(env.ODDS_API_KEY, sport, 3)) scoresByEventId.set(event.id, event);
    } catch (error) {
      summary.errors.push(`Scores fetch failed for ${sport}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const post of rows) {
    const picks = parsedByPost.get(Number(post.id)) || [];
    let writeFailed = false;
    for (const pick of picks) {
      if (pick.completed === 1) continue;
      summary.evaluatedPicks++;
      const event = scoresByEventId.get(pick.event_id);
      const eventStatus = String(event?.status || "").toLowerCase();
      const explicitlyVoided = Boolean(event?.cancelled) || /cancelled|canceled|postponed|abandoned/.test(eventStatus);
      if (explicitlyVoided) {
        pick.result = "VOID"; pick.completed = 1; pick.settled_at = nowIso;
      } else if (event?.completed === true) {
        const evaluated = evaluatePickResult(pick.selection, pick.home_team, pick.away_team, event.scores, true);
        pick.result = evaluated.result;
        pick.score_home = evaluated.scoreHome; pick.score_away = evaluated.scoreAway;
        if (evaluated.result !== "PENDING") { pick.completed = 1; pick.settled_at = nowIso; }
      }
      if (pick.result === "WON") summary.wonPicks++;
      if (pick.result === "LOST") summary.lostPicks++;
      if (pick.result === "VOID") summary.voidPicks++;
      try {
        await env.DB.prepare(`
          INSERT INTO tip_results (tip_post_id,event_id,sport_key,sport_title,home_team,away_team,commence_time,selection,market,odds,result,score_home,score_away,completed,settled_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
          ON CONFLICT(tip_post_id,event_id) DO UPDATE SET
            result=excluded.result, score_home=excluded.score_home, score_away=excluded.score_away,
            completed=excluded.completed, settled_at=excluded.settled_at, updated_at=datetime('now')
          WHERE tip_results.completed = 0
        `).bind(pick.tip_post_id,pick.event_id,pick.sport_key,pick.sport_title || null,pick.home_team,pick.away_team,
          pick.commence_time || null,pick.selection,pick.market,pick.odds,pick.result,pick.score_home || null,
          pick.score_away || null,pick.completed,pick.settled_at || null).run();
      } catch (error) {
        writeFailed = true;
        summary.errors.push(`tip_results write failed post ${post.id} event ${pick.event_id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const allTerminal = picks.length > 0 && picks.every(p => p.completed === 1 && ["WON","LOST","VOID"].includes(p.result));
    if (allTerminal && !writeFailed) {
      const anyLost = picks.some(p => p.result === "LOST");
      const anyWon = picks.some(p => p.result === "WON");
      const overall = anyLost && anyWon ? "PARTIAL" : anyLost ? "LOST" : anyWon ? "WON" : "VOID";
      await env.DB.prepare(`
        UPDATE tip_posts SET result=?, settled_at=COALESCE(settled_at,datetime('now')),
          last_checked_at=?, next_retry_at=NULL, updated_at=datetime('now')
        WHERE id=? AND (result IS NULL OR result='PENDING')
      `).bind(overall, nowIso, post.id).run();
      summary.settledPosts++;
      if (options?.sendTelegramUpdate !== false && post.message_id) {
        if (await editTelegramOnce(env, Number(post.id), Number(post.message_id), picks, overall as "WON"|"LOST"|"VOID"|"PARTIAL", nowIso)) {
          summary.editedTelegramMessages++;
        }
      }
    } else {
      const kickoff = post.commence_time ? new Date(post.commence_time).getTime() : now.getTime();
      const ageHours = Math.max(0, (now.getTime() - kickoff) / 3600000);
      const delayHours = ageHours < 6 ? 1 : ageHours < 24 ? 3 : ageHours < 72 ? 6 : 24;
      await env.DB.prepare(`
        UPDATE tip_posts SET settlement_attempts=COALESCE(settlement_attempts,0)+1,
          last_checked_at=?, next_retry_at=datetime('now', ?),
          settlement_note=?, updated_at=datetime('now')
        WHERE id=? AND (result IS NULL OR result='PENDING')
      `).bind(nowIso, `+${delayHours} hours`, picks.length ? "Scores missing, incomplete, or team names did not match; retained as PENDING" : "No valid picks found for settlement", post.id).run();
      summary.requeuedBackoff = (summary.requeuedBackoff || 0) + 1;
    }
  }

  // Retry a failed Telegram edit for already-settled posts without re-querying scores.
  const notifyRows = (await env.DB.prepare(`
    SELECT id,message_id,result FROM tip_posts
    WHERE status='POSTED' AND result IN ('WON','LOST','VOID','PARTIAL')
      AND (telegram_edited_at IS NULL OR (telegram_edited_at='SENDING' AND updated_at <= datetime('now','-10 minutes'))) AND message_id IS NOT NULL
    ORDER BY settled_at ASC LIMIT ?
  `).bind(limit).all<any>()).results;
  for (const post of notifyRows) {
    const resultRows = (await env.DB.prepare("SELECT * FROM tip_results WHERE tip_post_id=? ORDER BY id ASC").bind(post.id).all<any>()).results;
    const picks = resultRows.filter((p:any) => ["WON","LOST","VOID"].includes(p.result) && Number(p.completed) === 1) as PickResultRecord[];
    if (!picks.length || picks.length !== resultRows.length) continue;
    if (await editTelegramOnce(env, Number(post.id), Number(post.message_id), picks, post.result, nowIso)) {
      summary.editedTelegramMessages++;
    }
  }
  return summary;
}

/** Admin-only explicit historical settlement override with an audit trail. */
export async function overrideTipSettlement(
  env: Env,
  input: {
    tipPostId: number;
    eventId: string;
    outcome: "WON" | "LOST" | "VOID";
    note: string;
    adminId: string;
    scoreHome?: string;
    scoreAway?: string;
  }
): Promise<boolean> {
  if (!env.DB || !Number.isSafeInteger(input.tipPostId) || !input.eventId.trim() || !input.note.trim()) return false;
  let existing = await env.DB.prepare(
    "SELECT * FROM tip_results WHERE tip_post_id=? AND event_id=?"
  ).bind(input.tipPostId, input.eventId).first<any>();
  if (!existing) {
    const post = await env.DB.prepare(
      "SELECT id,event_id,sport_key,sport_title,home_team,away_team,commence_time,selection,market,odds,tips_json FROM tip_posts WHERE id=? AND status='POSTED'"
    ).bind(input.tipPostId).first<any>();
    if (!post) return false;
    let pick: any = null;
    try {
      const parsed = post.tips_json ? JSON.parse(post.tips_json) : [];
      if (Array.isArray(parsed)) pick = parsed.find((p:any) => String(p.eventId || "") === input.eventId);
    } catch {}
    if (!pick && String(post.event_id || "") === input.eventId) pick = post;
    if (!pick) return false;
    await env.DB.prepare(`
      INSERT INTO tip_results (tip_post_id,event_id,sport_key,sport_title,home_team,away_team,commence_time,selection,market,odds,result,completed,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?, 'PENDING',0,datetime('now'),datetime('now'))
      ON CONFLICT(tip_post_id,event_id) DO NOTHING
    `).bind(input.tipPostId,input.eventId,pick.sportKey || post.sport_key || "unknown",
      pick.sportTitle || post.sport_title || null,pick.homeTeam || post.home_team || "",
      pick.awayTeam || post.away_team || "",pick.commenceTime || post.commence_time || null,
      pick.selection || post.selection || "",pick.market || post.market || "h2h",Number(pick.odds || post.odds || 1)).run();
    existing = await env.DB.prepare(
      "SELECT * FROM tip_results WHERE tip_post_id=? AND event_id=?"
    ).bind(input.tipPostId, input.eventId).first<any>();
    if (!existing) return false;
  }
  const now = new Date().toISOString();
  const batch = [
    env.DB.prepare(`UPDATE tip_results SET result=?, completed=1, settled_at=?, score_home=COALESCE(?,score_home), score_away=COALESCE(?,score_away), updated_at=datetime('now') WHERE tip_post_id=? AND event_id=?`)
      .bind(input.outcome, now, input.scoreHome ?? null, input.scoreAway ?? null, input.tipPostId, input.eventId),
    env.DB.prepare(`INSERT INTO tip_settlement_audit(tip_post_id,event_id,action,outcome,note,admin_id) VALUES(?,?,?,?,?,?)`)
      .bind(input.tipPostId,input.eventId,"ADMIN_OVERRIDE",input.outcome,input.note.slice(0,500),input.adminId.slice(0,64)),
  ];
  await env.DB.batch(batch);
  const rows = (await env.DB.prepare("SELECT result,completed FROM tip_results WHERE tip_post_id=?").bind(input.tipPostId).all<any>()).results;
  if (rows.length && rows.every((r:any) => Number(r.completed) === 1 && ["WON","LOST","VOID"].includes(r.result))) {
    const anyLost = rows.some((r:any) => r.result === "LOST");
    const anyWon = rows.some((r:any) => r.result === "WON");
    const overall = anyLost && anyWon ? "PARTIAL" : anyLost ? "LOST" : anyWon ? "WON" : "VOID";
    await env.DB.prepare("UPDATE tip_posts SET result=?,settled_at=?,next_retry_at=NULL,settlement_note=?,updated_at=datetime('now') WHERE id=?")
      .bind(overall,now,`Admin override: ${input.note.slice(0,400)}`,input.tipPostId).run();
    const post = await env.DB.prepare("SELECT message_id,telegram_edited_at FROM tip_posts WHERE id=?").bind(input.tipPostId).first<any>();
    if (post?.message_id && !post.telegram_edited_at) {
      const picks = (await env.DB.prepare("SELECT * FROM tip_results WHERE tip_post_id=?").bind(input.tipPostId).all<any>()).results as PickResultRecord[];
      await editTelegramOnce(env, input.tipPostId, Number(post.message_id), picks, overall, now);
    }
  }
  return true;
}

/**
 * Generates an end-of-day or weekly recap of tip win/loss statistics.
 */
export async function getTipsPerformanceStats(
  env: Env,
  days = 7
): Promise<{ total: number; won: number; lost: number; partial: number; winRate: number; weeklyRoi: string }> {
  const empty = { total: 0, won: 0, lost: 0, partial: 0, winRate: 0, weeklyRoi: "N/A" };
  if (!env.DB) return empty;

  const safeDays = Math.max(1, Math.min(days, 90));

  try {
    const row = await env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN result = 'PARTIAL' THEN 1 ELSE 0 END) as partial
      FROM tip_posts
      WHERE status = 'POSTED'
        AND result IN ('WON', 'LOST', 'PARTIAL')
        AND settled_at >= datetime('now', ? || ' days')
    `).bind(`-${safeDays}`).first<{ total: number; won: number; lost: number; partial: number }>();

    const total = Number(row?.total || 0);
    const won = Number(row?.won || 0);
    const lost = Number(row?.lost || 0);
    const partial = Number(row?.partial || 0);
    if (total === 0) return empty;

    const winRate = Math.round((won / total) * 100);

    const roiRow = await env.DB.prepare(`
      SELECT
        COALESCE(SUM(CASE
          WHEN result = 'WON' THEN odds - 1
          WHEN result = 'LOST' THEN -1
          ELSE 0
        END), 0) as profit,
        COUNT(CASE WHEN result IN ('WON', 'LOST') THEN 1 END) as settled_picks
      FROM tip_results
      WHERE result IN ('WON', 'LOST', 'VOID')
        AND settled_at >= datetime('now', ? || ' days')
    `).bind(`-${safeDays}`).first<{ profit: number; settled_picks: number }>();

    const settledPicks = Number(roiRow?.settled_picks || 0);
    const weeklyRoi = settledPicks > 0
      ? `${((Number(roiRow?.profit || 0) / settledPicks) * 100).toFixed(1)}%`
      : "N/A";

    return { total, won, lost, partial, winRate, weeklyRoi };
  } catch (error) {
    console.error("[Tips Settlement] Failed to calculate performance stats:", error);
    return empty;
  }
}
