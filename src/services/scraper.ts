/**
 * Build Scraper Service
 *
 * Uses Mobalytics for build data - extracts IDs directly from __PRELOADED_STATE__
 */
import {
  ChallengerBuildResult,
  ChallengerBuildResponse,
} from "../types/riot.js";

import { fetchMobalyticsBuild } from "./mobalytics.js";
import {
  getAvailableChampions as getStaticChampions,
  hasChampion as hasStaticChampion,
} from "../data/builds.js";

/**
 * Get average build data for a champion
 * @param championName Name of the champion (e.g., "Yasuo")
 * @param role Optional role filter (currently not used - Mobalytics returns popular role)
 */
export async function getAverageBuild(
  championName: string,
  role?: string
): Promise<ChallengerBuildResponse> {
  try {
    const build = await fetchMobalyticsBuild(championName, role);

    if (
      build.success &&
      (build.items.core.length > 0 || build.runes.perks.length > 0)
    ) {
      // Create standard result from Mobalytics Data
      const result: ChallengerBuildResult = {
        success: true,
        playerName: "Mobalytics",
        riotId: build.role,
        region: "Global",
        championName: championName,
        championId: 0,
        items: build.items.core,
        earlyItems: build.items.early,
        runes: {
          primaryStyle: build.runes.primaryTree,
          primarySelections: build.runes.perks
            .slice(0, 4)
            .map((id) => ({ perk: id } as any)),
          secondaryStyle: build.runes.secondaryTree,
          secondarySelections: build.runes.perks
            .slice(4, 6)
            .map((id) => ({ perk: id } as any)),
          statPerks: {
            offense: build.runes.perks[6] || 0,
            flex: build.runes.perks[7] || 0,
            defense: build.runes.perks[8] || 0,
          },
        },
        summonerSpells: {
          spell1: build.spells[0] || 4,
          spell2: build.spells[1] || 12,
        },
        kda: { kills: 0, deaths: 0, assists: 0, ratio: "N/A" },
        win: true,
        gameMode: build.role,
        gameDuration: 0,
        winRate: build.winRate,
        pickRate: "N/A",
        source: "Mobalytics",
        buildData: {
          championName: championName,
          role: build.role,
          startingItems: build.items.starter,
          boots: build.items.boots,
          coreItems: build.items.core,
          situationalItems: build.items.situational,
          runesPrimary: build.runes.primaryTree,
          runesSecondary: build.runes.secondaryTree,
          perks: build.runes.perks,
          summonerSpell1: build.spells[0] || 4,
          summonerSpell2: build.spells[1] || 12,
          winRate: build.winRate,
          pickRate: "N/A",
          source: "Mobalytics",
        },
        perks: build.runes.perks,
      };
      return result;
    }

    return {
      success: false,
      error: build.error || `ไม่พบข้อมูล Build สำหรับ "${championName}"`,
    };
  } catch (error) {
    console.error("[Scraper] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Re-export static utils
export {
  getStaticChampions as getAvailableChampions,
  hasStaticChampion as hasChampion,
};
