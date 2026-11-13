import type { Env } from "./types";
import { getTipsPerformanceStats } from "./tipsSettlement";

export type PublicTip = {
  id: number;
  sport: "football" | "cricket" | "basketball" | "tennis" | "esports" | "mma" | "other";
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
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
};

function classifySport(sportKey: string | null, sportTitle: string | null): PublicTip["sport"] {
  const value = `${sportKey || ""} ${sportTitle || ""}`.toLowerCase();
  if (value.includes("cricket")) return "cricket";
  if (value.includes("soccer") || value.includes("football")) return "football";
  if (value.includes("basketball")) return "basketball";
  if (value.includes("tennis") && !value.includes("table")) return "tennis";
  if (value.includes("esport") || value.includes("cs2") || value.includes("dota") || value.includes("valorant")) return "esports";
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
  if (!env.DB) return { ok: true, generatedAt, tips: [], summary: { days: 7, ...summary } };

  try {
    const safeLimit = Math.max(1, Math.min(limit, 20));
    const rows = (await env.DB.prepare(`
      SELECT id, event_id, sport_key, sport_title, home_team, away_team, commence_time,
             market, selection, odds, tips_json, result
      FROM tip_posts
      WHERE status = 'POSTED'
        AND (posted_at >= datetime('now', '-7 days') OR created_at >= datetime('now', '-7 days'))
      ORDER BY COALESCE(commence_time, posted_at, created_at) DESC, id DESC
      LIMIT ?
    `).bind(safeLimit).all<Record<string, unknown> | null>()).results;

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

    return { ok: true, generatedAt, tips, summary: { days: 7, ...summary } };
  } catch {
    // Graceful public fallback when D1/schema is unavailable.
    return { ok: true, generatedAt, tips: [], summary: { days: 7, ...summary } };
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
  var avatar = function(name){
    var h = hue(name || "x");
    return '<span class="tipAvatar" style="background:hsl(' + h + ' 55% 28%);border-color:hsl(' + h + ' 60% 42%)">' + esc(initials(name)) + '</span>';
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
    if (r === "WON") return '<span class="tipStatus won">Won</span>';
    if (r === "LOST") return '<span class="tipStatus lost">Lost</span>';
    if (r === "VOID") return '<span class="tipStatus void">Void</span>';
    if (r === "PARTIAL") return '<span class="tipStatus partial">Partial</span>';
    return '<span class="tipStatus pending">Today</span>';
  };
  var render = function(data){
    var tips = Array.isArray(data.tips) ? data.tips : [];
    var summary = data.summary || {};
    var labels = {
      si: { all: "සියල්ල", football: "පාපන්දු", cricket: "ක්‍රිකට්", tips: "ඉඟි", none: "දැනට ඉඟි නැහැ", noSettled: "පසුගිය දින 7 තුළ තීරණය කළ ඉඟි නැහැ", settled: "පසුගිය දින 7 තීරණය කළ ඉඟි", rate: "සාර්ථකත්වය", won: "ජයග්‍රහණ", roi: "සතිපතා ROI" },
      en: { all: "All", football: "Football", cricket: "Cricket", tips: "Tips", none: "No tips available", noSettled: "No settled tip results are available for the last 7 days.", settled: "7-day settled tips", rate: "Strike rate", won: "Won", roi: "Weekly ROI" },
      ta: { all: "அனைத்தும்", football: "கால்பந்து", cricket: "கிரிக்கெட்", tips: "குறிப்புகள்", none: "குறிப்புகள் இப்போது இல்லை", noSettled: "கடந்த 7 நாட்களில் முடிவுகள் இல்லை", settled: "கடந்த 7 நாட்களின் முடிவுகள்", rate: "வெற்றி விகிதம்", won: "வென்றவை", roi: "வார ROI" }
    }[document.documentElement.lang] || {
      all: "All", football: "Football", cricket: "Cricket", tips: "Tips", none: "No tips available", noSettled: "No settled tip results are available for the last 7 days.", settled: "7-day settled tips", rate: "Strike rate", won: "Won", roi: "Weekly ROI"
    };
    var badge = document.getElementById("tipsLiveBadge");
    var summaryEl = document.getElementById("tipLiveSummary");
    var emptyState = document.getElementById("tipEmptyState");
    var tipGrid = document.getElementById("tipCardGrid");
    var tabs = document.querySelectorAll("#tips-preview .tipTab");

    if (badge) badge.textContent = tips.length ? labels.tips + " (" + tips.length + ")" : labels.none;
    tabs.forEach(function(b){
      var sport = b.getAttribute("data-sport");
      b.textContent = sport === "football" ? labels.football : sport === "cricket" ? labels.cricket : labels.all;
    });

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
        '<div class="tipTeams"><div class="tipTeam">' + avatar(t.homeTeam) + '<b>' + esc(t.homeTeam) + '</b></div><div class="tipVs">VS</div><div class="tipTeam">' + avatar(t.awayTeam) + '<b>' + esc(t.awayTeam) + '</b></div></div>' +
        '<div class="tipWhen">' + esc(fmtWhen(t.commenceTime)) + score + '</div>' +
        '<div class="tipPickRow"><span class="tipMarketTag">' + esc(marketLabel(t.market)) + '</span><span class="tipPickName">' + esc(pickLabel(t)) + '</span><b class="tipOdds">' + (t.odds ? Number(t.odds).toFixed(2) : "—") + '</b></div>' +
        '<div class="tipFoot">⚡ Tap here for Live Odds · Live on Telegram</div>' +
      '</article>';
    }).join("") : "";

    if (tipGrid) tipGrid.innerHTML = cards;
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

  fetch("/api/tips/preview", { headers: { Accept: "application/json" }, cache: "no-store" })
    .then(function(r){ if (!r.ok) throw new Error("preview unavailable"); return r.json(); })
    .then(render)
    .catch(function(){ render({ tips: [], summary: { total: 0, won: 0, lost: 0, winRate: 0, weeklyRoi: "" } }); });
})();`;
  return `<script${nonceAttr}>${body}</script>`;
}
