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

/**
 * Public, read-only tip data for the landing page.
 * It never exposes Telegram IDs, payment data, internal errors, or raw D1 rows.
 */
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
    // Graceful public fallback: keep the page usable even when D1 is unavailable.
    return { ok: true, generatedAt, tips: [], summary: { days: 7, ...summary } };
  }
}
