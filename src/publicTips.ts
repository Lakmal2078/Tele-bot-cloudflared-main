import type { Env } from "./types";
import { getTipsPerformanceStats } from "./tipsSettlement";
import { buildEntityCacheKey, resolveTipIconsBatch, type TipSportCategory } from "./teamIcons";
import { getCachedBestOdds, getRecentValueAlerts, type BestOddsSnapshot, type ValueAlertRecord } from "./bestOdds";
import { getCachedLiveScores, type LiveScoreRecord } from "./liveScores";
import { getDetailedPerformanceReport, type DetailedPerformanceReport } from "./tipsPerformance";

export type PublicTip = {
  id: number;
  sport: TipSportCategory;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  homeCountryCode?: string | null;
  awayCountryCode?: string | null;
  selection: string;
  market: string;
  odds: number | null;
  commenceTime: string | null;
  result: "PENDING" | "WON" | "LOST" | "VOID" | "PARTIAL" | null;
  scoreHome: string | null;
  scoreAway: string | null;
};

export type PublicTipsResponse = {
  ok: true;
  generatedAt: string;
  tips: PublicTip[];
  summary: {
    days: number;
    total: number;
    won: number;
    lost: number;
    partial: number;
    winRate: number;
    weeklyRoi: string;
  };
  bestOdds?: BestOddsSnapshot[];
  valueAlerts?: ValueAlertRecord[];
  liveScores?: LiveScoreRecord[];
  performance?: DetailedPerformanceReport;
};

export function classifySport(sportKey: string | null, sportTitle: string | null): PublicTip["sport"] {
  const value = `${sportKey || ""} ${sportTitle || ""}`.toLowerCase();
  if (value.includes("cricket")) return "cricket";
  if (value.includes("table_tennis") || value.includes("table tennis") || value.includes("ping pong")) return "table_tennis";
  if (value.includes("soccer") || value.includes("football")) return "football";
  if (value.includes("basketball") || value.includes("nba") || value.includes("euroleague")) return "basketball";
  if (value.includes("tennis") || value.includes("atp") || value.includes("wta")) return "tennis";
  if (value.includes("esport") || value.includes("cs2") || value.includes("csgo") || value.includes("dota") || value.includes("valorant") || value.includes("league of legends")) return "esports";
  if (value.includes("mma") || value.includes("ufc") || value.includes("boxing")) return "mma";
  return "other";
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseTipsJson(raw: string | null, row: Record<string, unknown>, resultsByEvent: Map<string, Record<string, unknown>> = new Map()): PublicTip[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 8).map((item: any, index: number) => {
          const eventId = String(item?.eventId || "");
          const settled = resultsByEvent.get(eventId);
          return {
          id: Number(row.id) * 100 + index,
          sport: classifySport(String(item?.sportKey || ""), String(item?.sportTitle || "")),
          sportTitle: String(item?.sportTitle || row.sport_title || "Sports"),
          homeTeam: String(item?.homeTeam || row.home_team || "Home team"),
          awayTeam: String(item?.awayTeam || row.away_team || "Away team"),
          selection: String(item?.selection || row.selection || "Selection"),
          market: String(item?.market || row.market || "h2h"),
          odds: safeNumber(item?.odds ?? row.odds),
          commenceTime: item?.commenceTime ? String(item.commenceTime) : (row.commence_time ? String(row.commence_time) : null),
          result: settled?.result ? String(settled.result).toUpperCase() as PublicTip["result"] : (item?.result ? String(item.result).toUpperCase() as PublicTip["result"] : (parsed.length === 1 && row.result ? String(row.result).toUpperCase() as PublicTip["result"] : "PENDING")),
          scoreHome: settled?.score_home != null ? String(settled.score_home) : (item?.scoreHome != null ? String(item.scoreHome) : null),
          scoreAway: settled?.score_away != null ? String(settled.score_away) : (item?.scoreAway != null ? String(item.scoreAway) : null),
        };
        });
      }
    } catch {
      // Fall through to the single-pick row representation.
    }
  }

  if (!row.home_team || !row.away_team || !row.selection) return [];
  const settled = resultsByEvent.get(String(row.event_id || ""));
  return [{
    id: Number(row.id),
    sport: classifySport(String(row.sport_key || ""), String(row.sport_title || "")),
    sportTitle: String(row.sport_title || "Sports"),
    homeTeam: String(row.home_team),
    awayTeam: String(row.away_team),
    selection: String(row.selection),
    market: String(row.market || "h2h"),
    odds: safeNumber(row.odds),
    commenceTime: row.commence_time ? String(row.commence_time) : null,
    result: settled?.result ? String(settled.result).toUpperCase() as PublicTip["result"] : (row.result ? String(row.result).toUpperCase() as PublicTip["result"] : "PENDING"),
    scoreHome: settled?.score_home != null ? String(settled.score_home) : null,
    scoreAway: settled?.score_away != null ? String(settled.score_away) : null,
  }];
}

