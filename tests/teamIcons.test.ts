import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearIconMemoryCache,
  lookupStaticEntityIcon,
  lookupTheSportsDbEntityIcon,
  resolveTipIconsBatch,
} from "../src/teamIcons";
import { classifySport, getPublicTips } from "../src/publicTips";
import { renderLandingPage } from "../src/landingPage";
import type { D1Database, Env } from "../src/types";

describe("Team & Player Icon Resolution", () => {
  beforeEach(() => {
    clearIconMemoryCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies table_tennis separately from tennis and handles multi-sport titles", () => {
    expect(classifySport("table_tennis", "ITTF Setka Cup")).toBe("table_tennis");
    expect(classifySport("tennis_atp_finals", "ATP Finals")).toBe("tennis");
    expect(classifySport("basketball_nba", "NBA")).toBe("basketball");
    expect(classifySport("esports_cs2", "CS2 Major")).toBe("esports");
    expect(classifySport("cricket_international_t20", "T20 International")).toBe("cricket");
    expect(classifySport("soccer_epl", "Premier League")).toBe("football");
  });

  it("resolves popular football crests and cricket country flags from the static fast-path", () => {
    const arsenal = lookupStaticEntityIcon("Arsenal", "football");
    expect(arsenal?.imageUrl).toBe("https://crests.football-data.org/57.png");
    expect(arsenal?.source).toBe("static");

    const sriLanka = lookupStaticEntityIcon("Sri Lanka", "cricket");
    expect(sriLanka?.imageUrl).toBe("https://flagcdn.com/w80/lk.png");
    expect(sriLanka?.countryCode).toBe("lk");
  });

  it("resolves Tennis player portraits and country-flag fallbacks from TheSportsDB v1", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("searchplayers.php?p=Alexander%20Zverev")) {
        return new Response(
          JSON.stringify({
            player: [
              {
                strPlayer: "Alexander Zverev",
                strSport: "Tennis",
                strNationality: "Germany",
                strCutout: "https://www.thesportsdb.com/images/media/player/cutout/zverev.png",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("searchplayers.php?p=Rafael%20Jodar")) {
        return new Response(
          JSON.stringify({
            player: [
              {
                strPlayer: "Rafael Jodar",
                strSport: "Tennis",
                strNationality: "Spain",
                strCutout: null,
                strThumb: null,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ player: null }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const zverev = await lookupTheSportsDbEntityIcon("Alexander Zverev", "tennis");
    expect(zverev.imageUrl).toBe("https://www.thesportsdb.com/images/media/player/cutout/zverev.png");
    expect(zverev.countryCode).toBe("de");
    expect(zverev.source).toBe("thesportsdb_player");

    const jodar = await lookupTheSportsDbEntityIcon("Rafael Jodar", "tennis");
    expect(jodar.imageUrl).toBe("https://flagcdn.com/w80/es.png");
    expect(jodar.countryCode).toBe("es");
    expect(jodar.source).toBe("flag");
  });

  it("resolves NBA and non-static club badges from TheSportsDB v1 and caches hits in D1", async () => {
    const cacheStore = new Map<string, any>();
    const db = {
      prepare(sql: string) {
        let bound: any[] = [];
        return {
          bind(...args: any[]) {
            bound = args;
            return this;
          },
          all: async () => {
            if (sql.includes("FROM team_icon_cache")) {
              return {
                results: bound
                  .map((k) => cacheStore.get(String(k)))
                  .filter(Boolean),
              };
            }
            return { results: [] };
          },
          run: async () => {
            if (sql.includes("INSERT INTO team_icon_cache")) {
              cacheStore.set(String(bound[0]), {
                cache_key: bound[0],
                entity_name: bound[1],
                sport_category: bound[2],
                image_url: bound[3],
                country_code: bound[4],
                source: bound[5],
              });
            }
            return { success: true };
          },
        };
      },
      batch: async (stmts: any[]) => {
        for (const s of stmts) await s.run();
        return stmts.map(() => ({ success: true }));
      },
    } as unknown as D1Database;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          teams: [
            {
              strTeam: "Los Angeles Lakers",
              strSport: "Basketball",
              strCountry: "United States",
              strBadge: "https://www.thesportsdb.com/images/media/team/badge/lakers.png",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await resolveTipIconsBatch(db, [{ name: "Los Angeles Lakers", sport: "basketball" }]);
    expect(first.get("basketball:los angeles lakers")?.imageUrl).toBe(
      "https://www.thesportsdb.com/images/media/team/badge/lakers.png"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cacheStore.has("basketball:los angeles lakers")).toBe(true);

    // Clear L1 memory cache so next lookup must hit D1 cache instead of fetching remotely again
    clearIconMemoryCache();
    const second = await resolveTipIconsBatch(db, [{ name: "Los Angeles Lakers", sport: "basketball" }]);
    expect(second.get("basketball:los angeles lakers")?.imageUrl).toBe(
      "https://www.thesportsdb.com/images/media/team/badge/lakers.png"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("enriches /api/tips/preview tips with homeLogoUrl and awayLogoUrl", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          player: [
            {
              strPlayer: "Ben Shelton",
              strSport: "Tennis",
              strNationality: "United States",
              strCutout: "https://www.thesportsdb.com/images/media/player/cutout/shelton.png",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const db = {
      prepare(sql: string) {
        return {
          bind() {
            return this;
          },
          first: async () => null,
          all: async () => {
            if (sql.includes("FROM tip_posts")) {
              return {
                results: [
                  {
                    id: 99,
                    event_id: "ev-tennis-1",
                    sport_key: "tennis_atp_finals",
                    sport_title: "ATP Finals",
                    home_team: "Ben Shelton",
                    away_team: "Arthur Fils",
                    commence_time: "2026-11-15T19:30:00Z",
                    market: "h2h",
                    selection: "Ben Shelton",
                    odds: 1.67,
                    tips_json: null,
                    result: "PENDING",
                  },
                ],
              };
            }
            return { results: [] };
          },
          run: async () => ({ success: true }),
        };
      },
      batch: async () => [],
    } as unknown as D1Database;

    const res = await getPublicTips({ DB: db } as Env, 6);
    expect(res.tips).toHaveLength(1);
    expect(res.tips[0].sport).toBe("tennis");
    expect(res.tips[0].homeLogoUrl).toBe("https://www.thesportsdb.com/images/media/player/cutout/shelton.png");
    expect(res.tips[0].homeCountryCode).toBe("us");
    expect(res.tips[0].awayLogoUrl).toBeNull();
  });

  it("renders landing page with CSP-safe icon fallbacks and dynamic sport tab support", () => {
    const html = renderLandingPage(
      {
        PUBLIC_BASE_URL: "https://fast-xbet.lk",
        BOT_USERNAME: "fast_1xbetcash_bot",
        CHANNEL_URL: "https://t.me/fast_xbet_official_tips",
        CHANNEL_USERNAME: "@fast_xbet_official_tips",
      } as Env,
      new Request("https://fast-xbet.lk/"),
      "nonce-123"
    );

    expect(html).not.toContain('onerror="');
    expect(html).toContain('referrerpolicy="no-referrer"');
    expect(html).toContain("sportSvgGlyph");
    expect(html).toContain("table_tennis");
    expect(html).toContain("t.homeLogoUrl");
  });
});
