/**
 * Data Dragon Utility Functions
 *
 * Data Dragon is Riot's static data CDN for game assets
 * https://developer.riotgames.com/docs/lol#data-dragon
 */

import axios from "axios";

const DDRAGON_BASE_URL = "https://ddragon.leagueoflegends.com";

// Cache for version to avoid repeated API calls
let cachedVersion: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Get the latest game version from Data Dragon
 * @returns Latest version string (e.g., "14.1.1")
 */
export async function getLatestVersion(): Promise<string> {
  // Return cached version if still valid
  if (cachedVersion && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedVersion;
  }

  try {
    const response = await axios.get<string[]>(
      `${DDRAGON_BASE_URL}/api/versions.json`
    );
    cachedVersion = response.data[0]; // First entry is always the latest
    cacheTimestamp = Date.now();
    return cachedVersion;
  } catch (error) {
    console.error("Failed to fetch DDragon version:", error);
    // Fallback to a known version if API fails
    return "14.1.1";
  }
}

/**
 * Get item data (name, description, etc)
 */
let itemCache: Record<string, any> = {};
export async function getItemData(
  version: string
): Promise<Record<string, any>> {
  if (Object.keys(itemCache).length > 0) return itemCache;
  try {
    const { data } = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`
    );
    itemCache = data.data;
    return itemCache;
  } catch (error) {
    console.error("Error fetching item data:", error);
    return {};
  }
}

/**
 * Get rune data
 */
let runeCache: any[] = [];
export async function getRuneData(version: string): Promise<any[]> {
  if (runeCache.length > 0) return runeCache;
  try {
    const { data } = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`
    );
    runeCache = data;
    return runeCache;
  } catch (error) {
    console.error("Error fetching rune data:", error);
    return [];
  }
}

/**
 * Resolve ID to Name
 */
export async function getItemName(
  version: string,
  itemId: number
): Promise<string> {
  const data = await getItemData(version);
  return data[itemId]?.name || `Item ${itemId}`;
}

export async function getRuneName(
  version: string,
  runeId: number
): Promise<string> {
  const data = await getRuneData(version);
  // Search through trees and slots
  for (const tree of data) {
    if (tree.id === runeId) return tree.name;
    for (const slot of tree.slots) {
      for (const rune of slot.runes) {
        if (rune.id === runeId) return rune.name;
      }
    }
  }
  return `Rune ${runeId}`;
}

/**
 * Get Item ID by name (reverse lookup)
 */
export async function getItemIdByName(
  version: string,
  itemName: string
): Promise<number> {
  const data = await getItemData(version);
  const cleanName = itemName.toLowerCase().trim();
  for (const [id, item] of Object.entries(data)) {
    if ((item as any).name.toLowerCase() === cleanName) {
      return parseInt(id);
    }
  }
  // Partial match fallback
  for (const [id, item] of Object.entries(data)) {
    if (
      (item as any).name.toLowerCase().includes(cleanName) ||
      cleanName.includes((item as any).name.toLowerCase())
    ) {
      return parseInt(id);
    }
  }
  return 0;
}

/**
 * Get Rune ID by name (keystone/style name)
 */
export async function getRuneIdByName(
  version: string,
  runeName: string
): Promise<number> {
  const data = await getRuneData(version);
  const cleanName = runeName.toLowerCase().trim();

  for (const tree of data) {
    // Check tree name
    if (tree.name.toLowerCase() === cleanName) {
      return tree.id;
    }
    // Check runes in slots
    for (const slot of tree.slots) {
      for (const rune of slot.runes) {
        if (rune.name.toLowerCase() === cleanName) {
          return rune.id;
        }
      }
    }
  }
  return 0;
}

/**
 * Get the URL for an item's image
 * @param version - Game version (e.g., "14.1.1")
 * @param itemId - Item ID number
 * @returns Full URL to the item image
 */
export function getItemImageUrl(version: string, itemId: number): string {
  if (itemId === 0) return ""; // Empty item slot
  return `${DDRAGON_BASE_URL}/cdn/${version}/img/item/${itemId}.png`;
}
/**
 * Get Summoner Spell Data
 */
let spellCache: Record<string, any> = {};
export async function getSummonerSpellData(
  version: string
): Promise<Record<string, any>> {
  if (Object.keys(spellCache).length > 0) return spellCache;
  try {
    const { data } = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`
    );
    // Data is keyed by Spell Name (e.g. SummonerFlash), but has 'key' property which is the ID
    spellCache = data.data;
    return spellCache;
  } catch (error) {
    console.error("Error fetching spell data:", error);
    return {};
  }
}

export async function getSummonerSpellImageUrl(
  version: string,
  spellId: number
): Promise<string> {
  const data = await getSummonerSpellData(version);
  const spell = Object.values(data).find(
    (s: any) => s.key === spellId.toString()
  );
  if (spell) {
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.image.full}`;
  }
  return "";
}

