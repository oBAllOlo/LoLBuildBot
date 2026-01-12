/**
 * Build Scraper Service
 *
 * Uses static build database for reliable data
 * Falls back to returning error if champion not found
 */
import {
  ChallengerBuildResult,
  ChallengerBuildResponse,
} from "../types/riot.js";

import { fetchChampionBuild } from "./league-of-graphs.js";
import {
  getAvailableChampions as getStaticChampions,
  hasChampion as hasStaticChampion,
} from "../data/builds.js";

import { getLatestVersion } from "../utils/ddragon.js";

/**
 * Get average build data for a champion
 * @param championName Name of the champion (e.g., "Yasuo")
 * @param role Optional role filter (e.g., "top", "jungle", "middle", "adc", "support")
 */
export async function getAverageBuild(
  championName: string,
  role?: string
): Promise<ChallengerBuildResponse> {
  try {
    // 1. Try Dynamic Scraper (All Champions)
    const version = await getLatestVersion();
    const build = await fetchChampionBuild(championName, version, role);

    if (build) {
      // Create standard result from Dynamic Data
      const result: ChallengerBuildResult = {
        success: true,
        playerName: "LeagueOfGraphs",
        riotId: build.role, // Use role as Riot ID placeholder
        region: "Global",
        championName: championName, // Use input name (or clean it)
        championId: 0,
        items: [...build.items.core, ...build.items.boots].slice(0, 6), // Core + Boots for text display (starter hidden - has wards)
        runes: {
          primaryStyle: build.runes.primary,
          primarySelections: [],
          secondaryStyle: build.runes.secondary,
          secondarySelections: [],
          statPerks: { offense: 0, flex: 0, defense: 0 },
        },
        summonerSpells: {
          spell1: build.spells[0] || 4,
          spell2: build.spells[1] || 7,
        },
        kda: { kills: 0, deaths: 0, assists: 0, ratio: "N/A" },
        win: true,
        gameMode: build.role,
        gameDuration: 0,
        winRate: build.winRate,
        pickRate: build.pickRate,
        source: "LeagueOfGraphs",
        // Pass structure expected by Visualizer
        buildData: {
          championName: championName,
          role: build.role,
          startingItems: build.items.starter,
          boots: build.items.boots[0] || 0,
          coreItems: build.items.core,
          situationalItems: build.items.situational,
          runesPrimary: build.runes.primary,
          runesSecondary: build.runes.secondary,
          perks: build.runes.perks,
          summonerSpell1: build.spells[0] || 4,
          summonerSpell2: build.spells[1] || 7,
          winRate: build.winRate,
          pickRate: build.pickRate,
          source: "LeagueOfGraphs",
        },
        perks: build.runes.perks,
      };
      return result;
    }

    // 2. Fallback to Static DB (if scraper fails or network issue)
    // ... (Keep existing static logic as fallback if desired, or remove?)
    // Removing static fallback to encourage fixing scraper, or keeping it?
    // Let's return error if dynamic failed, claiming "Not Found".

    return {
      success: false,
      error: `ไม่พบข้อมูล Build สำหรับ "${championName}" (หรือระบบดึงข้อมูลมีปัญหา)\nลองตรวจสอบชื่อตัวละครใหม่ครับ`,
    };
  } catch (error) {
    console.error("[Scraper] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Re-export static utils if needed by commands (e.g. autocomplete)
// But autocomplete should ideally use cache or standard list.
// For now, keep static export for compatibility.
export {
  getStaticChampions as getAvailableChampions,
  hasStaticChampion as hasChampion,
};
