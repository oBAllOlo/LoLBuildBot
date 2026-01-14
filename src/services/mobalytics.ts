/**
 * Mobalytics Scraper
 *
 * Extracts build and counter data from Mobalytics using embedded __PRELOADED_STATE__
 *
 * Data structure found:
 * - winRate: calculated from stats.wins / stats.matchCount
 * - perks: { IDs: [8112,...], style: 8100, subStyle: 8200 }
 * - items: [{ type: "Core", items: [3118, 3020, 4645] }, ...]
 * - spells: [4, 12]
 */

import axios from "axios";
import * as cheerio from "cheerio";

// Build Data Interface
export interface MobalyticsBuildData {
  success: boolean;
  championName: string;
  role: string;
  winRate: string;
  matchCount: string;
  items: {
    starter: number[];
    early: number[]; // Added
    core: number[];
    boots: number;
    situational: number[];
  };
  runes: {
    primaryTree: number;
    secondaryTree: number;
    perks: number[];
  };
  spells: number[];
  error?: string;
}

// Counter Data Interface
export interface MobalyticsCounterData {
  success: boolean;
  championName: string;
  bestMatchups: { name: string; winRate: string; games: string }[];
  worstMatchups: { name: string; winRate: string; games: string }[];
  error?: string;
}

/**
 * Extract build data from __PRELOADED_STATE__ JSON
 */
