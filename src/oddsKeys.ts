import type { Env } from "./types";

export interface OddsQuotaInfo {
  keyIndex: number;
  totalKeys: number;
  remaining: number | null;
  used: number | null;
}

export interface OddsApiFetchResult<T> {
  data: T;
  keyIndex: number;
  totalKeys: number;
  remaining: number | null;
  used: number | null;
}

const keyCooldownUntilMs = new Map<string, number>();

export function resetOddsKeyPool(): void {
  keyCooldownUntilMs.clear();
}

export function resolveOddsApiKeys(env: Partial<Env> | string | undefined): string[] {
  if (typeof env === "string") {
    return env
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!env) return [];
  const rawSources = [env.ODDS_API_KEY, env.ODDS_API_KEY_2, env.ODDS_API_KEYS];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const source of rawSources) {
    if (typeof source !== "string" || !source.trim()) continue;
    for (const part of source.split(/[\s,;]+/)) {
      const trimmed = part.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        keys.push(trimmed);
      }
    }
  }
  return keys;
}

export function hasOddsApiKeys(env: Partial<Env> | undefined): boolean {
  return resolveOddsApiKeys(env).length > 0;
}

function nextUtcMonthStartMs(nowMs = Date.now()): number {
  const now = new Date(nowMs);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 5, 0, 0);
}

function defaultRetryDelayMs(attempt: number, retryAfter: string | null): number {
  const retrySeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(retrySeconds) && retrySeconds >= 0) {
    return Math.min(retrySeconds * 1000, 5000);
  }
  return Math.min(500 * 2 ** attempt, 4000);
}

function parseHeaderNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyKeyCooldown(status: number, bodyText: string, nowMs: number): number | null {
  const normalized = bodyText.toLowerCase();
  if (status === 401 || status === 402 || status === 403) {
    return nextUtcMonthStartMs(nowMs);
  }
  if (status === 429) {
    if (/(quota|credit|usage|out_of_usage)/.test(normalized)) {
      return nextUtcMonthStartMs(nowMs);
    }
    return nowMs + 10 * 60 * 1000;
  }
  return null;
}

export async function fetchOddsApiJson<T>(
  env: Partial<Env> | string,
  buildUrl: (apiKey: string) => URL,
  options?: {
    timeoutMs?: number;
    retries?: number;
    retryDelayFn?: (attempt: number, retryAfter: string | null) => number;
    onQuotaHeaders?: (info: OddsQuotaInfo) => void;
  }
): Promise<OddsApiFetchResult<T>> {
  const keys = resolveOddsApiKeys(env);
  if (keys.length === 0) {
    throw new Error("ODDS_API_KEY is not configured");
  }

  const nowMs = Date.now();
  const timeoutMs = options?.timeoutMs ?? 8000;
  const retries = Math.max(0, options?.retries ?? 2);
  const retryDelay = options?.retryDelayFn ?? defaultRetryDelayMs;

  const activeEntries: Array<{ key: string; keyIndex: number }> = [];
  const cooledEntries: Array<{ key: string; keyIndex: number }> = [];
  keys.forEach((key, idx) => {
    const until = keyCooldownUntilMs.get(key);
    if (until && until > nowMs) {
      cooledEntries.push({ key, keyIndex: idx });
    } else {
      if (until) keyCooldownUntilMs.delete(key);
      activeEntries.push({ key, keyIndex: idx });
    }
  });

  // Prefer un-exhausted keys; if all keys are currently cooled down, still probe
  // once in case a monthly reset or key top-up occurred without an isolate restart.
  const orderedEntries = activeEntries.length > 0 ? activeEntries : cooledEntries;
  const errors: string[] = [];

  for (const { key, keyIndex } of orderedEntries) {
    const url = buildUrl(key);
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        const remaining = parseHeaderNumber(response.headers.get("x-requests-remaining"));
        const used = parseHeaderNumber(response.headers.get("x-requests-used"));
        options?.onQuotaHeaders?.({
          keyIndex,
          totalKeys: keys.length,
          remaining,
          used,
        });

        const text = await response.text();
        if (response.ok) {
          if (remaining !== null && remaining <= 0) {
            keyCooldownUntilMs.set(key, nextUtcMonthStartMs());
            console.warn(
              `[OddsKeyPool] Key #${keyIndex + 1}/${keys.length} reached 0 remaining credits; subsequent requests will fail over.`
            );
          } else {
            keyCooldownUntilMs.delete(key);
          }
          const data = JSON.parse(text) as T;
          return {
            data,
            keyIndex,
            totalKeys: keys.length,
            remaining,
            used,
          };
        }

        const cooldownUntil = classifyKeyCooldown(response.status, text, Date.now());
        if (cooldownUntil !== null) {
          keyCooldownUntilMs.set(key, cooldownUntil);
          const snippet = text.slice(0, 180);
          errors.push(`Key #${keyIndex + 1}: Odds API ${response.status}: ${snippet}`);
          console.warn(
            `[OddsKeyPool] Key #${keyIndex + 1}/${keys.length} failed with HTTP ${response.status}; ${
              orderedEntries.length > 1 ? "failing over to next key." : "no backup key configured."
            }`
          );
          break; // Immediately fail over to the next key without burning retries on an exhausted/unauthorized key.
        }

        const retryable = response.status >= 500;
        if (!retryable || attempt === retries) {
          errors.push(`Key #${keyIndex + 1}: Odds API ${response.status}: ${text.slice(0, 200)}`);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, response.headers.get("Retry-After"))));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt === retries) {
          errors.push(`Key #${keyIndex + 1}: ${message}`);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, null)));
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  throw new Error(
    errors.length === 1 && keys.length === 1
      ? errors[0].replace(/^Key #1:\s*/, "")
      : `All ${keys.length} Odds API key(s) failed (${errors.join("; ")})`
  );
}
