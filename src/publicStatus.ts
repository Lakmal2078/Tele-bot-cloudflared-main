import type { Env } from "./types";

export type PublicServiceStatus = "available" | "degraded";
export type TelegramConfigurationStatus = "ready" | "not_configured";

export interface PublicStatusPayload {
  status: "online";
  service: "telegram-bot";
  runtime: "cf-worker" | "node";
  availability: PublicServiceStatus;
  telegramConfiguration: TelegramConfigurationStatus;
  checkedAt: string;
}

/**
 * Build a public, non-secret status payload.
 *
 * Important: this endpoint reports worker reachability and configuration state.
 * It intentionally does not claim that Telegram itself is reachable or that
 * the bot token is valid, because proving that would require an external API call.
 */
export function getPublicStatus(env: Env, runtime: "cf-worker" | "node"): PublicStatusPayload {
  const hasBotToken = Boolean(env.BOT_TOKEN?.trim());
  const hasWebhookSecret = Boolean(env.WEBHOOK_SECRET?.trim());
  const configured = hasBotToken && hasWebhookSecret;

  return {
    status: "online",
    service: "telegram-bot",
    runtime,
    availability: configured ? "available" : "degraded",
    telegramConfiguration: configured ? "ready" : "not_configured",
    checkedAt: new Date().toISOString(),
  };
}