/** Public, read-only tip data. Filters top-performing and active picks from the last 7 days. */
export async function getPublicTips(env: Env, limit = 12): Promise<PublicTipsResponse> {
  const generatedAt = new Date().toISOString();
  const summary = await getTipsPerformanceStats(env, 7);
  if (!env.DB) {
    return {
      ok: true,
      generatedAt,
      tips: [],
      summary: { days: 7, ...summary },
      bestOdds: [],
      valueAlerts: [],
      liveScores: [],
    };
  }

  try {
    const safeLimit = Math.max(1, Math.min(limit, 20));
    const [tipQueryRes, bestOddsRes, valueAlertsRes, liveScoresRes, performanceRes] = await Promise.all([
      env.DB.prepare(`
        SELECT id, event_id, sport_key, sport_title, home_team, away_team, commence_time,
               market, selection, odds, tips_json, result
        FROM tip_posts
        WHERE status = 'POSTED'
          AND (posted_at >= datetime('now', '-7 days') OR created_at >= datetime('now', '-7 days'))
        ORDER BY COALESCE(commence_time, posted_at, created_at) DESC, id DESC
        LIMIT ?
      `).bind(safeLimit).all<Record<string, unknown> | null>(),
      getCachedBestOdds(env, { limit: 12 }).catch(() => ({ items: [], latestFetchedAt: null })),
      getRecentValueAlerts(env, 8).catch(() => []),
      getCachedLiveScores(env, 12).catch(() => ({ items: [], latestFetchedAt: null })),
      getDetailedPerformanceReport(env).catch(() => undefined),
    ]);

    const rows = tipQueryRes.results || [];
    const postIds = rows.filter((row): row is Record<string, unknown> => Boolean(row)).map((row) => Number(row.id));
    const resultsByPost = new Map<number, Map<string, Record<string, unknown>>>();
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => "?").join(", ");
      const resultRows = (await env.DB.prepare(`
        SELECT tip_post_id, event_id, result, score_home, score_away
        FROM tip_results
        WHERE tip_post_id IN (${placeholders})
      `).bind(...postIds).all<Record<string, unknown>>()).results;
      for (const result of resultRows) {
        const postId = Number(result.tip_post_id);
        let byEvent = resultsByPost.get(postId);
        if (!byEvent) {
          byEvent = new Map<string, Record<string, unknown>>();
          resultsByPost.set(postId, byEvent);
        }
        byEvent.set(String(result.event_id), result);
      }
    }

    const tips = rows
      .flatMap((row) => {
        if (!row) return [];
        return parseTipsJson(
          row.tips_json ? String(row.tips_json) : null,
          row,
          resultsByPost.get(Number(row.id)) || new Map()
        );
      })
      .slice(0, safeLimit);

    if (tips.length > 0) {
      const entityQueries = tips.flatMap((t) => [
        { name: t.homeTeam, sport: t.sport },
        { name: t.awayTeam, sport: t.sport },
      ]);
      const resolvedIcons = await resolveTipIconsBatch(env.DB, entityQueries);
      for (const tip of tips) {
        const homeIcon = resolvedIcons.get(buildEntityCacheKey(tip.homeTeam, tip.sport));
        const awayIcon = resolvedIcons.get(buildEntityCacheKey(tip.awayTeam, tip.sport));
        tip.homeLogoUrl = homeIcon?.imageUrl ?? null;
        tip.awayLogoUrl = awayIcon?.imageUrl ?? null;
        tip.homeCountryCode = homeIcon?.countryCode ?? null;
        tip.awayCountryCode = awayIcon?.countryCode ?? null;
      }
    }

    return {
      ok: true,
      generatedAt,
      tips,
      summary: { days: 7, ...summary },
      bestOdds: bestOddsRes.items,
      valueAlerts: valueAlertsRes,
      liveScores: liveScoresRes.items,
      performance: performanceRes,
    };
  } catch {
    // Graceful public fallback when D1/schema is unavailable.
    return {
      ok: true,
      generatedAt,
      tips: [],
      summary: { days: 7, ...summary },
      bestOdds: [],
      valueAlerts: [],
      liveScores: [],
    };
  }
}

