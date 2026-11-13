import type { D1Database } from "./types";

export type TipSportCategory =
  | "football"
  | "cricket"
  | "basketball"
  | "tennis"
  | "table_tennis"
  | "esports"
  | "mma"
  | "other";

export interface ResolvedEntityIcon {
  imageUrl: string | null;
  countryCode: string | null;
  source: "static" | "thesportsdb_team" | "thesportsdb_player" | "flag" | "none";
}

interface MemoryCacheEntry {
  value: ResolvedEntityIcon;
  expiresAtMs: number;
}

const THESPORTSDB_BASE = "https://www.thesportsdb.com/api/v1/json/3";
const MEMORY_CACHE = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_CACHE_ENTRIES = 500;
const POSITIVE_TTL_DAYS = 30;
const NEGATIVE_TTL_DAYS = 7;
const DEFAULT_LOOKUP_TIMEOUT_MS = 2200;
const MAX_REMOTE_LOOKUPS_PER_BATCH = 8;

const INDIVIDUAL_SPORTS = new Set<TipSportCategory>(["tennis", "table_tennis", "mma"]);

const FOOTBALL_CRESTS: Record<string, number> = {
  "arsenal": 57,
  "chelsea": 61,
  "liverpool": 64,
  "manchester city": 65,
  "man city": 65,
  "manchester united": 66,
  "man united": 66,
  "man utd": 66,
  "tottenham": 73,
  "tottenham hotspur": 73,
  "spurs": 73,
  "newcastle": 67,
  "newcastle united": 67,
  "aston villa": 58,
  "west ham": 563,
  "west ham united": 563,
  "brighton": 397,
  "brighton and hove albion": 397,
  "everton": 62,
  "fulham": 63,
  "brentford": 402,
  "crystal palace": 354,
  "wolves": 76,
  "wolverhampton wanderers": 76,
  "nottingham forest": 351,
  "bournemouth": 1044,
  "leicester": 338,
  "leicester city": 338,
  "real madrid": 86,
  "barcelona": 81,
  "fc barcelona": 81,
  "atletico madrid": 78,
  "atletico": 78,
  "sevilla": 559,
  "villarreal": 94,
  "real sociedad": 92,
  "real betis": 90,
  "athletic bilbao": 77,
  "athletic club": 77,
  "valencia": 95,
  "girona": 298,
  "bayern munich": 5,
  "bayern": 5,
  "bayern munchen": 5,
  "borussia dortmund": 4,
  "dortmund": 4,
  "rb leipzig": 721,
  "leipzig": 721,
  "bayer leverkusen": 3,
  "leverkusen": 3,
  "eintracht frankfurt": 19,
  "vfb stuttgart": 10,
  "stuttgart": 10,
  "wolfsburg": 11,
  "psg": 524,
  "paris saint germain": 524,
  "marseille": 516,
  "olympique marseille": 516,
  "lyon": 523,
  "olympique lyonnais": 523,
  "monaco": 548,
  "as monaco": 548,
  "lille": 521,
  "juventus": 109,
  "inter": 108,
  "inter milan": 108,
  "internazionale": 108,
  "ac milan": 98,
  "milan": 98,
  "napoli": 113,
  "roma": 100,
  "as roma": 100,
  "lazio": 110,
  "atalanta": 102,
  "fiorentina": 99,
  "bologna": 103,
  "ajax": 678,
  "psv": 674,
  "psv eindhoven": 674,
  "feyenoord": 675,
  "porto": 503,
  "fc porto": 503,
  "benfica": 1903,
  "sl benfica": 1903,
  "sporting": 498,
  "sporting cp": 498,
  "sporting lisbon": 498,
  "celtic": 732,
  "rangers": 735,
  "galatasaray": 645,
  "fenerbahce": 611,
  "besiktas": 600,
  "olympiacos": 654,
  "boca juniors": 1832,
  "river plate": 1831,
  "flamengo": 1783,
  "palmeiras": 1769,
  "al hilal": 7600,
  "al nassr": 7583,
  "inter miami": 16120,
};

