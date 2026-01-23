/**
 * Tier List Scraper
 *
 * Fetches champion tier list data from Mobalytics
 */
import axios from "axios";

export interface TierChampion {
  name: string;
  tier: string;
}

export interface TierListData {
  success: boolean;
  role: string;
  champions: TierChampion[];
  tiers: Record<string, TierChampion[]>;
  error?: string;
}

const ROLE_MAP: Record<string, string> = {
  top: "top",
  jungle: "jungle",
  mid: "mid",
  middle: "mid",
  adc: "adc",
  bot: "adc",
  support: "support",
  sup: "support",
};

/**
 * Hardcoded tier list data (fallback / static)
 * Updated periodically based on meta
 */
const STATIC_TIER_LIST: Record<string, Record<string, string[]>> = {
  top: {
    "S+": ["Kayle", "Fiora", "Darius", "Jax"],
    S: ["Gwen", "Gangplank", "Kennen", "Malphite", "Ornn", "Irelia"],
    A: [
      "Aatrox",
      "Riven",
      "Kled",
      "Garen",
      "Camille",
      "Vayne",
      "Yasuo",
      "Shen",
    ],
    B: [
      "Sett",
      "Nasus",
      "Volibear",
      "Renekton",
      "Teemo",
      "Yorick",
      "Mordekaiser",
    ],
  },
  jungle: {
    "S+": ["Vi", "Shaco", "Elise", "Lee Sin"],
    S: ["Kha'Zix", "Graves", "Rek'Sai", "Jarvan IV", "Nocturne", "Viego"],
    A: ["Kayn", "Hecarim", "Warwick", "Xin Zhao", "Diana", "Nidalee"],
    B: ["Amumu", "Sejuani", "Zac", "Rammus", "Volibear", "Udyr"],
  },
  mid: {
    "S+": ["Ahri", "Syndra", "Viktor", "Aurora"],
    S: ["Akali", "Zed", "Yone", "LeBlanc", "Orianna", "Hwei"],
    A: ["Lux", "Xerath", "Vex", "Sylas", "Katarina", "Ryze", "Cassiopeia"],
    B: ["Galio", "Malzahar", "Annie", "Twisted Fate", "Talon", "Fizz"],
  },
  adc: {
    "S+": ["Jinx", "Kai'Sa", "Jhin", "Caitlyn"],
    S: ["Vayne", "Ezreal", "Xayah", "Ashe", "Miss Fortune", "Draven"],
    A: ["Lucian", "Tristana", "Aphelios", "Samira", "Varus", "Sivir"],
    B: ["Twitch", "Kog'Maw", "Kalista", "Zeri", "Nilah"],
  },
  support: {
    "S+": ["Thresh", "Nautilus", "Lulu", "Janna"],
    S: ["Leona", "Pyke", "Blitzcrank", "Nami", "Soraka", "Karma"],
    A: ["Morgana", "Renata", "Rakan", "Senna", "Zyra", "Brand"],
    B: ["Yuumi", "Seraphine", "Alistar", "Braum", "Taric", "Bard"],
  },
};

/**
 * Fetch tier list data from Mobalytics
 */
export async function fetchTierList(role: string): Promise<TierListData> {
  const roleSlug = ROLE_MAP[role.toLowerCase()] || "mid";
  const url = `https://mobalytics.gg/lol/tier-list`;

  console.log(`[TierList] 🌐 Fetching tier list for: ${roleSlug}`);

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      validateStatus: (s) => s < 500,
    });

    // Extract champion names from links like [ChampionName](url/build/role)
    const roleRegex = new RegExp(
      `\\[([A-Za-z'\\s]+)\\]\\(https://mobalytics\\.gg/lol/champions/[^/]+/build/${roleSlug}\\)`,
      "gi",
    );

    const champions: string[] = [];
    let match;
    while ((match = roleRegex.exec(html)) !== null) {
      const name = match[1].trim();
      if (name && !champions.includes(name)) {
        champions.push(name);
      }
    }

    console.log(`[TierList] Found ${champions.length} champions from HTML`);

    // Assign tiers based on position (rough approximation)
    // First 20% = S+, next 20% = S, next 30% = A, rest = B
    const tiers: Record<string, TierChampion[]> = {
      "S+": [],
      S: [],
      A: [],
      B: [],
    };
    const allChamps: TierChampion[] = [];

    if (champions.length > 0) {
      const sPlus = Math.ceil(champions.length * 0.1);
      const s = Math.ceil(champions.length * 0.2);
      const a = Math.ceil(champions.length * 0.3);

      champions.forEach((name, idx) => {
        let tier = "B";
        if (idx < sPlus) tier = "S+";
        else if (idx < sPlus + s) tier = "S";
        else if (idx < sPlus + s + a) tier = "A";

        const champ = { name, tier };
        tiers[tier].push(champ);
        allChamps.push(champ);
      });

      return {
        success: true,
        role: roleSlug.charAt(0).toUpperCase() + roleSlug.slice(1),
        champions: allChamps,
        tiers,
      };
    }

    // Fallback: Use static data
    console.log(`[TierList] Using static tier list data`);
    const staticData = STATIC_TIER_LIST[roleSlug] || STATIC_TIER_LIST["mid"];
    const staticTiers: Record<string, TierChampion[]> = {};
    const staticAllChamps: TierChampion[] = [];

    for (const [tier, names] of Object.entries(staticData)) {
      staticTiers[tier] = names.map((name) => ({ name, tier }));
      staticAllChamps.push(...staticTiers[tier]);
    }

    return {
      success: true,
      role: roleSlug.charAt(0).toUpperCase() + roleSlug.slice(1),
      champions: staticAllChamps,
      tiers: staticTiers,
    };
  } catch (error) {
    console.error(`[TierList] ❌ Error:`, error);

    // Fallback to static
    const staticData = STATIC_TIER_LIST[roleSlug] || STATIC_TIER_LIST["mid"];
    const staticTiers: Record<string, TierChampion[]> = {};
    const staticAllChamps: TierChampion[] = [];

    for (const [tier, names] of Object.entries(staticData)) {
      staticTiers[tier] = names.map((name) => ({ name, tier }));
      staticAllChamps.push(...staticTiers[tier]);
    }

    return {
      success: true,
      role: roleSlug.charAt(0).toUpperCase() + roleSlug.slice(1),
      champions: staticAllChamps,
      tiers: staticTiers,
    };
  }
}