/** Client-side enhancement keeps the public page resilient if the preview API is temporarily unavailable. */
export function publicTipsClientScript(nonce?: string): string {
  const nonceAttr = nonce ? ` nonce="${nonce.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : "";
  const body = `(function(){
  var root = document.querySelector("#tips-preview .tips");
  if (!root) return;
  var esc = function(v){
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
  var initials = function(name){
    var p = String(name || "").trim().split(/\\s+/).filter(Boolean);
    if (!p.length) return "?";
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  };
  var hue = function(s){
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  };
  var sportGlyph = function(sport){
    if (sport === "tennis") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 6.5c3 3 3 8 0 11M16.5 6.5c-3 3-3 8 0 11" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
    }
    if (sport === "table_tennis") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14.5 14.5l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="7" r="2" fill="currentColor"/></svg>';
    }
    if (sport === "basketball") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 12h16M12 4v16M6.5 6.5c3.5 3.5 3.5 7.5 0 11M17.5 6.5c-3.5 3.5-3.5 7.5 0 11" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';
    }
    if (sport === "cricket") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L16 8l2 2-9 9H7v-2z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="16.5" r="2.2" fill="currentColor"/></svg>';
    }
    if (sport === "esports") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9h12a3 3 0 0 1 2.8 4l-1.1 3.5a2 2 0 0 1-3.3.8L14.5 15h-5l-1.9 2.3a2 2 0 0 1-3.3-.8L3.2 13A3 3 0 0 1 6 9z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><polygon points="12,7.5 15.8,10.3 14.3,14.8 9.7,14.8 8.2,10.3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  };
  var fallbackAvatarHtml = function(name, sport){
    return '<span class="tipAvatar isFallback" data-sport-badge="' + esc(sport || "other") + '">' +
      '<span class="tipSportGlyph" aria-hidden="true">' + sportGlyph(sport) + '</span>' +
      '<span class="tipInitials">' + esc(initials(name)) + '</span>' +
    '</span>';
  };
  var avatar = function(name, logoUrl, sport){
    if (logoUrl && /^https:\\/\\//i.test(logoUrl)) {
      var kindClass = /flagcdn\\.com/i.test(logoUrl) ? " isFlag" : (/cutout|thumb/i.test(logoUrl) ? " isPortrait" : "");
      return '<span class="tipAvatar hasLogo' + kindClass + '">' +
        '<img src="' + esc(logoUrl) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fallback-name="' + esc(name) + '" data-fallback-sport="' + esc(sport || "other") + '"/>' +
      '</span>';
    }
    return fallbackAvatarHtml(name, sport);
  };
  var fmtWhen = function(v){
    if (!v) return "TBD";
    try {
      var d = new Date(v);
      var now = new Date();
      var same = d.toDateString() === now.toDateString();
      var t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Colombo" });
      if (same) return "Today, " + t;
      var tom = new Date(now);
      tom.setDate(tom.getDate() + 1);
      if (d.toDateString() === tom.toDateString()) return "Tomorrow, " + t;
      return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Colombo" });
    } catch(e) {
      return esc(v);
    }
  };
  var marketLabel = function(m){
    var x = String(m || "h2h").toLowerCase();
    if (x === "h2h" || x === "1x2") return "1X2";
    if (x.indexOf("over") >= 0 || x.indexOf("under") >= 0 || x === "totals" || x === "ou") return "O/U";
    return x.toUpperCase();
  };
  var pickLabel = function(t){
    var sel = String(t.selection || "");
    var m = marketLabel(t.market);
    if (m === "1X2") {
      if (/draw/i.test(sel)) return "Draw";
      return sel + " Win";
    }
    return sel;
  };
  var resultBadge = function(r){
    if (r === "WON") return '<span class="tipStatus won">WIN</span>';
    if (r === "LOST") return '<span class="tipStatus lost">LOSS</span>';
    if (r === "VOID") return '<span class="tipStatus void">VOID</span>';
    if (r === "PARTIAL") return '<span class="tipStatus partial">PARTIAL</span>';
    return '<span class="tipStatus pending">PENDING</span>';
  };
  var latestData = null;
  var activeMode = root.getAttribute("data-mode") || "tips";
  var modeButtons = root.querySelectorAll(".tipModeTab");

  var deltaTag = function(cur, prev){
    if (cur == null || prev == null || Math.abs(cur - prev) < 0.01) return "";
    if (cur > prev) return '<span class="oddsDeltaUp" title="Odds increased">↑</span>';
    return '<span class="oddsDeltaDown" title="Odds dropped">↓</span>';
  };

  var renderMode = function(data){
    if (!data) return;
    latestData = data;
    root.setAttribute("data-mode", activeMode);
    var tips = Array.isArray(data.tips) ? data.tips : [];
    var bestOdds = Array.isArray(data.bestOdds) ? data.bestOdds : [];
    var valueAlerts = Array.isArray(data.valueAlerts) ? data.valueAlerts : [];
    var liveScores = Array.isArray(data.liveScores) ? data.liveScores : [];
    var perf = data.performance || null;
    var summary = data.summary || {};

    var labels = {
      si: { all: "සියල්ල", football: "පාපන්දු", cricket: "ක්‍රිකට්", tennis: "ටෙනිස්", basketball: "පැසිපන්දු", table_tennis: "මේස පන්දු", esports: "ඊ-ක්‍රීඩා", mma: "MMA", other: "වෙනත්", tips: "ඉඟි", none: "දැනට ඉඟි නැහැ", noSettled: "පසුගිය දින 7 තුළ තීරණය කළ ඉඟි නැහැ", settled: "පසුගිය දින 7 තීරණය කළ ඉඟි", rate: "සාර්ථකත්වය", won: "ජයග්‍රහණ", roi: "සතිපතා ROI", emptyOdds: "හොඳම Odds සංසන්දන දත්ත මීළඟ scan වාරයෙන් පසු මෙහි දිස්වේ.", emptyScores: "සජීවී හෝ අවසන් කළ තරඟ ලකුණු තවම වාර්තා වී නැත." },
      en: { all: "All", football: "Football", cricket: "Cricket", tennis: "Tennis", basketball: "Basketball", table_tennis: "Table Tennis", esports: "Esports", mma: "MMA", other: "Other", tips: "Tips", none: "No tips available", noSettled: "No settled tip results are available for the last 7 days.", settled: "7-day settled tips", rate: "Strike rate", won: "Won", roi: "Weekly ROI", emptyOdds: "Best Odds snapshots populate automatically after the next scheduled scan.", emptyScores: "No live or recent match scores cached yet." },
      ta: { all: "அனைத்தும்", football: "கால்பந்து", cricket: "கிரிக்கெட்", tennis: "டென்னிஸ்", basketball: "கூடைப்பந்து", table_tennis: "டேபிள் டென்னிஸ்", esports: "இ-ஸ்போர்ட்ஸ்", mma: "MMA", other: "மற்றவை", tips: "குறிப்புகள்", none: "குறிப்புகள் இப்போது இல்லை", noSettled: "கடந்த 7 நாட்களில் முடிவுகள் இல்லை", settled: "கடந்த 7 நாட்களின் முடிவுகள்", rate: "வெற்றி விகிதம்", won: "வென்றவை", roi: "வார ROI", emptyOdds: "அடுத்த ஸ்கேனுக்குப் பிறகு சிறந்த Odds விவரங்கள் இங்கே தோன்றும்.", emptyScores: "நேரடி அல்லது சமீபத்திய முடிவுகள் இன்னும் இல்லை." }
    }[document.documentElement.lang] || {
      all: "All", football: "Football", cricket: "Cricket", tennis: "Tennis", basketball: "Basketball", table_tennis: "Table Tennis", esports: "Esports", mma: "MMA", other: "Other", tips: "Tips", none: "No tips available", noSettled: "No settled tip results are available for the last 7 days.", settled: "7-day settled tips", rate: "Strike rate", won: "Won", roi: "Weekly ROI", emptyOdds: "Best Odds snapshots populate automatically after the next scheduled scan.", emptyScores: "No live or recent match scores cached yet."
    };

    var badge = document.getElementById("tipsLiveBadge");
    var summaryEl = document.getElementById("tipLiveSummary");
    var emptyState = document.getElementById("tipEmptyState");
    var tipGrid = document.getElementById("tipCardGrid");
    var tabsHost = document.querySelector("#tips-preview .tipTabs");

    if (tabsHost) tabsHost.style.display = activeMode === "tips" ? "flex" : "none";

    if (activeMode === "odds") {
      if (badge) badge.textContent = "Best Odds (" + bestOdds.length + ")";
      if (summaryEl) {
        summaryEl.style.display = "flex";
        summaryEl.innerHTML = '<span>💹 <b>' + esc(bestOdds.length) + '</b> Tracked Matches</span>' +
          '<span>💎 <b>' + esc(valueAlerts.length) + '</b> Value Alerts (+4% EV)</span>' +
          '<span>🛡️ Bookmaker Best Price Comparison</span>';
      }
      if (emptyState) {
        emptyState.textContent = labels.emptyOdds;
        emptyState.hidden = bestOdds.length > 0;
      }
      if (tipGrid) {
        tipGrid.innerHTML = bestOdds.map(function(o){
          var edgeBadge = (o.bestValueScore != null && o.bestValueScore > 0.005)
            ? '<span class="valueBadge">+' + (o.bestValueScore * 100).toFixed(1) + '% EV</span>'
            : '<span class="tipStatus pending">' + (Array.isArray(o.bookmakers) ? o.bookmakers.length : 0) + ' Books</span>';
          var homeVal = o.bestHomeOdds != null ? Number(o.bestHomeOdds).toFixed(2) + deltaTag(o.bestHomeOdds, o.prevBestHomeOdds) : "—";
          var drawVal = o.bestDrawOdds != null ? Number(o.bestDrawOdds).toFixed(2) : "—";
          var awayVal = o.bestAwayOdds != null ? Number(o.bestAwayOdds).toFixed(2) + deltaTag(o.bestAwayOdds, o.prevBestAwayOdds) : "—";
          return '<article class="tipCard" data-sport="all">' +
            '<div class="tipCardTop"><span class="tipLeague">' + esc(o.sportTitle || "Sports") + '</span>' + edgeBadge + '</div>' +
            '<div style="font-size:.82rem;font-weight:800;color:#f8fafc;">' + esc(o.homeTeam) + ' <span class="tipVs">vs</span> ' + esc(o.awayTeam) + '</div>' +
            '<div class="tipWhen">' + esc(fmtWhen(o.commenceTime)) + '</div>' +
            '<div class="oddsTable">' +
              '<div class="oddsRow"><span>1 · Home</span><span class="oddsBook">' + esc(o.bestHomeBookmaker || "Best") + '</span><b class="tipOdds">' + homeVal + '</b></div>' +
              (o.bestDrawOdds != null ? '<div class="oddsRow"><span>X · Draw</span><span class="oddsBook">' + esc(o.bestDrawBookmaker || "Best") + '</span><b class="tipOdds">' + drawVal + '</b></div>' : '') +
              '<div class="oddsRow"><span>2 · Away</span><span class="oddsBook">' + esc(o.bestAwayBookmaker || "Best") + '</span><b class="tipOdds">' + awayVal + '</b></div>' +
            '</div>' +
            '<div class="tipFoot">⚡ Best Selection: ' + esc(o.bestSelection || o.homeTeam) + ' · Telegram /odds</div>' +
          '</article>';
        }).join("");
      }
      return;
    }

    if (activeMode === "scores") {
      var liveCount = liveScores.filter(function(s){ return s.isLive; }).length;
      if (badge) badge.textContent = liveCount > 0 ? ("🔴 Live (" + liveCount + ")") : ("Scores (" + liveScores.length + ")");
      if (summaryEl) {
        summaryEl.style.display = "flex";
        summaryEl.innerHTML = '<span>🔴 <b>' + esc(liveCount) + '</b> Live Now</span>' +
          '<span>🏁 <b>' + esc(liveScores.length - liveCount) + '</b> Recent / Completed</span>' +
          '<span>⏱️ Hourly Auto-Sync + /scores</span>';
      }
      if (emptyState) {
        emptyState.textContent = labels.emptyScores;
        emptyState.hidden = liveScores.length > 0;
      }
      if (tipGrid) {
        tipGrid.innerHTML = liveScores.map(function(s){
          var stClass = s.isLive ? "liveBadge" : (s.completed ? "tipStatus won" : "tipStatus pending");
          var stLabel = s.isLive ? "🔴 LIVE" : (s.completed ? "🏁 FT" : esc(s.statusText || "UPCOMING"));
          var scoreText = (s.scoreHome != null && s.scoreAway != null) ? (esc(s.scoreHome) + " – " + esc(s.scoreAway)) : "vs";
          return '<article class="tipCard" data-sport="all">' +
            '<div class="tipCardTop"><span class="tipLeague">' + esc(s.sportTitle || "Sports") + '</span><span class="' + stClass + '">' + stLabel + '</span></div>' +
            '<div class="scoreBoardRow"><b>' + esc(s.homeTeam) + '</b><span class="scoreBoardScore">' + scoreText + '</span><b>' + esc(s.awayTeam) + '</b></div>' +
            '<div class="tipWhen">' + esc(fmtWhen(s.commenceTime)) + '</div>' +
            '<div class="tipFoot">📡 Tracked on Telegram · Use /scores in bot</div>' +
          '</article>';
        }).join("");
      }
      return;
    }

    if (activeMode === "roi") {
      var d7 = perf && perf.days7 ? perf.days7 : { picks: 0, wonPicks: 0, lostPicks: 0, voidPicks: 0, pickWinRatePct: Number(summary.winRate) || 0, netUnits: 0, roiPct: 0 };
      var d30 = perf && perf.days30 ? perf.days30 : d7;
      var todayW = perf && perf.today ? perf.today : d7;
      var formArr = perf && Array.isArray(perf.recentForm) ? perf.recentForm : [];
      var sportsArr = perf && Array.isArray(perf.bySport) ? perf.bySport : [];

      if (badge) badge.textContent = "ROI Tracker (" + Math.round(d7.pickWinRatePct || 0) + "% WR)";
      if (summaryEl) {
        var r7Sign = d7.roiPct >= 0 ? "+" : "";
        summaryEl.style.display = "flex";
        summaryEl.innerHTML = '<span>🎯 7D Win Rate: <b>' + esc(Number(d7.pickWinRatePct || 0).toFixed(1)) + '%</b></span>' +
          '<span>📈 7D ROI: <b>' + r7Sign + esc(Number(d7.roiPct || 0).toFixed(1)) + '%</b></span>' +
          '<span>🛡️ Verified D1 Ledger (0 API Credits)</span>';
      }
      if (emptyState) emptyState.hidden = true;
      var renderWindowCard = function(title, w){
        var uSign = w.netUnits >= 0 ? "+" : "";
        var rSign = w.roiPct >= 0 ? "+" : "";
        return '<article class="tipCard roiCard" data-sport="all">' +
          '<div class="tipCardTop"><span class="tipLeague">' + esc(title) + '</span><span class="tipStatus ' + (w.roiPct >= 0 ? "won" : "lost") + '">' + rSign + Number(w.roiPct || 0).toFixed(1) + '% ROI</span></div>' +
          '<div class="roiBigNum">' + Number(w.pickWinRatePct || 0).toFixed(1) + '% <small>Win Rate</small></div>' +
          '<div class="roiMetricRow"><span>Picks: <b>' + esc(w.wonPicks) + 'W - ' + esc(w.lostPicks) + 'L - ' + esc(w.voidPicks) + 'V</b></span><span>Net: <b>' + uSign + Number(w.netUnits || 0).toFixed(2) + 'u</b></span></div>' +
          '<div class="tipFoot">Avg Odds: ' + (w.avgOdds ? Number(w.avgOdds).toFixed(2) : "—") + ' · Verified D1 Results</div>' +
        '</article>';
      };
      var formHtml = '<article class="tipCard roiCard" data-sport="all">' +
        '<div class="tipCardTop"><span class="tipLeague">Recent Form &amp; Top Sports</span><span class="tipStatus pending">' + esc(formArr.length) + ' Picks</span></div>' +
        '<div class="roiFormDots">' + (formArr.length ? formArr.map(function(f){ return '<span class="roiDot ' + (f === "W" ? "won" : (f === "L" ? "lost" : "void")) + '">' + esc(f) + '</span>'; }).join("") : '<span style="color:#94a3b8;font-size:.74rem;">No settled picks yet</span>') + '</div>' +
        '<div class="oddsTable">' + (sportsArr.length ? sportsArr.slice(0, 3).map(function(sp){
          var sSign = sp.roiPct >= 0 ? "+" : "";
          return '<div class="oddsRow"><span>' + esc(sp.sportTitle) + '</span><span class="oddsBook">' + esc(sp.wonPicks) + 'W-' + esc(sp.lostPicks) + 'L</span><b class="tipOdds">' + sSign + Number(sp.roiPct || 0).toFixed(1) + '%</b></div>';
        }).join("") : '<div class="oddsRow"><span>Waiting for first settled matches</span><b>—</b></div>') + '</div>' +
        '<div class="tipFoot">Daily automated channel recap at 23:00 SLT</div>' +
      '</article>';
      if (tipGrid) {
        tipGrid.innerHTML = renderWindowCard("Today (Sri Lanka)", todayW) + renderWindowCard("Last 7 Days", d7) + renderWindowCard("Last 30 Days", d30) + formHtml;
      }
      return;
    }

    // Default: Daily Tips Mode
    if (badge) badge.textContent = tips.length ? labels.tips + " (" + tips.length + ")" : labels.none;

    var sportOrder = ["football", "cricket", "tennis", "basketball", "table_tennis", "esports", "mma", "other"];
    if (tabsHost && tips.length) {
      var prevActive = tabsHost.querySelector(".tipTab.active")?.getAttribute("data-sport") || "all";
      var present = [];
      sportOrder.forEach(function(s){
        if (tips.some(function(t){ return t.sport === s; })) present.push(s);
      });
      var activeSport = (prevActive !== "all" && present.indexOf(prevActive) >= 0) ? prevActive : "all";
      var tabKeys = ["all"].concat(present);
      tabsHost.innerHTML = tabKeys.map(function(key){
        var isActive = key === activeSport;
        var label = labels[key] || key;
        return '<button type="button" data-sport="' + esc(key) + '" class="tipTab' + (isActive ? ' active' : '') + '" aria-pressed="' + (isActive ? 'true' : 'false') + '">' + esc(label) + '</button>';
      }).join("");
    }
    var tabs = document.querySelectorAll("#tips-preview .tipTab");

    var stats = "";
    if (summary && summary.total && Number(summary.total) > 0) {
      var wRate = Math.round(Number(summary.winRate) || 0);
      var wWon = Number(summary.won) || 0;
      var wRoi = String(summary.weeklyRoi || "").trim();
      var roiPart = wRoi && wRoi !== "N/A" ? ' · ' + labels.roi + ': ' + esc(wRoi) : '';
      stats = labels.settled + ': ' + esc(summary.total) + ' · ' + labels.rate + ': ' + esc(wRate) + '% · ' + labels.won + ': ' + esc(wWon) + roiPart;
    } else {
      stats = labels.noSettled;
    }
    if (summaryEl) summaryEl.textContent = stats;
    if (emptyState) emptyState.hidden = tips.length > 0;

    var cards = tips.length ? tips.map(function(t){
      var score = t.scoreHome != null && t.scoreAway != null ? " · " + esc(t.scoreHome) + "-" + esc(t.scoreAway) : "";
      return '<article class="tipCard" data-sport="' + esc(t.sport) + '">' +
        '<div class="tipCardTop"><span class="tipLeague">' + esc(t.sportTitle) + '</span>' + resultBadge(t.result) + '</div>' +
        '<div class="tipTeams"><div class="tipTeam">' + avatar(t.homeTeam, t.homeLogoUrl, t.sport) + '<b>' + esc(t.homeTeam) + '</b></div><div class="tipVs">VS</div><div class="tipTeam">' + avatar(t.awayTeam, t.awayLogoUrl, t.sport) + '<b>' + esc(t.awayTeam) + '</b></div></div>' +
        '<div class="tipWhen">' + esc(fmtWhen(t.commenceTime)) + score + '</div>' +
        '<div class="tipPickRow"><span class="tipMarketTag">' + esc(marketLabel(t.market)) + '</span><span class="tipPickName">' + esc(pickLabel(t)) + '</span><b class="tipOdds">' + (t.odds ? Number(t.odds).toFixed(2) : "—") + '</b></div>' +
        '<div class="tipFoot">⚡ Tap here for Live Odds · Live on Telegram</div>' +
      '</article>';
    }).join("") : "";

    if (tipGrid) {
      tipGrid.innerHTML = cards;
      tipGrid.querySelectorAll("img[data-fallback-name]").forEach(function(img){
        img.addEventListener("error", function(){
          var parent = img.parentNode;
          if (!parent || !parent.parentNode) return;
          var tmp = document.createElement("div");
          tmp.innerHTML = fallbackAvatarHtml(img.getAttribute("data-fallback-name") || "?", img.getAttribute("data-fallback-sport") || "other");
          if (tmp.firstElementChild) parent.parentNode.replaceChild(tmp.firstElementChild, parent);
        }, { once: true });
      });
    }
    tabs.forEach(function(b){
      b.addEventListener("click", function(){
        tabs.forEach(function(x){
          x.classList.toggle("active", x === b);
          x.setAttribute("aria-pressed", x === b ? "true" : "false");
        });
        b.classList.add("active");
        var sport = b.getAttribute("data-sport");
        if (tipGrid) tipGrid.querySelectorAll(".tipCard").forEach(function(x){
          x.style.display = (sport === "all" || x.getAttribute("data-sport") === sport) ? "flex" : "none";
        });
      });
    });

    var selected = document.querySelector("#tips-preview .tipTab.active");
    if (selected && tipGrid) {
      var sport = selected.getAttribute("data-sport");
      tipGrid.querySelectorAll(".tipCard").forEach(function(x){
        x.style.display = (sport === "all" || x.getAttribute("data-sport") === sport) ? "flex" : "none";
      });
    }
  };

  modeButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
      var mode = btn.getAttribute("data-mode") || "tips";
      activeMode = mode;
      modeButtons.forEach(function(b){
        var on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (latestData) renderMode(latestData);
    });
  });

  var refreshing = false;
  var refresh = function(){
    if (refreshing || document.visibilityState === "hidden") return;
    refreshing = true;
    fetch("/api/tips/preview", {
      headers: { Accept: "application/json" },
      cache: "no-store"
    })
      .then(function(r){ if (!r.ok) throw new Error("preview unavailable"); return r.json(); })
      .then(function(data){
        if (data && data.ok === true && Array.isArray(data.tips)) renderMode(data);
      })
      .catch(function(){ /* Keep the last server-rendered or successfully fetched data. */ })
      .finally(function(){ refreshing = false; });
  };
  refresh();
  window.setInterval(refresh, 30000);
  document.addEventListener("visibilitychange", function(){
    if (document.visibilityState === "visible") refresh();
  });
})();`;
  return `<script${nonceAttr}>${body}</script>`;
}