const CRICKET_COUNTRY_CODES: Record<string, string> = {
  "india": "in",
  "india women": "in",
  "ind": "in",
  "sri lanka": "lk",
  "sri lanka women": "lk",
  "sl": "lk",
  "australia": "au",
  "australia women": "au",
  "aus": "au",
  "england": "gb-eng",
  "england women": "gb-eng",
  "eng": "gb-eng",
  "pakistan": "pk",
  "pakistan women": "pk",
  "pak": "pk",
  "new zealand": "nz",
  "new zealand women": "nz",
  "nz": "nz",
  "south africa": "za",
  "south africa women": "za",
  "sa": "za",
  "west indies": "jm",
  "west indies women": "jm",
  "wi": "jm",
  "bangladesh": "bd",
  "bangladesh women": "bd",
  "ban": "bd",
  "afghanistan": "af",
  "afg": "af",
  "ireland": "ie",
  "ireland women": "ie",
  "zimbabwe": "zw",
  "zim": "zw",
  "netherlands": "nl",
  "scotland": "gb-sct",
  "uae": "ae",
  "united arab emirates": "ae",
  "nepal": "np",
  "oman": "om",
  "namibia": "na",
  "usa": "us",
  "united states": "us",
  "canada": "ca",
  "hong kong": "hk",
  "malaysia": "my",
  "singapore": "sg",
  "chennai super kings": "in",
  "csk": "in",
  "mumbai indians": "in",
  "mi": "in",
  "royal challengers bangalore": "in",
  "royal challengers bengaluru": "in",
  "rcb": "in",
  "kolkata knight riders": "in",
  "kkr": "in",
  "delhi capitals": "in",
  "dc": "in",
  "rajasthan royals": "in",
  "rr": "in",
  "sunrisers hyderabad": "in",
  "srh": "in",
  "punjab kings": "in",
  "pbks": "in",
  "gujarat titans": "in",
  "gt": "in",
  "lucknow super giants": "in",
  "lsg": "in",
};

const NATIONALITY_TO_ISO: Record<string, string> = {
  "argentina": "ar",
  "australia": "au",
  "austria": "at",
  "belarus": "by",
  "belgium": "be",
  "brazil": "br",
  "bulgaria": "bg",
  "canada": "ca",
  "chile": "cl",
  "china": "cn",
  "chinese taipei": "tw",
  "colombia": "co",
  "croatia": "hr",
  "czech republic": "cz",
  "czechia": "cz",
  "denmark": "dk",
  "egypt": "eg",
  "england": "gb-eng",
  "finland": "fi",
  "france": "fr",
  "georgia": "ge",
  "germany": "de",
  "great britain": "gb",
  "greece": "gr",
  "hong kong": "hk",
  "hungary": "hu",
  "india": "in",
  "indonesia": "id",
  "ireland": "ie",
  "italy": "it",
  "japan": "jp",
  "kazakhstan": "kz",
  "latvia": "lv",
  "mexico": "mx",
  "netherlands": "nl",
  "new zealand": "nz",
  "nigeria": "ng",
  "norway": "no",
  "pakistan": "pk",
  "poland": "pl",
  "portugal": "pt",
  "romania": "ro",
  "russia": "ru",
  "scotland": "gb-sct",
  "serbia": "rs",
  "singapore": "sg",
  "slovakia": "sk",
  "slovenia": "si",
  "south africa": "za",
  "south korea": "kr",
  "korea": "kr",
  "spain": "es",
  "sri lanka": "lk",
  "sweden": "se",
  "switzerland": "ch",
  "taiwan": "tw",
  "thailand": "th",
  "tunisia": "tn",
  "turkey": "tr",
  "ukraine": "ua",
  "united arab emirates": "ae",
  "united kingdom": "gb",
  "uk": "gb",
  "united states": "us",
  "usa": "us",
};

