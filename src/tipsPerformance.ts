import type { Env } from "./types";
import { MONTHLY_TOTAL_BUDGET, currentUtcMonth } from "./oddsCreditManager";
import { escapeMarkdown } from "./utils";

export interface PerformanceWindowStats {
  label: string;
  posts: number;
  wonPosts: number;
  lostPosts: number;
  partialPosts: number;
  picks: number;
  wonPicks: number;
  lostPicks: number;
  voidPicks: number;
  pendingPicks: number;
  winRatePct: number;
  pickWinRatePct: number;
  netUnits: number;
  roiPct: number;
  avgOdds: number;
}

export interface SportPerformanceItem {
  sportKey: string;
  sportTitle: string;
  picks: number;
  wonPicks: number;
  lostPicks: number;
  voidPicks: number;
  winRatePct: number;
  netUnits: number;
  roiPct: number;
}

export interface DetailedPerformanceReport {
  today: PerformanceWindowStats;
  days7: PerformanceWindowStats;
  days30: PerformanceWindowStats;
  allTime: PerformanceWindowStats;
  bySport: SportPerformanceItem[];
  recentForm: Array<"W" | "L" | "V">;
  generatedAt: string;
}

function round1(val: number): number {
  return Number.isFinite(val) ? Math.round(val * 10) / 10 : 0;
}

function round2(val: number): number {
  return Number.isFinite(val) ? Math.round(val * 100) / 100 : 0;
}

export function getSriLankaDateParts(date = new Date()): {
  dateStr: string;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  const hourNum = Number.parseInt(get("hour"), 10);
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number.isFinite(hourNum) ? hourNum % 24 : 0,
    minute: Number.parseInt(get("minute"), 10) || 0,
  };
}

function emptyWindowStats(label: string): PerformanceWindowStats {
  return {
    label,
    posts: 0,
    wonPosts: 0,
    lostPosts: 0,
    partialPosts: 0,
    picks: 0,
    wonPicks: 0,
    lostPicks: 0,
    voidPicks: 0,
    pendingPicks: 0,
    winRatePct: 0,
    pickWinRatePct: 0,
    netUnits: 0,
    roiPct: 0,
    avgOdds: 0,
  };
}

