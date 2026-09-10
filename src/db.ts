import type { Env, DepositRow, WithdrawalRow, D1Database, SystemStats, ReferralItem, AdminActionRow } from "./types";

/** Convert LKR major units (e.g. 1500.50) to integer cents. Avoids floating-point drift. */
export function toCents(amountLkr: number): number {
  if (!Number.isFinite(amountLkr) || amountLkr < 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(amountLkr * 100);
}

/** Convert integer cents back to LKR major units for display / business logic. */
export function fromCents(cents: number): number {
  if (cents == null || !Number.isFinite(cents)) return 0;
  return cents / 100;
}

function mapDepositRow(row: any): DepositRow | null {
  if (!row) return null;
  return {
    ...row,
    amount: fromCents(Number(row.amount)),
  };
}

function mapWithdrawalRow(row: any): WithdrawalRow | null {
  if (!row) return null;
  return {
    ...row,
    amount: fromCents(Number(row.amount)),
  };
}

export async function saveUser(
  db: D1Database,
  userId: number,
  username: string | null,
  firstName: string | null,
  referredBy: number | null,
  language: "si" | "en" | "ta" = "si"
) {
  await db
    .prepare(
      `INSERT INTO users (user_id, username, first_name, referred_by, language)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET 
         username = excluded.username, 
         first_name = excluded.first_name,
         language = COALESCE(users.language, excluded.language)`
    )
    .bind(userId, username, firstName, referredBy, language)
    .run();
}

export async function getUser(db: D1Database, userId: number): Promise<import("./types").UserRow | null> {
  return db
    .prepare(`SELECT user_id, username, first_name, referred_by, language, created_at FROM users WHERE user_id = ?`)
    .bind(userId)
    .first<import("./types").UserRow>();
}

export async function setUserLanguage(db: D1Database, userId: number, language: "si" | "en" | "ta") {
  await db
    .prepare(`UPDATE users SET language = ? WHERE user_id = ?`)
    .bind(language, userId)
    .run();
}

export async function addReferral(db: D1Database, referrerId: number, referredId: number) {
  if (referrerId === referredId) return;
  await db
    .prepare(
      `INSERT OR IGNORE INTO referrals (referrer_id, referred_id) VALUES (?, ?)`
    )
    .bind(referrerId, referredId)
    .run();
}

export async function setUserState(
  db: D1Database,
  userId: number,
  state: string,
  data: Record<string, any> = {}
) {
  await db
    .prepare(
      `INSERT INTO user_state (user_id, state, data, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, data = excluded.data, updated_at = datetime('now')`
    )
    .bind(userId, state, JSON.stringify(data))
    .run();
}

export async function getUserState(db: D1Database, userId: number) {
  const row = await db
    .prepare(`SELECT state, data FROM user_state WHERE user_id = ?`)
    .bind(userId)
    .first<{ state: string; data: string }>();
  if (!row) return null;
  return { state: row.state, data: JSON.parse(row.data || "{}") };
}

export async function clearUserState(db: D1Database, userId: number) {
  await db.prepare(`DELETE FROM user_state WHERE user_id = ?`).bind(userId).run();
}

/**
 * Remove orphaned / stale user_state rows older than maxAgeHours (default 24h).
 * Call periodically (e.g. on worker startup or cron) to prevent accumulation.
 */
export async function cleanupStaleUserStates(db: D1Database, maxAgeHours: number = 24): Promise<number> {
  const result = await db
    .prepare(
      `DELETE FROM user_state WHERE updated_at < datetime('now', ?)`
    )
    .bind(`-${maxAgeHours} hours`)
    .run();
  return result.meta?.changes ?? 0;
}

/**
 * Atomically insert a deposit and clear the user's multi-step state.
 * Uses D1 batch when available so the two operations succeed or fail together.
 */
export async function addDeposit(
  db: D1Database,
  userId: number,
  username: string | null,
  playerId: string,
  amountLkr: number,
  photoFileId: string | null,
  paymentMethod: string = "BANK",
  r2Url: string | null = null
): Promise<number> {
  const amountCents = toCents(amountLkr);

  const insertStmt = db
    .prepare(
      `INSERT INTO deposits (user_id, username, player_id, amount, payment_method, photo_file_id, r2_url)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .bind(userId, username, playerId, amountCents, paymentMethod, photoFileId, r2Url);

  const clearStmt = db.prepare(`DELETE FROM user_state WHERE user_id = ?`).bind(userId);

  if (typeof db.batch === "function") {
    const results = await db.batch([insertStmt, clearStmt]);
    const first = results?.[0];
    const id =
      first?.results?.[0]?.id ??
      first?.meta?.last_row_id ??
      (await insertStmt.first<{ id: number }>())?.id ??
      0;
    return Number(id) || 0;
  }

  const result = await insertStmt.first<{ id: number }>();
  await clearStmt.run();
  return result?.id ?? 0;
}

export async function updateDepositR2Url(db: D1Database, id: number, r2Url: string) {
  await db
    .prepare(`UPDATE deposits SET r2_url = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`)
    .bind(r2Url, id)
    .run();
}

/**
 * Atomically insert a withdrawal and clear the user's multi-step state.
 */
export async function addWithdrawal(
  db: D1Database,
  userId: number,
  username: string | null,
  playerId: string,
  amountLkr: number,
  securityCode: string | null,
  paymentMethod: string = "BANK",
  destinationAccount: string | null = null
): Promise<number> {
  const amountCents = toCents(amountLkr);

  const insertStmt = db
    .prepare(
      `INSERT INTO withdrawals (user_id, username, player_id, amount, payment_method, destination_account, security_code)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .bind(userId, username, playerId, amountCents, paymentMethod, destinationAccount, securityCode);

  const clearStmt = db.prepare(`DELETE FROM user_state WHERE user_id = ?`).bind(userId);

  if (typeof db.batch === "function") {
    const results = await db.batch([insertStmt, clearStmt]);
    const first = results?.[0];
    const id =
      first?.results?.[0]?.id ??
      first?.meta?.last_row_id ??
      (await insertStmt.first<{ id: number }>())?.id ??
      0;
    return Number(id) || 0;
  }

  const result = await insertStmt.first<{ id: number }>();
  await clearStmt.run();
  return result?.id ?? 0;
}

export async function getPendingDeposits(db: D1Database) {
  const res = await db
    .prepare(
      `SELECT id, user_id, username, player_id, amount, payment_method, photo_file_id, r2_url, created_at
       FROM deposits WHERE status = 'PENDING' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20`
    )
    .all<any>();
  return {
    ...res,
    results: (res.results || []).map((r) => mapDepositRow(r)!),
  };
}

export async function getPendingWithdrawals(db: D1Database) {
  const res = await db
    .prepare(
      `SELECT id, user_id, username, player_id, amount, payment_method, destination_account, security_code, created_at
       FROM withdrawals WHERE status = 'PENDING' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 20`
    )
    .all<any>();
  return {
    ...res,
    results: (res.results || []).map((r) => mapWithdrawalRow(r)!),
  };
}

export async function getDepositById(db: D1Database, id: number) {
  const row = await db
    .prepare(
      `SELECT id, user_id, username, player_id, amount, payment_method, photo_file_id, r2_url, status, created_at, deleted_at
       FROM deposits WHERE id = ? AND deleted_at IS NULL`
    )
    .bind(id)
    .first<any>();
  return mapDepositRow(row);
}

export async function getWithdrawalById(db: D1Database, id: number) {
  const row = await db
    .prepare(
      `SELECT id, user_id, username, player_id, amount, payment_method, destination_account, security_code, status, created_at, deleted_at
       FROM withdrawals WHERE id = ? AND deleted_at IS NULL`
    )
    .bind(id)
    .first<any>();
  return mapWithdrawalRow(row);
}

export async function updateDepositStatus(
  db: D1Database,
  id: number,
  status: "APPROVED" | "REJECTED"
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE deposits SET status = ?, updated_at = datetime('now') WHERE id = ? AND status = 'PENDING' AND deleted_at IS NULL`
    )
    .bind(status, id)
    .run();
  const changes = result.meta?.changes ?? (result.success ? 1 : 0);
  return Boolean(result.success && changes > 0);
}

export async function updateWithdrawalStatus(
  db: D1Database,
  id: number,
  status: "APPROVED" | "REJECTED"
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE withdrawals SET status = ?, updated_at = datetime('now') WHERE id = ? AND status = 'PENDING' AND deleted_at IS NULL`
    )
    .bind(status, id)
    .run();
  const changes = result.meta?.changes ?? (result.success ? 1 : 0);
  return Boolean(result.success && changes > 0);
}

/** Soft-delete a deposit (preserves audit trail). */
export async function softDeleteDeposit(db: D1Database, id: number): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE deposits SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`
    )
    .bind(id)
    .run();
  const changes = result.meta?.changes ?? (result.success ? 1 : 0);
  return Boolean(result.success && changes > 0);
}

/** Soft-delete a withdrawal (preserves audit trail). */
export async function softDeleteWithdrawal(db: D1Database, id: number): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE withdrawals SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`
    )
    .bind(id)
    .run();
  const changes = result.meta?.changes ?? (result.success ? 1 : 0);
  return Boolean(result.success && changes > 0);
}

