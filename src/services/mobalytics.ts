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
function extractBuildFromState(html: string): MobalyticsBuildData[] {
  try {
    const stateMatch = html.match(
      /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
    );
    if (!stateMatch) {
      console.log("[Mobalytics] __PRELOADED_STATE__ not found");
      return [];
    }

    const stateStr = stateMatch[1];

    interface ParsedBuild {
      matchCountNum: number;
      winRate: string;
      matchCountStr: string;
      spells: number[];
      runes: { primaryTree: number; secondaryTree: number; perks: number[] };
      items: {
        starter: number[];
        early: number[];
        core: number[];
        boots: number;
        situational: number[];
      };
      role: string;
    }

    const allBuilds: ParsedBuild[] = [];

    const buildRegex = /"__typename":"LolChampionBuild"/g;
    const buildIndices: number[] = [];
    let match;
    while ((match = buildRegex.exec(stateStr)) !== null) {
      buildIndices.push(match.index);
    }

    if (buildIndices.length === 0) {
      console.log("[Mobalytics] No LolChampionBuild objects found");
      return [];
    }

    console.log(`[Mobalytics] Found ${buildIndices.length} potential builds`);

    for (const index of buildIndices) {
      const chunk = stateStr.substring(index, index + 5000);

      const statsMatch = chunk.match(/"stats":\s*(\{[^}]+\})/);
      if (!statsMatch) continue;

      const statsJson = statsMatch[1];
      const winsMatch = statsJson.match(/"wins":\s*(\d+)/);
      const matchCountMatch = statsJson.match(/"matchCount":\s*(\d+)/);

      if (!winsMatch || !matchCountMatch) continue;

      const wins = parseInt(winsMatch[1]);
      const matches = parseInt(matchCountMatch[1]);

      if (matches <= 0) continue;

      const roleMatch = chunk.match(/"role":"([A-Z]+)"/);
      let buildRole = "Popular";
      if (roleMatch) {
        buildRole =
          roleMatch[1].charAt(0).toUpperCase() +
          roleMatch[1].slice(1).toLowerCase();
      }

      const build: ParsedBuild = {
        matchCountNum: matches,
        matchCountStr: matches.toLocaleString(),
        winRate: ((wins / matches) * 100).toFixed(1) + "%",
        role: buildRole,
        spells: [],
        runes: { primaryTree: 0, secondaryTree: 0, perks: [] },
        items: { starter: [], early: [], core: [], boots: 0, situational: [] },
      };

      const spellsMatch = chunk.match(/"spells":\[(\d+),(\d+)\]/);
      build.spells = spellsMatch
        ? [parseInt(spellsMatch[1]), parseInt(spellsMatch[2])]
        : [4, 12];

      const perksIDsMatch = chunk.match(/"IDs":\[([\d,]+)\]/);
      const styleMatch = chunk.match(/"style":(\d+)/);
      const subStyleMatch = chunk.match(/"subStyle":(\d+)/);

      if (perksIDsMatch) {
        build.runes.perks = perksIDsMatch[1]
          .split(",")
          .map((n) => parseInt(n.trim()));
      }
      if (styleMatch) build.runes.primaryTree = parseInt(styleMatch[1]);
      if (subStyleMatch) build.runes.secondaryTree = parseInt(subStyleMatch[1]);

      const starterMatch = chunk.match(
        /"type":"Starter"[^}]*"items":\[([\d,]+)\]/,
      );
      const earlyMatch = chunk.match(/"type":"Early"[^}]*"items":\[([\d,]+)\]/);
      const coreMatch = chunk.match(/"type":"Core"[^}]*"items":\[([\d,]+)\]/);
      const fullBuildMatch = chunk.match(
        /"type":"FullBuild"[^}]*"items":\[([\d,]+)\]/,
      );

      if (starterMatch) {
        build.items.starter = starterMatch[1]
          .split(",")
          .map((n) => parseInt(n.trim()));
      }
      if (earlyMatch) {
        build.items.early = earlyMatch[1]
          .split(",")
          .map((n) => parseInt(n.trim()));
      }
      if (coreMatch) {
        const bootsIds = [3006, 3009, 3020, 3047, 3111, 3117, 3158];
        coreMatch[1].split(",").forEach((n) => {
          const id = parseInt(n.trim());
          if (bootsIds.includes(id)) {
            build.items.boots = id;
          } else {
            build.items.core.push(id);
          }
        });
      }
      if (fullBuildMatch) {
        build.items.situational = fullBuildMatch[1]
          .split(",")
          .map((n) => parseInt(n.trim()));
      }

      allBuilds.push(build);
    }

    if (allBuilds.length === 0) {
      console.log("[Mobalytics] No valid builds found");
      return [];
    }

    // Sort by match count (popularity) and take top 3
    allBuilds.sort((a, b) => b.matchCountNum - a.matchCountNum);
    const topBuilds = allBuilds.slice(0, 3);

    // Debug: Log each build's item counts
    topBuilds.forEach((b, i) => {
      console.log(
        `[Mobalytics] Build ${i + 1}: WR=${b.winRate}, Matches=${b.matchCountNum}, Starter=${b.items.starter.length}, Core=${b.items.core.length}, Early=${b.items.early.length}, Sit=${b.items.situational.length}`,
      );
    });

    console.log(`[Mobalytics] Returning ${topBuilds.length} builds`);

    return topBuilds.map((b) => ({
      success: true,
      championName: "",
      role: b.role,
      winRate: b.winRate,
      matchCount: b.matchCountStr,
      items: b.items,
      runes: b.runes,
      spells: b.spells,
    }));
  } catch (error) {
    console.error("[Mobalytics] Error extracting state:", error);
    return [];
  }
}