async function queryWindowStats(
  env: Partial<Env>,
  label: string,
  options: { slDate?: string; days?: number }
): Promise<PerformanceWindowStats> {
  if (!env.DB || typeof env.DB.prepare !== "function") {
    return emptyWindowStats(label);
  }

  try {
    let postQuery: string;
    let postBindings: unknown[];
    let pickQuery: string;
    let pickBindings: unknown[];

    if (options.slDate) {
      postQuery = `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) AS won,
          SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) AS lost,
          SUM(CASE WHEN result = 'PARTIAL' THEN 1 ELSE 0 END) AS partial
        FROM tip_posts
        WHERE status = 'POSTED'
          AND result IN ('WON', 'LOST', 'PARTIAL', 'VOID')
          AND COALESCE(market, '') <> 'fallback'
          AND date(datetime(COALESCE(settled_at, posted_at, created_at), '+5 hours', '+30 minutes')) = ?
      `;
      postBindings = [options.slDate];

      pickQuery = `
        SELECT
          SUM(CASE WHEN result IN ('WON', 'LOST', 'VOID') THEN 1 ELSE 0 END) AS picks,
          SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) AS won_picks,
          SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) AS lost_picks,
          SUM(CASE WHEN result = 'VOID' THEN 1 ELSE 0 END) AS void_picks,
          SUM(CASE WHEN result = 'PENDING' THEN 1 ELSE 0 END) AS pending_picks,
          COALESCE(SUM(CASE WHEN result = 'WON' THEN odds - 1 WHEN result = 'LOST' THEN -1 ELSE 0 END), 0) AS net_units,
          AVG(CASE WHEN result IN ('WON', 'LOST') AND odds > 0 THEN odds END) AS avg_odds
        FROM tip_results
        WHERE date(datetime(COALESCE(settled_at, created_at), '+5 hours', '+30 minutes')) = ?
      `;
      pickBindings = [options.slDate];
    } else if (options.days) {
      const daysArg = `-${Math.max(1, Math.min(options.days, 365))} days`;
      postQuery = `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) AS won,
          SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) AS lost,
          SUM(CASE WHEN result = 'PARTIAL' THEN 1 ELSE 0 END) AS partial
        FROM tip_posts
        WHERE status = 'POSTED'
          AND result IN ('WON', 'LOST', 'PARTIAL', 'VOID')
          AND COALESCE(market, '') <> 'fallback'
          AND COALESCE(settled_at, posted_at, created_at) >= datetime('now', ?)
      `;
      postBindings = [daysArg];

      pickQuery = `
        SELECT
          SUM(CASE WHEN result IN ('WON', 'LOST', 'VOID') THEN 1 ELSE 0 END) AS picks,
          SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) AS won_picks,
          SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) AS lost_picks,
          SUM(CASE WHEN result = 'VOID' THEN 1 ELSE 0 END) AS void_picks,
          SUM(CASE WHEN result = 'PENDING' THEN 1 ELSE 0 END) AS pending_picks,
          COALESCE(SUM(CASE WHEN result = 'WON' THEN odds - 1 WHEN result = 'LOST' THEN -1 ELSE 0 END), 0) AS net_units,
          AVG(CASE WHEN result IN ('WON', 'LOST') AND odds > 0 THEN odds END) AS avg_odds
        FROM tip_results
        WHERE COALESCE(settled_at, created_at) >= datetime('now', ?)
      `;
      pickBindings = [daysArg];
    } else {
      postQuery = `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) AS won,
          SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) AS lost,
          SUM(CASE WHEN result = 'PARTIAL' THEN 1 ELSE 0 END) AS partial
        FROM tip_posts
        WHERE status = 'POSTED'
          AND result IN ('WON', 'LOST', 'PARTIAL', 'VOID')
          AND COALESCE(market, '') <> 'fallback'
      `;
      postBindings = [];

      pickQuery = `
        SELECT
          SUM(CASE WHEN result IN ('WON', 'LOST', 'VOID') THEN 1 ELSE 0 END) AS picks,
          SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) AS won_picks,
          SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) AS lost_picks,
          SUM(CASE WHEN result = 'VOID' THEN 1 ELSE 0 END) AS void_picks,
          SUM(CASE WHEN result = 'PENDING' THEN 1 ELSE 0 END) AS pending_picks,
          COALESCE(SUM(CASE WHEN result = 'WON' THEN odds - 1 WHEN result = 'LOST' THEN -1 ELSE 0 END), 0) AS net_units,
          AVG(CASE WHEN result IN ('WON', 'LOST') AND odds > 0 THEN odds END) AS avg_odds
        FROM tip_results
      `;
      pickBindings = [];
    }

    const postRow = await env.DB.prepare(postQuery).bind(...postBindings).first<Record<string, unknown>>();
    const pickRow = await env.DB.prepare(pickQuery).bind(...pickBindings).first<Record<string, unknown>>();

    const posts = Math.max(0, Number(postRow?.total || 0) || 0);
    const wonPosts = Math.max(0, Number(postRow?.won || 0) || 0);
    const lostPosts = Math.max(0, Number(postRow?.lost || 0) || 0);
    const partialPosts = Math.max(0, Number(postRow?.partial || 0) || 0);

    const picks = Math.max(0, Number(pickRow?.picks || 0) || 0);
    const wonPicks = Math.max(0, Number(pickRow?.won_picks || 0) || 0);
    const lostPicks = Math.max(0, Number(pickRow?.lost_picks || 0) || 0);
    const voidPicks = Math.max(0, Number(pickRow?.void_picks || 0) || 0);
    const pendingPicks = Math.max(0, Number(pickRow?.pending_picks || 0) || 0);
    const netUnits = round2(Number(pickRow?.net_units || 0) || 0);
    const avgOdds = round2(Number(pickRow?.avg_odds || 0) || 0);

    const decisivePicks = wonPicks + lostPicks;
    const pickWinRatePct = decisivePicks > 0 ? round1((wonPicks / decisivePicks) * 100) : 0;
    const decisivePosts = wonPosts + lostPosts + partialPosts;
    const winRatePct = decisivePosts > 0
      ? round1((wonPosts / decisivePosts) * 100)
      : pickWinRatePct;
    const roiPct = decisivePicks > 0 ? round1((netUnits / decisivePicks) * 100) : 0;

    return {
      label,
      posts,
      wonPosts,
      lostPosts,
      partialPosts,
      picks,
      wonPicks,
      lostPicks,
      voidPicks,
      pendingPicks,
      winRatePct,
      pickWinRatePct,
      netUnits,
      roiPct,
      avgOdds,
    };
  } catch (err) {
    console.warn(`[TipsPerformance] Window query failed (${label}):`, err instanceof Error ? err.message : err);
    return emptyWindowStats(label);
  }
}