function extractBuildFromState(html: string): MobalyticsBuildData | null {
  try {
    // Find the __PRELOADED_STATE__ script content
    const stateMatch = html.match(
      /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/
    );
    if (!stateMatch) {
      console.log("[Mobalytics] __PRELOADED_STATE__ not found");
      return null;
    }

    const stateStr = stateMatch[1];

    // ------------------------------------------------------------------
    // Strategy: Find all "LolChampionBuild" objects in the text
    // and parse them individually to find the one with the highest match count
    // matching the requested role (if specified) or just highest overall.
    // ------------------------------------------------------------------

    let bestBuild = {
      matchCountNum: -1,
      winRate: "N/A",
      matchCountStr: "N/A",
      spells: [] as number[],
      runes: {
        primaryTree: 0,
        secondaryTree: 0,
        perks: [] as number[],
      },
      items: {
        starter: [] as number[],
        early: [] as number[],
        core: [] as number[],
        boots: 0,
        situational: [] as number[],
      },
      role: "Popular",
    };

    // Find all occurrences of LolChampionBuild properties start
    // We look for __typename or just the start of the object structure common in Mobalytics
    // Pattern: "__typename":"LolChampionBuild"
    const buildIndices = [];
    const buildRegex = /"__typename":"LolChampionBuild"/g;
    let match;
    while ((match = buildRegex.exec(stateStr)) !== null) {
      buildIndices.push(match.index);
    }

    if (buildIndices.length === 0) {
      console.log("[Mobalytics] No LolChampionBuild objects found via regex");
      return null;
    }

    console.log(
      `[Mobalytics] Found ${buildIndices.length} potential builds to analyze`
    );

    for (const index of buildIndices) {
      // Extract a large enough chunk to cover the whole build object
      // 5000 chars should be enough for one build object flattened
      const chunk = stateStr.substring(index, index + 5000);

      // 1. Extract Match Count & Wins
      const statsMatch = chunk.match(/"stats":\s*(\{[^}]+\})/);
      if (!statsMatch) continue;

      const statsJson = statsMatch[1];
      const winsMatch = statsJson.match(/"wins":\s*(\d+)/);
      const matchCountMatch = statsJson.match(/"matchCount":\s*(\d+)/);

      if (!winsMatch || !matchCountMatch) continue;

      const wins = parseInt(winsMatch[1]);
      const matches = parseInt(matchCountMatch[1]);

      if (matches <= 0) continue;

      // 2. Extract Role
      const roleMatch = chunk.match(/"role":"([A-Z]+)"/);
      let buildRole = "Popular";
      let rawRole = "MID"; // default
      if (roleMatch) {
        rawRole = roleMatch[1];
        buildRole =
          rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
      }

      // Check if this build matches our requested role logic (if we could pass it down)
      // Since we don't have the requested role inside this function easily without changing signature,
      // we rely on the fact that the page URL usually filters the builds to the requested role mostly,
      // OR we just pick the absolutely highest match count which IS the most popular build.

      // Improvement: If we want to be strict, we really should prefer the role that appears in the URL.
      // But for now, "Highest Match Count" is the user's explicit request.

      if (matches > bestBuild.matchCountNum) {
        // Found a better build!
        bestBuild.matchCountNum = matches;
        bestBuild.matchCountStr = matches.toLocaleString();
        bestBuild.winRate = ((wins / matches) * 100).toFixed(1) + "%";
        bestBuild.role = buildRole;

        // 3. Extract Spells
        const spellsMatch = chunk.match(/"spells":\[(\d+),(\d+)\]/);
        bestBuild.spells = spellsMatch
          ? [parseInt(spellsMatch[1]), parseInt(spellsMatch[2])]
          : [4, 12]; // Default

        // 4. Extract Perks
        const perksIDsMatch = chunk.match(/"IDs":\[([\d,]+)\]/);
        const styleMatch = chunk.match(/"style":(\d+)/);
        const subStyleMatch = chunk.match(/"subStyle":(\d+)/);

        if (perksIDsMatch) {
          bestBuild.runes.perks = perksIDsMatch[1]
            .split(",")
            .map((n) => parseInt(n.trim()));
        }
        if (styleMatch) bestBuild.runes.primaryTree = parseInt(styleMatch[1]);
        if (subStyleMatch)
          bestBuild.runes.secondaryTree = parseInt(subStyleMatch[1]);

        // 5. Extract Items
        // Reset items
        bestBuild.items.starter = [];
        bestBuild.items.core = [];
        bestBuild.items.situational = [];
        bestBuild.items.boots = 0;

        const starterMatch = chunk.match(
          /"type":"Starter"[^}]*"items":\[([\d,]+)\]/
        );
        const earlyMatch = chunk.match(
          /"type":"Early"[^}]*"items":\[([\d,]+)\]/
        );
        const coreMatch = chunk.match(/"type":"Core"[^}]*"items":\[([\d,]+)\]/);
        const fullBuildMatch = chunk.match(
          /"type":"FullBuild"[^}]*"items":\[([\d,]+)\]/
        );

        if (starterMatch) {
          starterMatch[1]
            .split(",")
            .forEach((n) => bestBuild.items.starter.push(parseInt(n.trim())));
        }

        if (earlyMatch) {
          earlyMatch[1]
            .split(",")
            .forEach((n) => bestBuild.items.early.push(parseInt(n.trim())));
        }

        if (coreMatch) {
          coreMatch[1].split(",").forEach((n) => {
            const id = parseInt(n.trim());
            const bootsIds = [3006, 3009, 3020, 3047, 3111, 3117, 3158]; // Common boots
            if (bootsIds.includes(id)) {
              bestBuild.items.boots = id;
            } else {
              bestBuild.items.core.push(id);
            }
          });
        }

        if (fullBuildMatch) {
          fullBuildMatch[1]
            .split(",")
            .forEach((n) =>
              bestBuild.items.situational.push(parseInt(n.trim()))
            );
        }
      }
    }

    if (bestBuild.matchCountNum === -1) {
      console.log("[Mobalytics] No valid build stats found");
      return null;
    }

    console.log(
      `[Mobalytics] Selected Best Build - Role: ${bestBuild.role}, WinRate: ${bestBuild.winRate}, Matches: ${bestBuild.matchCountStr}`
    );

    return {
      success: true,
      championName: "",
      role: bestBuild.role,
      winRate: bestBuild.winRate,
      matchCount: bestBuild.matchCountStr,
      items: bestBuild.items,
      runes: bestBuild.runes,
      spells: bestBuild.spells,
    };
  } catch (error) {
    console.error("[Mobalytics] Error extracting state:", error);
    return null;
  }
}

/**
 * Fetch champion build data from Mobalytics
 */