export async function getUserHistory(db: D1Database, userId: number) {
  const deposits = await db
    .prepare(
      `SELECT amount, payment_method, status, created_at FROM deposits WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`
    )
    .bind(userId)
    .all();
  const withdrawals = await db
    .prepare(
      `SELECT amount, payment_method, status, created_at FROM withdrawals WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`
    )
    .bind(userId)
    .all();

  const mapAmt = (rows: any[]) =>
    (rows || []).map((r) => ({ ...r, amount: fromCents(Number(r.amount)) }));

  return {
    deposits: mapAmt(deposits.results),
    withdrawals: mapAmt(withdrawals.results),
  };
}

export async function getStats(db: D1Database): Promise<SystemStats> {
  const totalUsers = await db.prepare(`SELECT COUNT(*) as c FROM users`).first<{ c: number }>();
  const todayUsers = await db
    .prepare(`SELECT COUNT(*) as c FROM users WHERE date(created_at) = date('now')`)
    .first<{ c: number }>();

  const depStats = await db
    .prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as approved_volume_cents,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' AND date(created_at) = date('now') THEN amount ELSE 0 END), 0) as today_volume_cents
      FROM deposits
      WHERE deleted_at IS NULL
    `)
    .first<{
      pending_count: number;
      approved_count: number;
      approved_volume_cents: number;
      rejected_count: number;
      today_volume_cents: number;
    }>();

  const wdStats = await db
    .prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount ELSE 0 END), 0) as approved_volume_cents,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
        COALESCE(SUM(CASE WHEN status = 'APPROVED' AND date(created_at) = date('now') THEN amount ELSE 0 END), 0) as today_volume_cents
      FROM withdrawals
      WHERE deleted_at IS NULL
    `)
    .first<{
      pending_count: number;
      approved_count: number;
      approved_volume_cents: number;
      rejected_count: number;
      today_volume_cents: number;
    }>();

  return {
    totalUsers: totalUsers?.c ?? 0,
    todayUsers: todayUsers?.c ?? 0,
    pendingDeposits: depStats?.pending_count ?? 0,
    approvedDepositsCount: depStats?.approved_count ?? 0,
    approvedDepositsVolume: fromCents(depStats?.approved_volume_cents ?? 0),
    rejectedDepositsCount: depStats?.rejected_count ?? 0,
    pendingWithdrawals: wdStats?.pending_count ?? 0,
    approvedWithdrawalsCount: wdStats?.approved_count ?? 0,
    approvedWithdrawalsVolume: fromCents(wdStats?.approved_volume_cents ?? 0),
    rejectedWithdrawalsCount: wdStats?.rejected_count ?? 0,
    todayDepositsVolume: fromCents(depStats?.today_volume_cents ?? 0),
    todayWithdrawalsVolume: fromCents(wdStats?.today_volume_cents ?? 0),
  };
}

