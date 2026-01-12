/**
 * Static Build Database
 *
 * Contains popular item builds for champions based on Patch 16.1 meta
 * This can be updated manually or via a separate data collection script
 */

export interface ChampionBuild {
  championName: string;
  role: string;
  coreItems: number[];
  startingItems: number[];
  boots: number;
  situationalItems: number[];
  runesPrimary: number; // Style ID
  runesSecondary: number; // Style ID
  perks: number[]; // Full list of selected rune IDs
  summonerSpell1: number;
  summonerSpell2: number;
  winRate: string;
  pickRate: string;
  source: string;
}

// Item IDs reference: https://developer.riotgames.com/docs/lol#data-dragon_items
// Summoner Spell IDs: Flash=4, Ignite=14, TP=12, Heal=7, Ghost=6, Exhaust=3, Smite=11, Barrier=21

const builds: Record<string, ChampionBuild> = {
  // ADC
  jinx: {
    championName: "Jinx",
    role: "ADC",
    coreItems: [6672, 3031, 3094], // Kraken Slayer, IE, Rapid Firecannon
    startingItems: [1055, 2003], // Doran's Blade, Health Pot
    boots: 3006, // Berserker's Greaves
    situationalItems: [3072, 3036, 3033], // BT, LDR, Mortal Reminder
    runesPrimary: 8000, // Precision
    runesSecondary: 8200, // Sorcery
    perks: [8008, 9111, 9104, 8014, 8210, 8237], // Lethal Tempo, Triumph, Alacrity, Coup de Grace, Transc, Gathering Storm
    summonerSpell1: 4,
    summonerSpell2: 7,
    winRate: "51.2%",
    pickRate: "15.3%",
    source: "Patch 16.1 Meta",
  },
  kaisa: {
    championName: "Kai'Sa",
    role: "ADC",
    coreItems: [6672, 3124, 3115], // Kraken, Guinsoo's, Nashor's
    startingItems: [1055, 2003],
    boots: 3006,
    situationalItems: [3157, 3089, 3135],
    runesPrimary: 8000, // Precision
    runesSecondary: 8300, // Inspiration
    perks: [8008, 9111, 9104, 8014, 8304, 8345],
    summonerSpell1: 4,
    summonerSpell2: 7,
    winRate: "50.8%",
    pickRate: "18.2%",
    source: "Patch 16.1 Meta",
  },
  // Mid Lane
  yasuo: {
    championName: "Yasuo",
    role: "Mid",
    coreItems: [6672, 3031, 3153], // Kraken, IE, BORK
    startingItems: [1055, 2003],
    boots: 3006,
    situationalItems: [3026, 3156, 6333], // GA, Maw, Death's Dance
    runesPrimary: 8000, // Precision
    runesSecondary: 8400, // Resolve
    perks: [8008, 9111, 9104, 8014, 8473, 8429],
    summonerSpell1: 4,
    summonerSpell2: 14,
    winRate: "49.8%",
    pickRate: "12.5%",
    source: "Patch 16.1 Meta",
  },
  lux: {
    championName: "Lux",
    role: "Mid",
    coreItems: [6655, 3089, 4645], // Luden's, Rabadon's, Shadowflame
    startingItems: [1056, 2003], // Doran's Ring
    boots: 3020, // Sorc Shoes
    situationalItems: [3135, 3165, 3157], // Void Staff, Morello, Zhonya's
    runesPrimary: 8200, // Sorcery
    runesSecondary: 8300,
    perks: [8229, 8226, 8210, 8237, 8304, 8345],
    summonerSpell1: 4,
    summonerSpell2: 14,
    winRate: "51.5%",
    pickRate: "8.2%",
    source: "Patch 16.1 Meta",
  },
  ahri: {
    championName: "Ahri",
    role: "Mid",
    coreItems: [6655, 3089, 4645], // Luden's, Rabadon's, Shadowflame
    startingItems: [1056, 2003],
    boots: 3020,
    situationalItems: [3135, 3157, 3102],
    runesPrimary: 8100, // Domination
    runesSecondary: 8300,
    perks: [8112, 8143, 8138, 8106, 8304, 8345],
    summonerSpell1: 4,
    summonerSpell2: 14,
    winRate: "52.1%",
    pickRate: "10.5%",
    source: "Patch 16.1 Meta",
  },
  // Top Lane
  teemo: {
    championName: "Teemo",
    role: "Top",
    coreItems: [6653, 3115, 3089], // Liandry's, Nashor's, Rabadon's
    startingItems: [1056, 2003],
    boots: 3020,
    situationalItems: [3135, 3157, 3165],
    runesPrimary: 8200, // Sorcery
    runesSecondary: 8400,
    perks: [8214, 8226, 8210, 8237, 8473, 8429], // Aery
    summonerSpell1: 4,
    summonerSpell2: 14,
    winRate: "50.6%",
    pickRate: "4.8%",
    source: "Patch 16.1 Meta",
  },
  garen: {
    championName: "Garen",
    role: "Top",
    coreItems: [6631, 3053, 3742], // Stridebreaker, Sterak's, Dead Man's
    startingItems: [1054, 2003], // Doran's Shield
    boots: 3047, // Plated Steelcaps
    situationalItems: [3071, 3065, 6333],
    runesPrimary: 8000, // Precision
    runesSecondary: 8400,
    perks: [8010, 9111, 9104, 8299, 8473, 8429],
    summonerSpell1: 4,
    summonerSpell2: 14,
    winRate: "52.3%",
    pickRate: "7.1%",
    source: "Patch 16.1 Meta",
  },
  darius: {
    championName: "Darius",
    role: "Top",
    coreItems: [6631, 3053, 3742],
    startingItems: [1054, 2003],
    boots: 3047,
    situationalItems: [3071, 6333, 3026],
    runesPrimary: 8000, // Precision
    runesSecondary: 8400,
    perks: [8010, 9111, 9104, 8299, 8473, 8429],
    summonerSpell1: 4,
    summonerSpell2: 6, // Ghost
    winRate: "51.0%",
    pickRate: "8.5%",
    source: "Patch 16.1 Meta",
  },
  // Jungle
  leesin: {
    championName: "Lee Sin",
    role: "Jungle",
    coreItems: [6693, 3071, 3053], // Prowler's, Black Cleaver, Sterak's
    startingItems: [1039, 2003], // Jungle item
    boots: 3158, // Lucidity
    situationalItems: [3026, 3156, 6333],
    runesPrimary: 8000, // Precision
    runesSecondary: 8200,
    perks: [8010, 9111, 9104, 8299, 8210, 8237],
    summonerSpell1: 4,
    summonerSpell2: 11, // Smite
    winRate: "48.5%",
    pickRate: "12.0%",
    source: "Patch 16.1 Meta",
  },
  masteryi: {
    championName: "Master Yi",
    role: "Jungle",
    coreItems: [6672, 3124, 3153], // Kraken, Guinsoo's, BORK
    startingItems: [1039, 2003],
    boots: 3006,
    situationalItems: [3026, 6333, 3156],
    runesPrimary: 8000, // Precision
    runesSecondary: 8100,
    perks: [8008, 9111, 9104, 8014, 8143, 8106],
    summonerSpell1: 4,
    summonerSpell2: 11,
    winRate: "51.8%",
    pickRate: "6.2%",
    source: "Patch 16.1 Meta",
  },
  // Support
  lulu: {
    championName: "Lulu",
    role: "Support",
    coreItems: [3504, 3107, 3011], // Ardent, Redemption, Chemtech
    startingItems: [3850, 2003], // Spellthief's
    boots: 3158,
    situationalItems: [3222, 3190, 4005],
    runesPrimary: 8200, // Sorcery
    runesSecondary: 8200,
    perks: [8214, 8226, 8210, 8237, 8210, 8237],
    summonerSpell1: 4,
    summonerSpell2: 3, // Exhaust
    winRate: "52.0%",
    pickRate: "9.5%",
    source: "Patch 16.1 Meta",
  },
  thresh: {
    championName: "Thresh",
    role: "Support",
    coreItems: [3190, 3107, 3050], // Locket, Redemption, Zeke's
    startingItems: [3854, 2003], // Relic Shield
    boots: 3047,
    situationalItems: [3109, 3222, 4401],
    runesPrimary: 8400, // Resolve
    runesSecondary: 8300,
    perks: [8439, 8473, 8429, 8451, 8304, 8345],
    summonerSpell1: 4,
    summonerSpell2: 14,
    winRate: "49.5%",
    pickRate: "11.2%",
    source: "Patch 16.1 Meta",
  },
};

/**
 * Normalize champion name for lookup
 */
function normalizeChampionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['\s]/g, "")
    .replace(/&/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Get build for a champion
 */
export function getBuild(championName: string): ChampionBuild | null {
  const normalized = normalizeChampionName(championName);
  return builds[normalized] || null;
}

/**
 * Get all available champions
 */
export function getAvailableChampions(): string[] {
  return Object.values(builds).map((b) => b.championName);
}

/**
 * Check if champion exists in database
 */
export function hasChampion(championName: string): boolean {
  const normalized = normalizeChampionName(championName);
  return normalized in builds;
}