export async function fetchMobalyticsBuild(
  champion: string,
  role?: string
): Promise<MobalyticsBuildData> {
  const cleanName = champion.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Map standard roles to Mobalytics URL slugs
  // Mobalytics uses: top, jungle, mid, adc, support
  const ROLE_MAP: Record<string, string> = {
    top: "top",
    jungle: "jungle",
    mid: "mid",
    middle: "mid",
    adc: "adc",
    bottom: "adc",
    bot: "adc",
    support: "support",
    sup: "support",
  };

  let url = `https://mobalytics.gg/lol/champions/${cleanName}/build`;

  if (role) {
    const slug = ROLE_MAP[role.toLowerCase()];
    if (slug) {
      url += `/${slug}`;
    }
  }

  console.log(`[Mobalytics] 🌐 Fetching build from ${url}...`);

  try {
    const { data: html, status } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      validateStatus: (status) => status < 500, // Accept 404, 403, etc.
    });

    // Check if it's a 404 page or "page not found" page
    const $ = cheerio.load(html);
    const pageText = $("body").text().toLowerCase();
    const is404Page = 
      status === 404 ||
      pageText.includes("looks like you are lost") ||
      pageText.includes("page not found") ||
      pageText.includes("404") ||
      $("title").text().toLowerCase().includes("not found") ||
      $("title").text().toLowerCase().includes("404");

    if (is404Page) {
      const roleText = role ? ` สำหรับตำแหน่ง ${role}` : "";
      console.log(`[Mobalytics] ❌ 404 - ไม่พบข้อมูล Build สำหรับ ${champion}${roleText}`);
      return {
        success: false,
        championName: champion,
        role: role || "Unknown",
        winRate: "N/A",
        matchCount: "N/A",
        items: { starter: [], early: [], core: [], boots: 0, situational: [] },
        runes: { primaryTree: 0, secondaryTree: 0, perks: [] },
        spells: [],
        error: `ไม่พบข้อมูล Build สำหรับ "${champion}"${roleText ? ` ในตำแหน่ง ${role}` : ""}`,
      };
    }

    // Try to extract from preloaded state
    const buildData = extractBuildFromState(html);

    if (
      buildData &&
      (buildData.items.core.length > 0 || buildData.runes.perks.length > 0)
    ) {
      buildData.championName = champion;
      console.log(`[Mobalytics] ✅ Build extracted successfully`);
      return buildData;
    }

    // If no build data found, return error instead of fallback
    const roleText = role ? ` สำหรับตำแหน่ง ${role}` : "";
    console.log(`[Mobalytics] ❌ ไม่พบข้อมูล Build ในหน้าเว็บสำหรับ ${champion}${roleText}`);
    return {
      success: false,
      championName: champion,
      role: role || "Unknown",
      winRate: "N/A",
      matchCount: "N/A",
      items: { starter: [], early: [], core: [], boots: 0, situational: [] },
      runes: { primaryTree: 0, secondaryTree: 0, perks: [] },
      spells: [],
      error: `ไม่พบข้อมูล Build สำหรับ "${champion}"${roleText ? ` ในตำแหน่ง ${role}` : ""}`,
    };
  } catch (error: any) {
    // Handle axios errors (network, 403, etc.)
    if (error.response) {
      const status = error.response.status;
      if (status === 404 || status === 403) {
        const roleText = role ? ` สำหรับตำแหน่ง ${role}` : "";
        console.log(`[Mobalytics] ❌ ${status} - ไม่พบข้อมูล Build สำหรับ ${champion}${roleText}`);
        return {
          success: false,
          championName: champion,
          role: role || "Unknown",
          winRate: "N/A",
          matchCount: "N/A",
          items: { starter: [], early: [], core: [], boots: 0, situational: [] },
          runes: { primaryTree: 0, secondaryTree: 0, perks: [] },
          spells: [],
          error: `ไม่พบข้อมูล Build สำหรับ "${champion}"${roleText ? ` ในตำแหน่ง ${role}` : ""}`,
        };
      }
    }
    
    console.error(`[Mobalytics] ❌ Failed to fetch ${champion}:`, error);
    return {
      success: false,
      championName: champion,
      role: role || "Unknown",
      winRate: "N/A",
      matchCount: "N/A",
      items: { starter: [], early: [], core: [], boots: 0, situational: [] },
      runes: { primaryTree: 0, secondaryTree: 0, perks: [] },
      spells: [],
      error: "ไม่สามารถดึงข้อมูลจาก Mobalytics ได้",
    };
  }
}

