import type { Env } from "./types";
import { generateQrSvg } from "./qrSvg";

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
