import type { Env } from "./types";
import { getTipsPerformanceStats } from "./tipsSettlement";

export type PublicTip = {
  id: number;
  sport: "football" | "cricket" | "other";
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
  };
};

function classifySport(sportKey: string | null, sportTitle: string | null): PublicTip["sport"] {
  const value = `${sportKey || ""} ${sportTitle || ""}`.toLowerCase();
  if (value.includes("cricket")) return "cricket";
  if (value.includes("soccer") || value.includes("football")) return "football";
  return "other";
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseTipsJson(raw: string | null, row: Record<string, unknown>): PublicTip[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 8).map((item: any, index: number) => ({
          id: Number(row.id) * 100 + index,
          sport: classifySport(String(item?.sportKey || ""), String(item?.sportTitle || "")),
          sportTitle: String(item?.sportTitle || row.sport_title || "Sports"),
          homeTeam: String(item?.homeTeam || row.home_team || "Home team"),
          awayTeam: String(item?.awayTeam || row.away_team || "Away team"),
          selection: String(item?.selection || row.selection || "Preview"),
          market: String(item?.market || row.market || "h2h"),
          odds: safeNumber(item?.odds ?? row.odds),
          commenceTime: item?.commenceTime ? String(item.commenceTime) : (row.commence_time ? String(row.commence_time) : null),
          result: item?.result ? String(item.result).toUpperCase() as PublicTip["result"] : (row.result ? String(row.result).toUpperCase() as PublicTip["result"] : null),
          scoreHome: item?.scoreHome != null ? String(item.scoreHome) : null,
          scoreAway: item?.scoreAway != null ? String(item.scoreAway) : null,
        }));
      }
    } catch {
      // Fall through to the single-pick row representation.
    }
  }

  if (!row.home_team || !row.away_team || !row.selection) return [];
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
    result: row.result ? String(row.result).toUpperCase() as PublicTip["result"] : null,
    scoreHome: null,
    scoreAway: null,
  }];
}

/** Public, read-only tip data. Sensitive/internal fields are never returned. */
export async function getPublicTips(env: Env, limit = 12): Promise<PublicTipsResponse> {
  const generatedAt = new Date().toISOString();
  const summary = await getTipsPerformanceStats(env, 7);
  if (!env.DB) return { ok: true, generatedAt, tips: [], summary: { days: 7, ...summary } };

  try {
    const rows = (await env.DB.prepare(`
      SELECT id, sport_key, sport_title, home_team, away_team, commence_time,
             market, selection, odds, tips_json, result
      FROM tip_posts
      WHERE status = 'POSTED'
        AND (posted_at >= datetime('now', '-48 hours') OR created_at >= datetime('now', '-48 hours'))
      ORDER BY COALESCE(commence_time, posted_at, created_at) ASC, id DESC
      LIMIT ?
    `).bind(Math.max(1, Math.min(limit, 20))).all<Record<string, unknown> | null>()).results;

    const tips = rows
      .flatMap((row) => row ? parseTipsJson(row.tips_json ? String(row.tips_json) : null, row) : [])
      .filter((tip) => tip.sport === "football" || tip.sport === "cricket")
      .slice(0, Math.max(1, Math.min(limit, 20)));

    return { ok: true, generatedAt, tips, summary: { days: 7, ...summary } };
  } catch {
    // Graceful public fallback when D1/schema is unavailable.
    return { ok: true, generatedAt, tips: [], summary: { days: 7, ...summary } };
  }
}

/** Client-side enhancement keeps the public page resilient if the preview API is temporarily unavailable. */
export function publicTipsClientScript(channelUrl: string, nonce?: string): string {
  const safeChannel = JSON.stringify(channelUrl).replace(/</g, "\\u003c");
  const nonceAttr = nonce ? ` nonce="${nonce.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : "";
  return `<script${nonceAttr}>(function(){var root=document.querySelector('#tips-preview .tips');if(!root)return;var channel=${safeChannel};var esc=function(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')};var fmt=function(v){if(!v)return 'Time not available';try{return new Date(v).toLocaleString('en-LK',{dateStyle:'medium',timeStyle:'short'})}catch(e){return esc(v)}};var icon=function(s){return s==='cricket'?'🏏':'⚽'};var result=function(r){if(r==='WON')return '✅ Won';if(r==='LOST')return '❌ Lost';if(r==='VOID')return '⚪ Void';if(r==='PARTIAL')return '🟡 Partial';return '⏳ Pending'};var render=function(data){var tips=Array.isArray(data.tips)?data.tips:[];var groups=['football','cricket'];var tabs='<div class="tipTabs" role="tablist" aria-label="Free tips sport"><button type="button" data-sport="all" class="tipTab active">All</button><button type="button" data-sport="football" class="tipTab">⚽ Football</button><button type="button" data-sport="cricket" class="tipTab">🏏 Cricket</button></div>';var summary=data.summary||{};var stats='<div class="tipSummary"><span><b>'+esc(summary.total||0)+'</b> settled (7d)</span><span><b>'+esc(summary.won||0)+'</b> won</span><span><b>'+esc(summary.lost||0)+'</b> lost</span><span><b>'+esc(summary.winRate||0)+'%</b> win rate</span></div>';var list=tips.length?tips.map(function(t){var score=t.scoreHome!=null&&t.scoreAway!=null?' · Score '+esc(t.scoreHome)+'-'+esc(t.scoreAway):'';return '<article class="tip" data-sport="'+esc(t.sport)+'"><div><small>'+icon(t.sport)+' '+esc(t.sportTitle)+'</small><strong>'+esc(t.homeTeam)+' vs '+esc(t.awayTeam)+'</strong></div><span class="market">'+esc(t.selection)+' · '+esc(t.market)+score+'<small>'+fmt(t.commenceTime)+'</small></span><b class="odds">'+(t.odds?Number(t.odds).toFixed(2):'—')+'</b><span class="tipResult">'+result(t.result)+'</span></article>'}).join(''):'<div class="tipEmpty"><b>No public tips are available right now.</b><span>New Football / Cricket tips will appear here after the next successful publish.</span></div>';root.innerHTML=tabs+stats+'<div class="tipList">'+list+'</div><div class="disclaimer">Informational preview only. Sports outcomes are uncertain. No tip guarantees a win or profit. 18+ only.</div><div class="actions" style="margin-top:14px"><a class="btn primary" href="'+esc(channel)+'" rel="noopener noreferrer">Open @fast_xbet_official_tips →</a></div>';var buttons=root.querySelectorAll('.tipTab');buttons.forEach(function(b){b.addEventListener('click',function(){buttons.forEach(function(x){x.classList.remove('active')});b.classList.add('active');var sport=b.getAttribute('data-sport');root.querySelectorAll('.tipList .tip').forEach(function(x){x.style.display=sport==='all'||x.getAttribute('data-sport')===sport?'grid':'none'})})});};fetch('/api/tips/preview',{headers:{Accept:'application/json'},cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('preview unavailable');return r.json()}).then(render).catch(function(){render({tips:[],summary:{total:0,won:0,lost:0,winRate:0}})});})();</script>`;
}