export async function getDetailedPerformanceReport(
  env: Partial<Env>,
  options?: { todaySlDate?: string }
): Promise<DetailedPerformanceReport> {
  const generatedAt = new Date().toISOString();
  const slDate = options?.todaySlDate || getSriLankaDateParts().dateStr;

  const empty: DetailedPerformanceReport = {
    today: emptyWindowStats("Today"),
    days7: emptyWindowStats("7D"),
    days30: emptyWindowStats("30D"),
    allTime: emptyWindowStats("All Time"),
    bySport: [],
    recentForm: [],
    generatedAt,
  };

  if (!env.DB || typeof env.DB.prepare !== "function") {
    return empty;
  }

  const [today, days7, days30, allTime] = await Promise.all([
    queryWindowStats(env, "Today", { slDate }),
    queryWindowStats(env, "7D", { days: 7 }),
    queryWindowStats(env, "30D", { days: 30 }),
    queryWindowStats(env, "All Time", {}),
  ]);

  let bySport: SportPerformanceItem[] = [];
  let recentForm: Array<"W" | "L" | "V"> = [];

  try {
    const sportRows = (await env.DB.prepare(`
      SELECT
        sport_key,
        COALESCE(MAX(sport_title), sport_key) AS sport_title,
        COUNT(*) AS picks,
        SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) AS won_picks,
        SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) AS lost_picks,
        SUM(CASE WHEN result = 'VOID' THEN 1 ELSE 0 END) AS void_picks,
        COALESCE(SUM(CASE WHEN result = 'WON' THEN odds - 1 WHEN result = 'LOST' THEN -1 ELSE 0 END), 0) AS net_units
      FROM tip_results
      WHERE result IN ('WON', 'LOST', 'VOID')
        AND COALESCE(settled_at, created_at) >= datetime('now', '-30 days')
      GROUP BY sport_key
      ORDER BY picks DESC, net_units DESC
      LIMIT 8
    `).all<Record<string, unknown>>()).results || [];

    bySport = sportRows
      .filter((r) => Boolean(r?.sport_key) && Number(r?.picks || 0) > 0)
      .map((r) => {
        const wonPicks = Math.max(0, Number(r.won_picks || 0) || 0);
        const lostPicks = Math.max(0, Number(r.lost_picks || 0) || 0);
        const voidPicks = Math.max(0, Number(r.void_picks || 0) || 0);
        const picks = Math.max(0, Number(r.picks || 0) || 0);
        const netUnits = round2(Number(r.net_units || 0) || 0);
        const decisive = wonPicks + lostPicks;
        return {
          sportKey: String(r.sport_key),
          sportTitle: String(r.sport_title || r.sport_key),
          picks,
          wonPicks,
          lostPicks,
          voidPicks,
          winRatePct: decisive > 0 ? round1((wonPicks / decisive) * 100) : 0,
          netUnits,
          roiPct: decisive > 0 ? round1((netUnits / decisive) * 100) : 0,
        };
      });
  } catch (err) {
    console.warn("[TipsPerformance] bySport query skipped:", err instanceof Error ? err.message : err);
  }

  try {
    const formRows = (await env.DB.prepare(`
      SELECT result FROM tip_results
      WHERE result IN ('WON', 'LOST', 'VOID')
      ORDER BY COALESCE(settled_at, created_at) DESC, id DESC
      LIMIT 10
    `).all<{ result?: string }>()).results || [];

    recentForm = formRows
      .map((r) => {
        const res = String(r?.result || "").toUpperCase();
        if (res === "WON") return "W";
        if (res === "LOST") return "L";
        if (res === "VOID") return "V";
        return null;
      })
      .filter((x): x is "W" | "L" | "V" => x !== null);
  } catch {}

  return {
    today,
    days7,
    days30,
    allTime,
    bySport,
    recentForm,
    generatedAt,
  };
}

function resolveChannelTarget(env: Partial<Env>): string {
  const raw = (env.TIPS_CHANNEL_ID || env.CHANNEL_USERNAME || "").trim();
  if (!raw) return "";
  return raw.startsWith("@") ? raw : raw.replace(/^id:\s*/i, "").trim();
}

/**
 * Automated nightly Win Rate & ROI summary posted to the Telegram channel at ~23:37 SL time
 * (with 00:37 SL fallback if missed). Runs strictly from D1 data (0 API credits).
 */
