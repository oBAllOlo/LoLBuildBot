import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, "../../data/cache/log");

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // Ignore if exists
  }
}

interface LOGBuildData {
  role: string;
  winRate: string;
  pickRate: string;
  items: {
    starter: number[];
    boots: number[];
    core: number[];
    situational: number[];
  };
  runes: {
    primary: number; // Style ID
    secondary: number; // Style ID
    perks: number[];
  };
  spells: number[];
}

export async function fetchChampionBuild(
  champion: string,
  gameVersion: string,
  role?: string
): Promise<LOGBuildData | null> {
  const cleanName = champion.toLowerCase().replace(/[^a-z0-9]/g, "");
  const roleKey = role ? `-${role}` : "";
  const cachePath = path.join(CACHE_DIR, `${cleanName}${roleKey}.json`);

  console.log(
    `[Scraper] ⏱️ START fetching ${champion}${
      role ? ` (${role})` : ""
    } (v${gameVersion})...`
  );
  const startTime = Date.now();

  // Fetch
  try {
    await ensureCacheDir();
    const stats = await fs.stat(cachePath);
    const now = new Date().getTime();

    // Read cache first to check version
    const data = await fs.readFile(cachePath, "utf-8");
    const cached = JSON.parse(data);

    // Validate:
    // 1. 24 Hour TTL
    // 2. Data Integrity (items exist)
    // 3. Version Match (if valid version provided)
    const isFresh = now - stats.mtimeMs < 24 * 60 * 60 * 1000;
    const isComplete =
      cached.items && cached.items.starter && cached.items.starter.length > 0;
    const isVersionMatch = !gameVersion || cached.dataVersion === gameVersion;

    if (isFresh && isComplete && isVersionMatch) {
      // Sanitize Cached Data
      cached.items.starter = cached.items.starter.slice(0, 3);
      cached.items.core = cached.items.core.slice(0, 3);
      cached.items.boots = cached.items.boots.slice(0, 1);
      cached.items.situational = cached.items.situational.slice(0, 3);
      console.log(
        `[Scraper] ⚡ Using cached data for ${champion}${
          role ? ` (${role})` : ""
        } (v${cached.dataVersion})`
      );
      return cached;
    }

    if (!isVersionMatch) {
      console.log(
        `[Scraper] 🔄 Cache version mismatch (Cached: ${cached.dataVersion} vs Current: ${gameVersion}). Re-fetching...`
      );
    } else if (!isComplete || !isFresh) {
      console.log(
        `[Scraper] ⚠️ Cache expired/incomplete for ${champion}, refetching...`
      );
    }
  } catch (e) {
    // Cache miss
  }

  // 2. Fetch
  try {
    // Build URL with optional role path
    const roleUrlPart = role ? `/${role}` : "";
    const url = `https://www.leagueofgraphs.com/champions/builds/${cleanName}${roleUrlPart}`;
    console.log(`[Scraper] 🌐 Requesting:`);
    console.log(`[Scraper]    ${url}`);

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);
    console.log(`[Scraper] ✅ Page loaded. Body length: ${data.length}`);

    const result: LOGBuildData = {
      role: "Unknown",
      winRate: "N/A",
      pickRate: "N/A",
      items: { starter: [], boots: [], core: [], situational: [] },
      runes: { primary: 0, secondary: 0, perks: [] },
      spells: [],
    };

    // --- Meta Stats ---
    // Find the Role .box and parse: "Role Top Popularity: 69.4% Winrate: 50.6%"
    const roleBox = $(".box")
      .filter((_, el) => $(el).text().includes("Role"))
      .first();
    if (roleBox.length) {
      const roleText = roleBox.text();

      // Parse Role
      if (roleText.includes("Top")) result.role = "Top";
      else if (roleText.includes("Jungle")) result.role = "Jungle";
      else if (roleText.includes("Mid")) result.role = "Mid";
      else if (roleText.includes("ADC") || roleText.includes("Bot"))
        result.role = "ADC";
      else if (roleText.includes("Support")) result.role = "Support";

      // Parse Win Rate
      const wrMatch = roleText.match(/Winrate:\s*([\d.]+%)/i);
      if (wrMatch) result.winRate = wrMatch[1];

      // Parse Pick Rate (Popularity)
      const prMatch = roleText.match(/Popularity:\s*([\d.]+%)/i);
      if (prMatch) result.pickRate = prMatch[1];

      console.log(
        `[Scraper] 📊 Meta: Role=${result.role}, WinRate=${result.winRate}, PickRate=${result.pickRate}`
      );
    }

    // --- Helper to extract IDs from Images ---
    const extractId = (imgSrc?: string): number => {
      if (!imgSrc) return 0;
      // /img/items/15.4/6672.png -> 6672
      // /img/perks/8000.png -> 8000
      const match = imgSrc.match(/\/(\d+)\.png/);
      return match ? parseInt(match[1]) : 0;
    };

    // --- Items ---

    // Helper to find items following a specific header text (e.g., "Starting Build")
    // Uses the NEXT SIBLING pattern: <h3>Header</h3> <div class="iconsRow">...items...</div>
    const getImagesAfterHeader = (headerKeywords: string[]): number[] => {
      const ids: number[] = [];

      // Strategy: Find <h3 class="box-title"> matching keyword, then get .next() sibling
      for (const keyword of headerKeywords) {
        const header = $("h3.box-title, .box-title")
          .filter((_, el) => $(el).text().trim().includes(keyword))
          .first();

        if (header.length) {
          // Get the NEXT sibling (should be .iconsRow or similar)
          const container = header.next();

          if (container.length) {
            // Extract items from this container
            container
              .find("[class*='item-'], img")
              .each((_: number, el: any) => {
                const className = $(el).attr("class") || "";
                const src = $(el).attr("src") || $(el).attr("data-src") || "";

                // 1. Try CSS Sprite Class (e.g. item-1056-36)
                const classMatch = className.match(/item-(\d+)/);
                if (classMatch) {
                  const id = parseInt(classMatch[1], 10);
                  if (id > 0) ids.push(id);
                  return;
                }

                // 2. Try URL pattern (e.g. /items/1056.png)
                if (src && (src.includes("/items/") || src.includes("item"))) {
                  const id = extractId(src);
                  if (id > 0) ids.push(id);
                }
              });
            break; // Found matching header, done
          }
        }
      }

      return Array.from(new Set(ids)).filter((id) => id !== 0);
    };

    result.items.starter = getImagesAfterHeader(["Starting", "Starter"]).slice(
      0,
      3
    );
    result.items.core = getImagesAfterHeader([
      "Core Items",
      "Core Build",
    ]).slice(1, 4); // Skip first item (boots), take next 3
    result.items.boots = getImagesAfterHeader(["Boots"]).slice(0, 1);
    result.items.situational = getImagesAfterHeader([
      "Final Item",
      "Situational",
    ]).slice(0, 3);
    console.log(
      `[Scraper] 📦 Items found - Starter: ${result.items.starter.length}, Core: ${result.items.core.length}`
    );
    // LOG runes use CSS sprites with class like "perk-8005-36"
    // SELECTED runes have parent WITHOUT "opacity: 0.2" style
    // UNSELECTED runes have parent WITH "opacity: 0.2" style

    const runesBox = $(".box")
      .filter((_, el) => $(el).text().includes("Runes"))
      .first();
    if (runesBox.length) {
      const STYLES = [8000, 8100, 8200, 8300, 8400];
      const selectedPerkIds: number[] = [];

      // Extract SELECTED perks only (parent has no opacity: 0.2)
      runesBox.find("[class*='perk-']").each((_, el) => {
        const className = $(el).attr("class") || "";
        const parentStyle = $(el).parent().attr("style") || "";

        // Skip if parent has opacity (means unselected)
        if (parentStyle.includes("opacity")) {
          return;
        }

        const match = className.match(/perk-(\d+)/);
        if (match) {
          selectedPerkIds.push(parseInt(match[1], 10));
        }
      });

      // Extract tree icons from img src (always visible, no opacity check needed)
      runesBox.find("img").each((_, img) => {
        const src = $(img).attr("src") || "";
        if (src.includes("/perks/")) {
          const match = src.match(/(\d+)\.png/);
          if (match) {
            const id = parseInt(match[1], 10);
            if (STYLES.includes(id)) {
              selectedPerkIds.push(id);
            }
          }
        }
      });

      // Separate styles from perks
      const foundStyles = selectedPerkIds.filter((id) => STYLES.includes(id));
      const foundPerks = selectedPerkIds.filter((id) => !STYLES.includes(id));

      if (foundStyles.length >= 2) {
        result.runes.primary = foundStyles[0];
        result.runes.secondary = foundStyles[1];
      } else if (foundStyles.length === 1) {
        result.runes.primary = foundStyles[0];
        result.runes.secondary = 8000; // Default fallback
      }

      // Remove duplicates and store perks
      result.runes.perks = Array.from(new Set(foundPerks));
      console.log(
        `[Scraper] 🔮 Runes found - Primary: ${result.runes.primary}, Secondary: ${result.runes.secondary}, Perks: ${result.runes.perks.length}`
      );
    }

    // --- Spells ---
    // LOG uses CSS sprites with class like "spell-4-48" (Flash = 4, Teleport = 12)
    const spellBox = $(".box")
      .filter((_, el) => $(el).text().includes("Summoner Spells"))
      .first();
    if (spellBox.length) {
      const spells: number[] = [];

      // Extract from class names (CSS Sprites)
      spellBox.find("[class*='spell-']").each((_, el) => {
        const className = $(el).attr("class") || "";
        const match = className.match(/spell-(\d+)/);
        if (match) {
          spells.push(parseInt(match[1], 10));
        }
      });

      result.spells = Array.from(new Set(spells)).slice(0, 2);
      console.log(`[Scraper] ✨ Spells found: ${result.spells.join(", ")}`);
    }

    const elapsed = Date.now() - startTime;
    console.log(
      `[Scraper] ✅ DONE in ${elapsed}ms - Items: ${result.items.starter.length}/${result.items.core.length}/${result.items.boots.length}`
    );
    return result;
  } catch (error) {
    console.error(`[Scraper] ❌ Failed to fetch ${champion}:`, error);
    return null;
  }
}