export async function getRuneImageUrl(
  version: string,
  runeId: number
): Promise<string> {
  const data = await getRuneData(version);
  // Recursive search for rune icon
  const findRune = (list: any[]): string | null => {
    for (const item of list) {
      if (item.id === runeId) return item.icon;
      if (item.slots) {
        // It's a tree
        // Check slots
        for (const slot of item.slots) {
          const result = findRune(slot.runes);
          if (result) return result;
        }
      }
      // Check if it's already a rune in a list (handled by recursion on slots.runes)
    }
    return null; // Not found at this level
  };

  // Helper to flatten search
  let iconPath = "";
  for (const tree of data) {
    if (tree.id === runeId) {
      iconPath = tree.icon;
      break;
    }
    for (const slot of tree.slots) {
      for (const rune of slot.runes) {
        if (rune.id === runeId) {
          iconPath = rune.icon;
          break;
        }
      }
      if (iconPath) break;
    }
    if (iconPath) break;
  }

  if (iconPath) {
    return `https://ddragon.leagueoflegends.com/cdn/img/${iconPath}`;
  }
  return "";
}
/**
 * Get the URL for a champion's square image
 * @param version - Game version (e.g., "14.1.1")
 * @param championName - Champion name (e.g., "Yasuo", "LeeSin")
 * @returns Full URL to the champion image
 */
export function getChampionImageUrl(
  version: string,
  championName: string
): string {
  return `${DDRAGON_BASE_URL}/cdn/${version}/img/champion/${championName}.png`;
}

/**
 * Get the URL for a champion's splash art
 * @param championName - Champion name (e.g., "Yasuo")
 * @param skinId - Skin number (0 = default)
 * @returns Full URL to the splash art
 */
export function getChampionSplashUrl(
  championName: string,
  skinId: number = 0
): string {
  return `${DDRAGON_BASE_URL}/cdn/img/champion/splash/${championName}_${skinId}.jpg`;
}

/**
 * Get champion data (name, id, etc)
 */
let championCache: Record<string, any> = {};
let championNamesCache: string[] = [];
export async function getChampionData(
  version: string
): Promise<Record<string, any>> {
  if (Object.keys(championCache).length > 0) return championCache;
  try {
    const { data } = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
    );
    championCache = data.data;
    // Cache champion names list
    championNamesCache = Object.values(data.data).map(
      (champ: any) => champ.name
    );
    return championCache;
  } catch (error) {
    console.error("Error fetching champion data:", error);
    return {};
  }
}

/**
 * Get all champion names
 * @param version - Game version (optional, will fetch latest if not provided)
 * @returns Array of champion names (e.g., ["Aatrox", "Ahri", "Akali", ...])
 */
export async function getAllChampionNames(version?: string): Promise<string[]> {
  if (championNamesCache.length > 0) {
    console.log(
      `[DDragon] Using cached champion names (${championNamesCache.length} champions)`
    );
    return championNamesCache;
  }

  console.log("[DDragon] Fetching champion names...");
  try {
    const v = version || (await getLatestVersion());
    console.log(`[DDragon] Using version: ${v}`);
    await getChampionData(v);

    if (championNamesCache.length === 0) {
      console.warn(
        "[DDragon] ⚠️  Champion names cache is still empty after fetch!"
      );
      // Try to extract from championCache if available
      if (Object.keys(championCache).length > 0) {
        championNamesCache = Object.values(championCache).map(
          (champ: any) => champ.name
        );
        console.log(
          `[DDragon] Extracted ${championNamesCache.length} names from cache`
        );
      }
    } else {
      console.log(
        `[DDragon] ✅ Cached ${championNamesCache.length} champion names.`
      );
    }

    return championNamesCache;
  } catch (error) {
    console.error("[DDragon] ❌ Error fetching champion names:", error);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Format items array as Discord markdown with images
 * @param version - Game version
 * @param items - Array of item IDs
 * @returns Formatted string with item images (as links)
 */
export function formatItemsForDiscord(
  version: string,
  items: number[]
): string {
  return items
    .filter((id) => id !== 0) // Filter out empty slots
    .map((id) => `[Item](${getItemImageUrl(version, id)})`)
    .join(" ");
}