/**
 * Fetch counter/matchup data from Mobalytics
 */
export async function fetchMobalyticsCounters(
  champion: string
): Promise<MobalyticsCounterData> {
  const cleanName = champion.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Fetch from the dedicated counters page
  const url = `https://mobalytics.gg/lol/champions/${cleanName}/counters`;

  console.log(`[Mobalytics] 🌐 Fetching counters from ${url}...`);

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    const stateMatch = html.match(
      /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/
    );

    if (!stateMatch) {
      throw new Error("__PRELOADED_STATE__ not found");
    }

    const stateStr = stateMatch[1];
    const bestMatchups: MobalyticsCounterData["bestMatchups"] = [];
    const worstMatchups: MobalyticsCounterData["worstMatchups"] = [];

    // Helper to extract specific counter lists from the massive JSON string
    // We parse the JSON to reliably access the structure
    let state;
    try {
      state = JSON.parse(stateStr);
      console.log("[Mobalytics] JSON parsed successfully");
    } catch (e) {
      console.log("[Mobalytics] Warning: JSON parse failed, counters may fail");
    }

    if (
      state &&
      state.lolState &&
      state.lolState.apollo &&
      state.lolState.apollo.dynamic
    ) {
      const dynamic = state.lolState.apollo.dynamic;

      // Step 1: Find the LolChampion key for this champion
      const championKey = Object.keys(dynamic).find(
        (k) =>
          k.startsWith("LolChampion:") && k.includes(`"slug":"${cleanName}"`)
      );

      console.log(`[Mobalytics] Champion key found: ${!!championKey}`);

      if (championKey) {
        const championData = dynamic[championKey];
        const championDataKeys = Object.keys(championData);

        console.log(
          `[Mobalytics] Champion data keys: ${championDataKeys.length}`
        );

        // Step 2: Find countersOptions keys within champion data
        const hardKey = championDataKeys.find(
          (k) => k.includes("countersOptions") && k.includes("DESC")
        );
        const easyKey = championDataKeys.find(
          (k) => k.includes("countersOptions") && k.includes("ASC")
        );

        console.log(
          `[Mobalytics] Counter keys - Hard: ${!!hardKey}, Easy: ${!!easyKey}`
        );

        const processList = (key: string | undefined) => {
          if (!key) return [];

          const data = championData[key];
          const options = data?.options || [];

          if (!Array.isArray(options) || options.length === 0) return [];

          return options.map((option: any) => {
            const name = option.matchupSlug
              ? option.matchupSlug.charAt(0).toUpperCase() +
                option.matchupSlug.slice(1)
              : "Unknown";

            let wins = 0;
            let losses = 0;

            if (option.counterMetrics) {
              wins = option.counterMetrics.wins || 0;
              losses =
                option.counterMetrics.looses ||
                option.counterMetrics.losses ||
                0;
            }

            const total = wins + losses;
            const wr = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

            return {
              name,
              winRate: wr + "%",
              games: total.toString(),
            };
          });
        };

        // Easy Matchups for US -> ASC sort (low enemy WR)
        if (easyKey) {
          bestMatchups.push(...processList(easyKey));
        }

        // Hard Matchups for US -> DESC sort (high enemy WR)
        if (hardKey) {
          worstMatchups.push(...processList(hardKey));
        }
      }
    }

    console.log(
      `[Mobalytics] ✅ Counters fetched - Best: ${bestMatchups.length}, Worst: ${worstMatchups.length}`
    );

    return {
      success: true,
      championName: champion,
      bestMatchups: bestMatchups.slice(0, 10),
      worstMatchups: worstMatchups.slice(0, 10),
    };
  } catch (error) {
    console.error(
      `[Mobalytics] ❌ Failed to fetch counters for ${champion}:`,
      error
    );
    return {
      success: false,
      championName: champion,
      bestMatchups: [],
      worstMatchups: [],
      error: "ไม่สามารถดึงข้อมูล Counter จาก Mobalytics ได้",
    };
  }
}