export async function getUserReferrals(db: D1Database, userId: number): Promise<ReferralItem[]> {
  const result = await db
    .prepare(`
      SELECT 
        r.referred_id,
        u.username,
        u.first_name,
        r.created_at,
        COUNT(d.id) as deposit_count,
        COALESCE(SUM(CASE WHEN d.status = 'APPROVED' THEN d.amount ELSE 0 END), 0) as total_deposited_cents
      FROM referrals r
      LEFT JOIN users u ON u.user_id = r.referred_id
      LEFT JOIN deposits d ON d.user_id = r.referred_id AND d.deleted_at IS NULL
      WHERE r.referrer_id = ?
      GROUP BY r.referred_id, u.username, u.first_name, r.created_at
      ORDER BY r.created_at DESC
      LIMIT 20
    `)
    .bind(userId)
    .all<any>();

  return (result.results || []).map((r) => ({
    referred_id: r.referred_id,
    username: r.username,
    first_name: r.first_name,
    created_at: r.created_at,
    deposit_count: r.deposit_count,
    total_deposited: fromCents(Number(r.total_deposited_cents)),
  }));
}

export async function getUserReferralSummary(db: D1Database, userId: number) {
  const summary = await db
    .prepare(`
      SELECT 
        COUNT(DISTINCT r.referred_id) as total_referrals,
        COUNT(DISTINCT CASE WHEN d.status = 'APPROVED' THEN r.referred_id END) as active_referrals,
        COALESCE(SUM(CASE WHEN d.status = 'APPROVED' THEN d.amount ELSE 0 END), 0) as total_volume_cents
      FROM referrals r
      LEFT JOIN deposits d ON d.user_id = r.referred_id AND d.deleted_at IS NULL
      WHERE r.referrer_id = ?
    `)
    .bind(userId)
    .first<{
      total_referrals: number;
      active_referrals: number;
      total_volume_cents: number;
    }>();

  return {
    totalReferrals: summary?.total_referrals ?? 0,
    activeReferrals: summary?.active_referrals ?? 0,
    totalVolume: fromCents(summary?.total_volume_cents ?? 0),
  };
}

