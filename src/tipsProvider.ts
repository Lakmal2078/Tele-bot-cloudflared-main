import type { Env } from "./types";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const REQUEST_TIMEOUT_MS = 8_000;

export type TipsProviderGroup = "cricket" | "table_tennis" | "esports" | "mma" | "baseball" | "icehockey" | "rugby";

export interface TipsProviderFeed {
  key: string;
  group: TipsProviderGroup;
  title: string;
  description: string;
  active: boolean;
}

export interface TipsProviderStatus {
  provider: "the-odds-api";
  configured: boolean;
  reachable: boolean;
  checkedAt: string;
  groups: Record<TipsProviderGroup, { discovered: number; feeds: TipsProviderFeed[] }>;
  error?: string;
}

interface OddsSport {
  key: string;
  group?: string;
  title?: string;
  description?: string;
  active?: boolean;
}

function matchesGroup(sport: OddsSport, group: TipsProviderGroup): boolean {
  const haystack = `${sport.key} ${sport.group || ""} ${sport.title || ""} ${sport.description || ""}`.toLowerCase();
  if (group === "cricket") return haystack.includes("cricket");
  if (group === "table_tennis") {
    return haystack.includes("table tennis") || haystack.includes("table_tennis") || haystack.includes("table-tennis");
  }
  if (group === "esports") {
    return haystack.includes("esport") || /(^|[._-])(cs2|csgo|dota2|valorant|lol)([._-]|$)/.test(haystack);
  }
  if (group === "mma") {
    return haystack.includes("mma") || haystack.includes("ufc") || haystack.includes("boxing") || haystack.includes("bellator");
  }
  if (group === "baseball") {
    return haystack.includes("baseball") || haystack.includes("mlb");
  }
  if (group === "icehockey") {
    return haystack.includes("icehockey") || haystack.includes("ice_hockey") || haystack.includes("nhl");
  }
  if (group === "rugby") {
    return haystack.includes("rugby") || haystack.includes("nrl");
  }
  return false;
}

export function classifySpecialSport(sport: OddsSport): TipsProviderGroup | null {
  if (matchesGroup(sport, "cricket")) return "cricket";
  if (matchesGroup(sport, "table_tennis")) return "table_tennis";
  if (matchesGroup(sport, "esports")) return "esports";
  if (matchesGroup(sport, "mma")) return "mma";
  if (matchesGroup(sport, "baseball")) return "baseball";
  if (matchesGroup(sport, "icehockey")) return "icehockey";
  if (matchesGroup(sport, "rugby")) return "rugby";
  return null;
}

async function fetchSports(apiKey: string): Promise<OddsSport[]> {
  const url = new URL(`${ODDS_API_BASE}/sports`);
  url.searchParams.set("apiKey", apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
    }
    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) throw new Error("Unexpected /sports response format");
    return payload as OddsSport[];
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkTipsProvider(env: Env): Promise<TipsProviderStatus> {
  const checkedAt = new Date().toISOString();
  const emptyGroups: Record<TipsProviderGroup, { discovered: number; feeds: TipsProviderFeed[] }> = {
    cricket: { discovered: 0, feeds: [] as TipsProviderFeed[] },
    table_tennis: { discovered: 0, feeds: [] as TipsProviderFeed[] },
    esports: { discovered: 0, feeds: [] as TipsProviderFeed[] },
    mma: { discovered: 0, feeds: [] as TipsProviderFeed[] },
    baseball: { discovered: 0, feeds: [] as TipsProviderFeed[] },
    icehockey: { discovered: 0, feeds: [] as TipsProviderFeed[] },
    rugby: { discovered: 0, feeds: [] as TipsProviderFeed[] },
  };

  if (!env.ODDS_API_KEY) {
    return {
      provider: "the-odds-api",
      configured: false,
      reachable: false,
      checkedAt,
      groups: emptyGroups,
      error: "ODDS_API_KEY is not configured",
    };
  }

  try {
    const sports = await fetchSports(env.ODDS_API_KEY);
    for (const sport of sports) {
      if (!sport.key || sport.active === false) continue;
      const group = classifySpecialSport(sport);
      if (!group) continue;
      const bucket = emptyGroups[group];
      bucket.discovered += 1;
      if (bucket.feeds.length < 5) {
        bucket.feeds.push({
          key: sport.key,
          group,
          title: sport.title || sport.key,
          description: sport.description || "",
          active: true,
        });
      }
    }

    return {
      provider: "the-odds-api",
      configured: true,
      reachable: true,
      checkedAt,
      groups: emptyGroups,
    };
  } catch (error) {
    return {
      provider: "the-odds-api",
      configured: true,
      reachable: false,
      checkedAt,
      groups: emptyGroups,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
