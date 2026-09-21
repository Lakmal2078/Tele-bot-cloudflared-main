import type { Env } from "./types";

export type BotConnectionStatus = "connected" | "disconnected" | "not_configured" | "timeout" | "unreachable";

export interface BotStatusResponse {
  ok: boolean;
  status: BotConnectionStatus;
  bot?: {
    id: number;
    username: string;
    firstName: string;
    canJoinGroups?: boolean;
  };
  pingMs?: number;
  message: string;
  checkedAt: string;
}

/**
 * Pings the official Telegram Bot API `getMe` endpoint using the configured BOT_TOKEN.
 * Never leaks the BOT_TOKEN in output or errors.
 */
export async function checkTelegramBotConnection(env: Env, timeoutMs = 5000): Promise<BotStatusResponse> {
  const token = env.BOT_TOKEN?.trim();
  const checkedAt = new Date().toISOString();

  if (!token) {
    return {
      ok: false,
      status: "not_configured",
      message: "BOT_TOKEN is not configured in environment variables",
      checkedAt,
    };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "FastXBetCash-Worker-HealthPing/1.0",
      },
    });
    clearTimeout(timer);
    const pingMs = Math.max(1, Date.now() - startTime);

    const data = (await res.json()) as {
      ok?: boolean;
      result?: {
        id?: number;
        username?: string;
        first_name?: string;
        can_join_groups?: boolean;
      };
      description?: string;
    };

    if (res.ok && data && data.ok && data.result) {
      const b = data.result;
      const username = b.username || (env.BOT_USERNAME ? env.BOT_USERNAME.replace(/^@/, "") : "bot");
      return {
        ok: true,
        status: "connected",
        bot: {
          id: b.id || 0,
          username,
          firstName: b.first_name || "Telegram Bot",
          canJoinGroups: Boolean(b.can_join_groups),
        },
        pingMs,
        message: `Connected to @${username} (${pingMs}ms)`,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      ok: false,
      status: "disconnected",
      pingMs,
      message: data?.description || `Telegram API error (HTTP ${res.status})`,
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    clearTimeout(timer);
    const pingMs = Math.max(1, Date.now() - startTime);

    if (err?.name === "AbortError") {
      return {
        ok: false,
        status: "timeout",
        pingMs,
        message: `Telegram API request timed out after ${timeoutMs}ms`,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      ok: false,
      status: "unreachable",
      pingMs,
      message: "Could not reach Telegram API servers",
      checkedAt: new Date().toISOString(),
    };
  }
}