export async function maybePostDailyPerformanceRecap(
  env: Partial<Env>,
  now = new Date()
): Promise<{ posted: boolean; reason?: string; date?: string }> {
  if (!env.DB || typeof env.DB.prepare !== "function") {
    return { posted: false, reason: "no_db" };
  }
  const chatId = resolveChannelTarget(env);
  if (!env.BOT_TOKEN || !chatId) {
    return { posted: false, reason: "no_channel" };
  }

  const sl = getSriLankaDateParts(now);
  let targetSlDate: string | null = null;
  if (sl.hour === 23) {
    targetSlDate = sl.dateStr;
  } else if (sl.hour === 0) {
    targetSlDate = getSriLankaDateParts(new Date(now.getTime() - 2 * 3600_000)).dateStr;
  } else {
    return { posted: false, reason: "outside_window" };
  }

  const monthUtc = currentUtcMonth(now);
  try {
    await env.DB.prepare(
      `INSERT INTO odds_credit_guard_state (month_utc, total_budget) VALUES (?, ?) ON CONFLICT(month_utc) DO NOTHING`
    ).bind(monthUtc, MONTHLY_TOTAL_BUDGET).run();

    const claim = await env.DB.prepare(`
      UPDATE odds_credit_guard_state
      SET daily_recap_date = ?, updated_at = datetime('now')
      WHERE month_utc = ?
        AND (daily_recap_date IS NULL OR daily_recap_date != ?)
    `).bind(targetSlDate, monthUtc, targetSlDate).run();

    if ((claim.meta?.changes ?? 0) !== 1) {
      return { posted: false, reason: "already_sent", date: targetSlDate };
    }
  } catch (err) {
    return { posted: false, reason: err instanceof Error ? err.message : "claim_failed" };
  }

  const report = await getDetailedPerformanceReport(env, { todaySlDate: targetSlDate });
  if (report.today.picks === 0 && report.days7.picks === 0) {
    return { posted: false, reason: "no_settled_picks", date: targetSlDate };
  }

  const formatSignedUnits = (u: number) => `${u >= 0 ? "+" : ""}${u.toFixed(2)}u`;
  const formatSignedPct = (p: number) => `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;

  const lines = [
    "📊 *DAILY & MONTHLY PERFORMANCE REPORT* 🏆",
    `📅 *දිනය (Date):* \`${escapeMarkdown(targetSlDate)}\` (Sri Lanka)`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  if (report.today.picks > 0) {
    lines.push(
      `📌 *අද දින සාරාංශය (Today's Picks):*`,
      `✅ Won: *${report.today.wonPicks}* · ❌ Lost: *${report.today.lostPicks}* · ⚪ Void: *${report.today.voidPicks}*`,
      `🎯 Pick Win Rate: *${report.today.pickWinRatePct.toFixed(1)}%* · 💰 Net: *${formatSignedUnits(report.today.netUnits)}* (${formatSignedPct(report.today.roiPct)} ROI)`
    );
  } else {
    lines.push("📌 *අද දින සාරාංශය (Today):* තවමත් තීරණය කළ picks නොමැත (Pending / No results).");
  }

  lines.push(
    "",
    `📈 *පසුගිය දින 7 (7-Day Rolling):*`,
    `• Picks: *${report.days7.wonPicks}W / ${report.days7.lostPicks}L* (${report.days7.voidPicks}V) · Win Rate: *${report.days7.pickWinRatePct.toFixed(1)}%*`,
    `• Net Profit: *${formatSignedUnits(report.days7.netUnits)}* · ROI: *${formatSignedPct(report.days7.roiPct)}*`,
    "",
    `🗓️ *මාසික සාරාංශය (30-Day Tracker):*`,
    `• Picks: *${report.days30.wonPicks}W / ${report.days30.lostPicks}L* (${report.days30.voidPicks}V) · Win Rate: *${report.days30.pickWinRatePct.toFixed(1)}%*`,
    `• Net Profit: *${formatSignedUnits(report.days30.netUnits)}* · ROI: *${formatSignedPct(report.days30.roiPct)}*`
  );

  if (report.recentForm.length > 0) {
    const formIcons = report.recentForm.slice(0, 8).map((f) => (f === "W" ? "✅" : f === "L" ? "❌" : "⚪")).join(" ");
    lines.push("", `🔥 *Recent Form:* ${formIcons}`);
  }

  lines.push(
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    "ℹ️ _1u flat-stake simulation per pick. Past performance is not a guarantee of future results._",
    "⚠️ _18+ පමණි. වගකීමෙන් යුතුව ක්‍රීඩා කරන්න._"
  );

  try {
    const resp = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    const data = (await resp.json()) as { ok?: boolean; description?: string };
    if (!resp.ok || !data?.ok) {
      await env.DB.prepare(
        `UPDATE odds_credit_guard_state SET daily_recap_date = NULL WHERE month_utc = ? AND daily_recap_date = ?`
      ).bind(monthUtc, targetSlDate).run().catch(() => {});
      return { posted: false, reason: data?.description || `HTTP ${resp.status}`, date: targetSlDate };
    }
    return { posted: true, date: targetSlDate };
  } catch (err) {
    await env.DB.prepare(
      `UPDATE odds_credit_guard_state SET daily_recap_date = NULL WHERE month_utc = ? AND daily_recap_date = ?`
    ).bind(monthUtc, targetSlDate).run().catch(() => {});
    return { posted: false, reason: err instanceof Error ? err.message : "send_failed", date: targetSlDate };
  }
}
