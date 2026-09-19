import type { Env } from "./types";
import { BRAND_LOGO_SVG_COMPACT } from "./brandLogo";

const BOT_FALLBACK = "fast_1xbetcash_bot";
const CHANNEL_FALLBACK = "https://t.me/fast_xbet_official_tips";

type Lang = "si" | "en" | "ta";

export function normalizePublicBaseUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function trustedPublicBaseUrl(env: Env, request: Request): string | null {
  const configured = normalizePublicBaseUrl(env.PUBLIC_BASE_URL);
  if (configured) return configured;
  if (env.BOT_MODE === "production") return null;
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

// TEMP: full file continues in next push - this restores exports
export function renderLandingPage(env: Env, request: Request, nonce?: string): string {
  return "<!doctype html><html><body>Loading full landing page...</body></html>";
}
