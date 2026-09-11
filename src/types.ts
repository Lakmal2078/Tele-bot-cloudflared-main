export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: any }>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta?: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): any;
  batch?(statements: D1PreparedStatement[]): Promise<any[]>;
}

export interface R2ObjectSummary {
  key: string;
  size: number;
  uploaded?: Date;
}

/** Minimal shape of a native Cloudflare R2 bucket binding. */
export interface R2BucketBinding {
  put(key: string, value: any, options?: any): Promise<any>;
  get(key: string): Promise<any>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    objects: Array<{ key: string; size?: number; uploaded?: string | Date }>;
    truncated?: boolean;
    cursor?: string;
  }>;
}

export interface Env {
  DB: D1Database;
  /** Native Cloudflare R2 bucket binding (preferred on Workers). */
  CHAT_MEDIA?: R2BucketBinding;
  /** Optional bucket name label when only the binding is available. */
  R2_BUCKET_NAME_BINDING?: string;
  BOT_TOKEN: string;
  ADMIN_IDS: string;          // comma-separated
  ADMIN_CHANNEL_ID?: string;  // Admin / Audit log channel (e.g. -100xxx or @channel)
  WEBHOOK_SECRET: string;
  CHANNEL_USERNAME: string;
  CHANNEL_URL: string;
  /** Dedicated channel for automated free tips. Use @username or numeric -100... chat id. */
  TIPS_CHANNEL_ID?: string;
  /** Public channel URL shown on tip posts and join buttons. */
  TIPS_CHANNEL_URL?: string;
  /** The Odds API secret; set with `wrangler secret put ODDS_API_KEY`. */
  ODDS_API_KEY?: string;
  /** Comma-separated The Odds API sport keys, tried in order until a suitable event is found. */
  TIPS_SPORTS?: string;
  /** Comma-separated bookmaker regions, e.g. uk,eu. */
  TIPS_ODDS_REGIONS?: string;
  TIPS_MIN_ODDS?: string;
  TIPS_MAX_ODDS?: string;
  TIPS_HOURS_AHEAD?: string;
  XBET_LINK: string;
  XBET_PROMO_CODE: string;
  MIN_TRANSACTION_LKR: string;
  MAX_TRANSACTION_LKR: string;
  DEPOSIT_INSTRUCTIONS: string;
  WHATSAPP_NUMBER?: string;
  // Cloudflare R2
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_DOMAIN?: string;
  // Custom Payment Gateways
  BANK_DETAILS?: string;
  EZCASH_NUMBER?: string;
  MCASH_NUMBER?: string;
  FRIMI_NUMBER?: string;
}

export interface UserRow {
  user_id: number;
  username: string | null;
  first_name: string | null;
  referred_by: number | null;
  language: "si" | "en" | "ta";
  created_at: string;
}

export interface DepositRow {
  id: number;
  user_id: number;
  username: string | null;
  player_id: string;
  amount: number;  // LKR (major units) after conversion from cents
  payment_method: string;
  photo_file_id: string | null;
  r2_url: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  deleted_at?: string | null;
}

export interface WithdrawalRow {
  id: number;
  user_id: number;
  username: string | null;
  player_id: string;
  amount: number;  // LKR (major units) after conversion from cents
  payment_method: string;
  destination_account: string | null;
  security_code: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  deleted_at?: string | null;
}

export interface SystemStats {
  totalUsers: number;
  todayUsers: number;
  pendingDeposits: number;
  approvedDepositsCount: number;
  approvedDepositsVolume: number;
  rejectedDepositsCount: number;
  pendingWithdrawals: number;
  approvedWithdrawalsCount: number;
  approvedWithdrawalsVolume: number;
  rejectedWithdrawalsCount: number;
  todayDepositsVolume: number;
  todayWithdrawalsVolume: number;
}

/** Permanent audit-trail record of an admin approve/reject decision (see admin_actions table). */
export interface AdminActionRow {
  id: number;
  admin_id: number;
  admin_username: string | null;
  action: string; // e.g. 'DEPOSIT_APPROVED', 'WITHDRAWAL_REJECTED'
  target_type: "DEPOSIT" | "WITHDRAWAL";
  target_id: number;
  target_user_id: number | null;
  amount: number | null; // LKR major units after conversion from cents
  details: string | null; // JSON string
  created_at: string;
}

export interface ReferralItem {
  referred_id: number;
  username: string | null;
  first_name: string | null;
  created_at: string;
  deposit_count: number;
  total_deposited: number;
}