/**
 * Fetch champion build data from Mobalytics
 */
export async function fetchMobalyticsBuild(
  champion: string,
  role?: string,
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

  console.log(`[Mobalytics] 🌐 Fetching build from:`);
  console.log(`[Mobalytics]    ${url}`);

  try {
    const {
      data: html,
      status,
      request,
    } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      validateStatus: (status) => status < 500, // Accept 404, 403, etc.
      maxRedirects: 5, // Allow redirects
    });

    // Log actual status and final URL (after redirects)
    const finalUrl = request?.res?.responseUrl || url;
    console.log(`[Mobalytics] 📊 HTTP Status: ${status}`);
    if (finalUrl !== url) {
      console.log(`[Mobalytics] 🔄 Redirected to: ${finalUrl}`);
    }

    // Check if it's a 404 page or "page not found" page
    const $ = cheerio.load(html);
    const pageText = $("body").text().toLowerCase();
    const titleText = $("title").text().toLowerCase();

    console.log(`[Mobalytics] 📄 Page title: ${$("title").text()}`);
    console.log(
      `[Mobalytics] 📄 Body preview: ${pageText.substring(0, 200)}...`,
    );

    // First, try to extract from preloaded state (even if status is 404, sometimes data exists)
    const builds = extractBuildFromState(html);

    // If we got valid build data, use the first one (most popular) for backward compatibility
    if (builds.length > 0 && builds[0].items.core.length > 0) {
      const buildData = builds[0];
      buildData.championName = champion;
      console.log(
        `[Mobalytics] ✅ Build extracted successfully (status: ${status})`,
      );
      return buildData;
    }

    // If no build data found, check if it's a 404 page
    const is404Page =
      status === 404 ||
      pageText.includes("looks like you are lost") ||
      pageText.includes("page not found") ||
      (pageText.includes("404") && !pageText.includes("4040")) || // Avoid false positives
      titleText.includes("not found") ||
      titleText.includes("404");

    if (is404Page) {
      const roleText = role ? ` สำหรับตำแหน่ง ${role}` : "";
      console.log(
        `[Mobalytics] ❌ 404 - ไม่พบข้อมูล Build สำหรับ ${champion}${roleText}`,
      );
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

    // If we reach here, no build data was found and it's not a clear 404 page
    // This might mean the page loaded but has no build data for this role
    const roleText = role ? ` สำหรับตำแหน่ง ${role}` : "";
    console.log(
      `[Mobalytics] ❌ ไม่พบข้อมูล Build ในหน้าเว็บสำหรับ ${champion}${roleText}`,
    );
    console.log(
      `[Mobalytics]    Status: ${status}, __PRELOADED_STATE__: ${html.includes("__PRELOADED_STATE__") ? "found" : "not found"}, Builds: ${builds.length > 0 ? "extracted but empty" : "not extracted"}`,
    );
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
        console.log(
          `[Mobalytics] ❌ ${status} - ไม่พบข้อมูล Build สำหรับ ${champion}${roleText}`,
        );
        return {
          success: false,
          championName: champion,
          role: role || "Unknown",
          winRate: "N/A",
          matchCount: "N/A",
          items: {
            starter: [],
            early: [],
            core: [],
            boots: 0,
            situational: [],
          },
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
 * Fetch multiple builds (up to 3) from Mobalytics for build selection
 */
export async function fetchMultipleMobalyticsBuilds(
  champion: string,
  role?: string,
): Promise<MobalyticsBuildData[]> {
  const cleanName = champion.toLowerCase().replace(/[^a-z0-9]/g, "");

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
    if (slug) url += `/${slug}`;
  }

  console.log(`[Mobalytics] 🌐 Fetching multiple builds from: ${url}`);

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      validateStatus: (s) => s < 500,
    });

    const builds = extractBuildFromState(html);

    if (builds.length > 0) {
      builds.forEach((b) => (b.championName = champion));
      console.log(
        `[Mobalytics] ✅ Found ${builds.length} builds for ${champion}`,
      );
      return builds;
    }

    console.log(`[Mobalytics] ❌ No builds found for ${champion}`);
    return [];
  } catch (error) {
    console.error(`[Mobalytics] ❌ Error fetching multiple builds:`, error);
    return [];
  }
}

/**
 * Fetch counter/matchup data from Mobalytics
 */
export async function fetchMobalyticsCounters(
  champion: string,
): Promise<MobalyticsCounterData> {
  const cleanName = champion.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Fetch from the dedicated counters page
  const url = `https://mobalytics.gg/lol/champions/${cleanName}/counters`;

  console.log(`[Mobalytics] 🌐 Fetching counters from:`);
  console.log(`[Mobalytics]    ${url}`);

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
      /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/,
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
          k.startsWith("LolChampion:") && k.includes(`"slug":"${cleanName}"`),
      );

      console.log(`[Mobalytics] Champion key found: ${!!championKey}`);

      if (championKey) {
        const championData = dynamic[championKey];
        const championDataKeys = Object.keys(championData);

        console.log(
          `[Mobalytics] Champion data keys: ${championDataKeys.length}`,
        );

        // Step 2: Find countersOptions keys within champion data
        const hardKey = championDataKeys.find(
          (k) => k.includes("countersOptions") && k.includes("DESC"),
        );
        const easyKey = championDataKeys.find(
          (k) => k.includes("countersOptions") && k.includes("ASC"),
        );

        console.log(
          `[Mobalytics] Counter keys - Hard: ${!!hardKey}, Easy: ${!!easyKey}`,
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
      `[Mobalytics] ✅ Counters fetched - Best: ${bestMatchups.length}, Worst: ${worstMatchups.length}`,
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
      error,
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