// Counter Data Interface
interface CounterMatchup {
  name: string;
  winRate: string;
}

interface CounterData {
  success: boolean;
  championName: string;
  winsAgainst?: CounterMatchup[];
  losesAgainst?: CounterMatchup[];
  error?: string;
}

/**
 * Fetch counter matchup data for a champion
 */
export async function fetchCounterData(champion: string): Promise<CounterData> {
  const cleanName = champion.toLowerCase().replace(/[^a-z0-9]/g, "");
  const url = `https://www.leagueofgraphs.com/champions/counters/${cleanName}`;

  console.log(`[Counter] 🌐 Requesting:`);
  console.log(`[Counter]    ${url}`);

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(data);

    const winsAgainst: CounterMatchup[] = [];
    const losesAgainst: CounterMatchup[] = [];

    // Find sections by header text
    $("h3").each((_, header) => {
      const headerText = $(header).text().trim();
      const container = $(header).next();

      if (headerText.includes("wins lane against")) {
        container.find("a").each((_, link) => {
          const text = $(link).text().trim();
          const champName = text.split("\n")[0].trim();
          // Try to find win rate from progressbar or percentage text
          const parent = $(link).parent();
          const progressBar = parent.find(".progressBar");
          let winRate = "N/A";
          if (progressBar.length) {
            const tooltip =
              progressBar.attr("title") || progressBar.attr("data-tip") || "";
            const match = tooltip.match(/([\d.]+%)/);
            if (match) winRate = match[1];
          }
          if (
            champName &&
            champName.length > 1 &&
            !champName.includes("Top") &&
            !champName.includes("Mid")
          ) {
            winsAgainst.push({ name: champName, winRate });
          }
        });
      } else if (headerText.includes("loses lane against")) {
        container.find("a").each((_, link) => {
          const text = $(link).text().trim();
          const champName = text.split("\n")[0].trim();
          const parent = $(link).parent();
          const progressBar = parent.find(".progressBar");
          let winRate = "N/A";
          if (progressBar.length) {
            const tooltip =
              progressBar.attr("title") || progressBar.attr("data-tip") || "";
            const match = tooltip.match(/([\d.]+%)/);
            if (match) winRate = match[1];
          }
          if (
            champName &&
            champName.length > 1 &&
            !champName.includes("Top") &&
            !champName.includes("Mid")
          ) {
            losesAgainst.push({ name: champName, winRate });
          }
        });
      }
    });

    console.log(
      `[Counter] ✅ Found ${winsAgainst.length} wins, ${losesAgainst.length} loses`
    );

    return {
      success: true,
      championName: champion,
      winsAgainst: winsAgainst.slice(0, 10),
      losesAgainst: losesAgainst.slice(0, 10),
    };
  } catch (error) {
    console.error(`[Counter] ❌ Failed to fetch ${champion}:`, error);
    return {
      success: false,
      championName: champion,
      error: "ไม่สามารถดึงข้อมูล Counter ได้",
    };
  }
}