export async function getAllUserIds(db: D1Database) {
  const result = await db.prepare(`SELECT user_id FROM users`).all<{ user_id: number }>();
  return result.results.map((r) => r.user_id);
}

/* ============================================================
 * 🛡️ Security & Fraud Prevention
 * ============================================================ */

/**
 * Count how many deposit/withdrawal requests a user has submitted within the
 * last `windowMinutes`. Used to rate-limit repeated submissions from the same user.
 */
export async function countRecentSubmissions(
  db: D1Database,
  userId: number,
  table: "deposits" | "withdrawals",
  windowMinutes: number = 10
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as c FROM ${table} WHERE user_id = ? AND deleted_at IS NULL AND created_at >= datetime('now', ?)`
    )
    .bind(userId, `-${windowMinutes} minutes`)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

/**
 * Find prior deposits (submitted by a *different* Telegram user) that reused the exact
 * same Telegram photo file_id. A strong signal of a reused / recycled receipt screenshot.
 */
export async function findDuplicateReceipt(
  db: D1Database,
  photoFileId: string,
  excludeUserId: number
): Promise<DepositRow[]> {
  if (!photoFileId) return [];
  const res = await db
    .prepare(
      `SELECT id, user_id, username, player_id, amount, payment_method, photo_file_id, r2_url, status, created_at
       FROM deposits
       WHERE photo_file_id = ? AND user_id != ? AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 5`
    )
    .bind(photoFileId, excludeUserId)
    .all<any>();
  return (res.results || []).map((r) => mapDepositRow(r)!);
}

/**
 * Check whether a Player ID has previously been used by a *different* Telegram user
 * (across both deposits and withdrawals). Flags possibly shared/stolen player accounts.
 */
export async function getPlayerIdOwners(
  db: D1Database,
  playerId: string,
  excludeUserId: number
): Promise<number[]> {
  const [depRes, wdRes] = await Promise.all([
    db
      .prepare(`SELECT DISTINCT user_id FROM deposits WHERE player_id = ? AND user_id != ? AND deleted_at IS NULL`)
      .bind(playerId, excludeUserId)
      .all<{ user_id: number }>(),
    db
      .prepare(`SELECT DISTINCT user_id FROM withdrawals WHERE player_id = ? AND user_id != ? AND deleted_at IS NULL`)
      .bind(playerId, excludeUserId)
      .all<{ user_id: number }>(),
  ]);
  const ids = new Set<number>();
  (depRes.results || []).forEach((r) => ids.add(r.user_id));
  (wdRes.results || []).forEach((r) => ids.add(r.user_id));
  return Array.from(ids);
}

/**
 * Permanently record an admin approve/reject decision. Unlike the R2 audit logs
 * (30-day retention), rows here are never auto-deleted — a durable compliance trail.
 */
export async function logAdminAction(
  db: D1Database,
  adminId: number,
  adminUsername: string | null,
  action: string,
  targetType: "DEPOSIT" | "WITHDRAWAL",
  targetId: number,
  targetUserId: number | null,
  amountLkr: number | null,
  details: Record<string, any> = {}
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_actions (admin_id, admin_username, action, target_type, target_id, target_user_id, amount, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      adminId,
      adminUsername,
      action,
      targetType,
      targetId,
      targetUserId,
      amountLkr != null ? toCents(amountLkr) : null,
      JSON.stringify(details || {})
    )
    .run();
}

/** Fetch the most recent admin approve/reject actions (for the /auditlog command). */
export async function getRecentAdminActions(db: D1Database, limit: number = 20): Promise<AdminActionRow[]> {
  const res = await db
    .prepare(`SELECT * FROM admin_actions ORDER BY created_at DESC, id DESC LIMIT ?`)
    .bind(limit)
    .all<AdminActionRow>();
  return res.results || [];
}