export function normalizeEntityName(raw: string): string {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildEntityCacheKey(name: string, sport: TipSportCategory): string {
  return `${sport}:${normalizeEntityName(name)}`;
}

function toHttpsUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed.replace(/^http:\/\//i, "https://"));
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function nationalityToCountryCode(nationality: unknown): string | null {
  if (typeof nationality !== "string") return null;
  const key = normalizeEntityName(nationality);
  return NATIONALITY_TO_ISO[key] || null;
}

export function lookupStaticEntityIcon(name: string, sport: TipSportCategory): ResolvedEntityIcon | null {
  const key = normalizeEntityName(name);
  if (!key) return null;

  if (sport === "cricket") {
    const cc = CRICKET_COUNTRY_CODES[key] || CRICKET_COUNTRY_CODES[key.split(" ")[0]];
    if (cc) {
      return {
        imageUrl: `https://flagcdn.com/w80/${cc}.png`,
        countryCode: cc,
        source: "static",
      };
    }
  }

  if (sport === "football" || sport === "other") {
    const crestId = FOOTBALL_CRESTS[key] || FOOTBALL_CRESTS[key.split(" ")[0]];
    if (crestId) {
      return {
        imageUrl: `https://crests.football-data.org/${crestId}.png`,
        countryCode: null,
        source: "static",
      };
    }
  }

  // Fallback check on cricket national flags when sport is unspecified
  if (sport === "other" && CRICKET_COUNTRY_CODES[key]) {
    const cc = CRICKET_COUNTRY_CODES[key];
    return {
      imageUrl: `https://flagcdn.com/w80/${cc}.png`,
      countryCode: cc,
      source: "static",
    };
  }

  return null;
}

function sportMatchesTheSportsDb(dbSport: unknown, sport: TipSportCategory): boolean {
  const value = normalizeEntityName(typeof dbSport === "string" ? dbSport : "");
  if (!value) return true;
  if (sport === "football") return value.includes("soccer") || value.includes("football");
  if (sport === "basketball") return value.includes("basketball");
  if (sport === "cricket") return value.includes("cricket");
  if (sport === "tennis") return value === "tennis";
  if (sport === "table_tennis") return value.includes("table tennis") || value.includes("ping pong");
  if (sport === "esports") return value.includes("esport") || value.includes("gaming");
  if (sport === "mma") return value.includes("fighting") || value.includes("mma") || value.includes("ufc") || value.includes("boxing");
  return true;
}

function nameMatchesCandidate(targetNorm: string, candidateRaw: unknown, alternateRaw?: unknown): boolean {
  const cand = normalizeEntityName(typeof candidateRaw === "string" ? candidateRaw : "");
  const alt = normalizeEntityName(typeof alternateRaw === "string" ? alternateRaw : "");
  if (!targetNorm) return false;
  if (cand === targetNorm || alt === targetNorm) return true;
  const targetTokens = targetNorm.split(" ").filter(Boolean);
  const candTokens = cand.split(" ").filter(Boolean);
  if (targetTokens.length >= 2 && candTokens.length >= 2) {
    const lastMatch = targetTokens[targetTokens.length - 1] === candTokens[candTokens.length - 1];
    const firstMatch = targetTokens[0] === candTokens[0];
    if (firstMatch && lastMatch) return true;
  }
  // Allow safe containment for club suffixes like "Arsenal FC" vs "Arsenal"
  if (cand.length >= 4 && targetNorm.length >= 4 && (cand.includes(targetNorm) || targetNorm.includes(cand))) {
    return true;
  }
  return false;
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupTheSportsDbEntityIcon(
  name: string,
  sport: TipSportCategory,
  timeoutMs = DEFAULT_LOOKUP_TIMEOUT_MS
): Promise<ResolvedEntityIcon> {
  const targetNorm = normalizeEntityName(name);
  if (!targetNorm) {
    return { imageUrl: null, countryCode: null, source: "none" };
  }

  if (INDIVIDUAL_SPORTS.has(sport)) {
    const playerData = await fetchJsonWithTimeout(
      `${THESPORTSDB_BASE}/searchplayers.php?p=${encodeURIComponent(name.trim())}`,
      timeoutMs
    );
    const players: any[] = Array.isArray(playerData?.player) ? playerData.player : [];
    const matchingPlayers = players.filter(
      (p) => sportMatchesTheSportsDb(p?.strSport, sport) && nameMatchesCandidate(targetNorm, p?.strPlayer, p?.strAlternate)
    );
    const exactOrFirst = matchingPlayers[0] || players.find((p) => nameMatchesCandidate(targetNorm, p?.strPlayer));
    if (exactOrFirst) {
      const portrait =
        toHttpsUrl(exactOrFirst.strCutout) ||
        toHttpsUrl(exactOrFirst.strThumb) ||
        toHttpsUrl(exactOrFirst.strRender);
      const cc = nationalityToCountryCode(exactOrFirst.strNationality);
      if (portrait) {
        return { imageUrl: portrait, countryCode: cc, source: "thesportsdb_player" };
      }
      if (cc) {
        return {
          imageUrl: `https://flagcdn.com/w80/${cc}.png`,
          countryCode: cc,
          source: "flag",
        };
      }
    }
    return { imageUrl: null, countryCode: null, source: "none" };
  }

  const teamData = await fetchJsonWithTimeout(
    `${THESPORTSDB_BASE}/searchteams.php?t=${encodeURIComponent(name.trim())}`,
    timeoutMs
  );
  const teams: any[] = Array.isArray(teamData?.teams) ? teamData.teams : [];
  const sportFiltered = teams.filter((t) => sportMatchesTheSportsDb(t?.strSport, sport));
  const candidates = sportFiltered.length > 0 ? sportFiltered : teams;

  const exactMatch = candidates.find(
    (t) => normalizeEntityName(t?.strTeam || "") === targetNorm || normalizeEntityName(t?.strAlternate || "") === targetNorm
  );
  const fuzzyMatch = exactMatch || candidates.find((t) => nameMatchesCandidate(targetNorm, t?.strTeam, t?.strAlternate));

  if (fuzzyMatch && sportMatchesTheSportsDb(fuzzyMatch.strSport, sport)) {
    const badge = toHttpsUrl(fuzzyMatch.strBadge) || toHttpsUrl(fuzzyMatch.strLogo);
    const cc = nationalityToCountryCode(fuzzyMatch.strCountry);
    if (badge) {
      return { imageUrl: badge, countryCode: cc, source: "thesportsdb_team" };
    }
    if (cc && sport === "cricket") {
      return { imageUrl: `https://flagcdn.com/w80/${cc}.png`, countryCode: cc, source: "flag" };
    }
  }

  return { imageUrl: null, countryCode: null, source: "none" };
}

function setMemoryCache(cacheKey: string, value: ResolvedEntityIcon, ttlDays: number): void {
  if (MEMORY_CACHE.size >= MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = MEMORY_CACHE.keys().next().value;
    if (oldestKey) MEMORY_CACHE.delete(oldestKey);
  }
  MEMORY_CACHE.set(cacheKey, {
    value,
    expiresAtMs: Date.now() + ttlDays * 86_400_000,
  });
}

export function clearIconMemoryCache(): void {
  MEMORY_CACHE.clear();
}

/**
 * Resolves icons for a batch of (name, sport) pairs using:
 * 1) Static fast-path (football crests + cricket flags)
 * 2) Isolate memory cache
 * 3) D1 persistent cache (`team_icon_cache`)
 * 4) Bounded TheSportsDB v1 lookups written back to D1
 */
export async function resolveTipIconsBatch(
  db: D1Database | undefined,
  entities: Array<{ name: string; sport: TipSportCategory }>,
  options?: { maxRemoteLookups?: number; timeoutMs?: number }
): Promise<Map<string, ResolvedEntityIcon>> {
  const results = new Map<string, ResolvedEntityIcon>();
  const uniqueByKey = new Map<string, { name: string; sport: TipSportCategory }>();

  for (const item of entities) {
    const trimmed = String(item.name || "").trim();
    if (!trimmed) continue;
    const key = buildEntityCacheKey(trimmed, item.sport);
    if (!uniqueByKey.has(key)) {
      uniqueByKey.set(key, { name: trimmed, sport: item.sport });
    }
  }

  const remainingAfterL1 = new Map<string, { name: string; sport: TipSportCategory }>();
  const nowMs = Date.now();

  for (const [key, item] of uniqueByKey) {
    const staticHit = lookupStaticEntityIcon(item.name, item.sport);
    if (staticHit) {
      results.set(key, staticHit);
      continue;
    }

    const mem = MEMORY_CACHE.get(key);
    if (mem && mem.expiresAtMs > nowMs) {
      results.set(key, mem.value);
      continue;
    }

    remainingAfterL1.set(key, item);
  }

  if (remainingAfterL1.size === 0) {
    return results;
  }

  const remainingAfterDb = new Map<string, { name: string; sport: TipSportCategory }>(remainingAfterL1);

  if (db && typeof db.prepare === "function") {
    try {
      const keys = [...remainingAfterL1.keys()];
      const placeholders = keys.map(() => "?").join(", ");
      const cachedRows = (
        await db
          .prepare(
            `SELECT cache_key, image_url, country_code, source
             FROM team_icon_cache
             WHERE cache_key IN (${placeholders})
               AND datetime(expires_at) > datetime('now')`
          )
          .bind(...keys)
          .all<{ cache_key: string; image_url: string | null; country_code: string | null; source: string }>()
      ).results;

      for (const row of cachedRows || []) {
        if (!row?.cache_key) continue;
        const resolved: ResolvedEntityIcon = {
          imageUrl: toHttpsUrl(row.image_url),
          countryCode: row.country_code || null,
          source: (row.source as ResolvedEntityIcon["source"]) || "none",
        };
        results.set(row.cache_key, resolved);
        setMemoryCache(row.cache_key, resolved, resolved.imageUrl ? POSITIVE_TTL_DAYS : NEGATIVE_TTL_DAYS);
        remainingAfterDb.delete(row.cache_key);
      }
    } catch {
      // Gracefully continue if team_icon_cache migration has not been applied yet or mock DB is used
    }
  }

  if (remainingAfterDb.size === 0) {
    return results;
  }

  const maxRemote = Math.max(0, options?.maxRemoteLookups ?? MAX_REMOTE_LOOKUPS_PER_BATCH);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_LOOKUP_TIMEOUT_MS;
  const toFetch = [...remainingAfterDb.entries()].slice(0, maxRemote);

  const fetchedEntries = await Promise.all(
    toFetch.map(async ([key, item]) => {
      const resolved = await lookupTheSportsDbEntityIcon(item.name, item.sport, timeoutMs);
      return { key, item, resolved };
    })
  );

  const dbWrites: ReturnType<D1Database["prepare"]>[] = [];
  for (const { key, item, resolved } of fetchedEntries) {
    results.set(key, resolved);
    const ttlDays = resolved.imageUrl ? POSITIVE_TTL_DAYS : NEGATIVE_TTL_DAYS;
    setMemoryCache(key, resolved, ttlDays);

    if (db && typeof db.prepare === "function") {
      dbWrites.push(
        db
          .prepare(
            `INSERT INTO team_icon_cache (cache_key, entity_name, sport_category, image_url, country_code, source, resolved_at, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', ?))
             ON CONFLICT(cache_key) DO UPDATE SET
               entity_name = excluded.entity_name,
               sport_category = excluded.sport_category,
               image_url = excluded.image_url,
               country_code = excluded.country_code,
               source = excluded.source,
               resolved_at = datetime('now'),
               expires_at = excluded.expires_at`
          )
          .bind(
            key,
            item.name.slice(0, 120),
            item.sport,
            resolved.imageUrl,
            resolved.countryCode,
            resolved.source,
            `+${ttlDays} days`
          )
      );
    }
  }

  if (dbWrites.length > 0 && db) {
    try {
      if (typeof db.batch === "function") {
        await db.batch(dbWrites);
      } else {
        await Promise.all(dbWrites.map((stmt) => stmt.run()));
      }
    } catch {
      // Non-fatal cache write failure
    }
  }

  return results;
}
