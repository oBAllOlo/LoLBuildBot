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
  role?: string,
): Promise<LOGBuildData[] | null> {
  const cleanName = champion.toLowerCase().replace(/[^a-z0-9]/g, "");
  const roleKey = role ? `-${role}` : "";
  const cachePath = path.join(CACHE_DIR, `${cleanName}${roleKey}.json`);

  console.log(
    `[Scraper] ⏱️ START fetching ${champion}${
      role ? ` (${role})` : ""
    } (v${gameVersion})...`,
  );
  const startTime = Date.now();

  // Fetch
  try {
    await ensureCacheDir();
    const stats = await fs.stat(cachePath);
    const now = new Date().getTime();

    // Read cache first to check version
    const data = await fs.readFile(cachePath, "utf-8");
    const cached = JSON.parse(data) as {
      dataVersion: string;
      builds: LOGBuildData[];
    };

    // Validate:
    // 1. 24 Hour TTL
    // 2. Data Integrity (items exist)
    // 3. Version Match (if valid version provided)
    const isFresh = now - stats.mtimeMs < 24 * 60 * 60 * 1000;
    const isComplete =
      cached.builds &&
      cached.builds.length > 0 &&
      cached.builds[0].items.starter.length > 0;
    const isVersionMatch = !gameVersion || cached.dataVersion === gameVersion;

    if (isFresh && isComplete && isVersionMatch) {
      console.log(
        `[Scraper] ⚡ Using cached data for ${champion}${
          role ? ` (${role})` : ""
        } (v${cached.dataVersion})`,
      );
      return cached.builds;
    }

    if (!isVersionMatch) {
      console.log(
        `[Scraper] 🔄 Cache version mismatch (Cached: ${cached.dataVersion} vs Current: ${gameVersion}). Re-fetching...`,
      );
    } else if (!isComplete || !isFresh) {
      console.log(
        `[Scraper] ⚠️ Cache expired/incomplete for ${champion}, refetching...`,
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

    // Common Meta Stats (Role, WinRate, PickRate) - these are usually global for the role
    let commonRole = "Unknown";
    let commonWinRate = "N/A";
    let commonPickRate = "N/A";

    const roleBox = $(".box")
      .filter((_, el) => $(el).text().includes("Role"))
      .first();
    if (roleBox.length) {
      const roleText = roleBox.text();
      if (roleText.includes("Top")) commonRole = "Top";
      else if (roleText.includes("Jungle")) commonRole = "Jungle";
      else if (roleText.includes("Mid")) commonRole = "Mid";
      else if (roleText.includes("ADC") || roleText.includes("Bot"))
        commonRole = "ADC";
      else if (roleText.includes("Support")) commonRole = "Support";

      const wrMatch = roleText.match(/Winrate:\s*([\d.]+%)/i);
      if (wrMatch) commonWinRate = wrMatch[1];

      const prMatch = roleText.match(/Popularity:\s*([\d.]+%)/i);
      if (prMatch) commonPickRate = prMatch[1];
    }

    // --- Helper to extract IDs from Images ---
    const extractId = (imgSrc?: string): number => {
      if (!imgSrc) return 0;
      const match = imgSrc.match(/\/(\d+)\.png/);
      return match ? parseInt(match[1]) : 0;
    };

    // Helper: Extract items from a container element
    const extractItemsFromContainer = (container: any): number[] => {
      const ids: number[] = [];
      container.find("[class*='item-'], img").each((_: number, el: any) => {
        const className = $(el).attr("class") || "";
        const src = $(el).attr("src") || $(el).attr("data-src") || "";
        const classMatch = className.match(/item-(\d+)/);
        if (classMatch) {
          const id = parseInt(classMatch[1], 10);
          if (id > 0) ids.push(id);
          return;
        }
        if (src && (src.includes("/items/") || src.includes("item"))) {
          const id = extractId(src);
          if (id > 0) ids.push(id);
        }
      });
      return Array.from(new Set(ids)).filter((id) => id !== 0);
    };

    const builds: LOGBuildData[] = [];

    // Find all "Core Items" headers to identify distinct builds
    // Usually:
    // 1. "Core Items" (Most Popular)
    // 2. "Core Items" (Highest Win Rate)
    const coreHeaders = $("h3.box-title, .box-title").filter(
      (_, el) =>
        $(el).text().trim().includes("Core Items") ||
        $(el).text().trim().includes("Core Build"),
    );

    console.log(`[Scraper] Found ${coreHeaders.length} build variants.`);

    if (coreHeaders.length === 0) {
      // Fallback or scraping failed
      console.warn("[Scraper] No build sections found!");
      return null;
    }

    // Iterate through each build variant found
    coreHeaders.each((index, el) => {
      // Limit to 3 builds max
      if (index >= 3) return;

      const headerText = $(el).text().trim(); // e.g. "Core Items - Use rate: 58.0% - Winrate: 51.2%"
      const container = $(el).next();

      // Parse build specific stats if available in header
      let buildWinRate = commonWinRate;
      const wrMatch = headerText.match(/Winrate:\s*([\d.]+%)/i);
      if (wrMatch) buildWinRate = wrMatch[1];

      // Construct items
      const core = extractItemsFromContainer(container).slice(1, 4); // Skip boots usually first? No, LOG usually puts boots in "Boots" section.
      // Wait, LOG structure:
      // Header: Boots -> Icons
      // Header: Core Items -> Icons
      // They are separate boxes often.
      // But simpler strategy: Extract EVERYTHING from this column if possible.
      // Actually, LOG lists usually go: Starter -> Boots -> Core -> Situational
      // We need to find the "Related" sections for THIS build index.
      // Unfortunately LOG structure is a bit flat.
      // Heuristic: The "Starter", "Boots", "Runes" usually appear in the SAME column or section sequence.
      // For simplicity in this iteration, we will assume:
      // Build 1 = 1st Starter, 1st Boots, 1st Core, 1st Runes
      // Build 2 = 2nd Starter, 2nd Boots, 2nd Core, 2nd Runes (if they exist)

      // Helper to get Nth occurrence of a section
      const getNthSectionItems = (keywords: string[], n: number): number[] => {
        const headers = $("h3.box-title, .box-title").filter((_, h) =>
          keywords.some((k) => $(h).text().trim().includes(k)),
        );
        // If we requests 2nd build (index 1) but only 1 header exists, fallback to 0
        const targetHeader = headers.eq(index < headers.length ? index : 0);
        if (!targetHeader.length) return [];
        return extractItemsFromContainer(targetHeader.next());
      };

      const starter = getNthSectionItems(["Starting", "Starter"], index).slice(
        0,
        3,
      );
      const boots = getNthSectionItems(["Boots"], index).slice(0, 1);
      // Core is already found via loop, but let's re-use helper for consistency or just use `core` variable
      // The `core` variable above used `container` which IS the Nth Core section.
      // But wait, LoLGraphs sometimes puts boots INSIDE core line? No, usually separate.
      // Let's stick to the helper for clarity.
      const finalCore = extractItemsFromContainer(container).slice(0, 4); // Take up to 4 to be safe
      const situational = getNthSectionItems(
        ["Situational", "Final"],
        index,
      ).slice(0, 3);

      const currentBuild: LOGBuildData = {
        role: commonRole,
        winRate: buildWinRate,
        pickRate: commonPickRate, // Could parse use rate from header too
        items: {
          starter,
          boots,
          core: finalCore,
          situational,
        },
        runes: { primary: 0, secondary: 0, perks: [] },
        spells: [],
      };

      // --- Runes ---
      // Same logic: Get Nth Runes box
      const runesHeaders = $(".box").filter((_, box) =>
        $(box).text().includes("Runes"),
      );
      const runesBox = runesHeaders.eq(index < runesHeaders.length ? index : 0);

      if (runesBox.length) {
        const STYLES = [8000, 8100, 8200, 8300, 8400];
        const selectedPerkIds: number[] = [];

        runesBox.find("[class*='perk-']").each((_, p) => {
          const pClass = $(p).attr("class") || "";
          const pStyle = $(p).parent().attr("style") || "";
          if (!pStyle.includes("opacity")) {
            const m = pClass.match(/perk-(\d+)/);
            if (m) selectedPerkIds.push(parseInt(m[1], 10));
          }
        });
        runesBox.find("img").each((_, img) => {
          const src = $(img).attr("src") || "";
          if (src.includes("/perks/")) {
            const match = src.match(/(\d+)\.png/);
            if (match) {
              const id = parseInt(match[1], 10);
              if (STYLES.includes(id)) selectedPerkIds.push(id);
            }
          }
        });

        const foundStyles = selectedPerkIds.filter((id) => STYLES.includes(id));
        const foundPerks = selectedPerkIds.filter((id) => !STYLES.includes(id));

        if (foundStyles.length >= 2) {
          currentBuild.runes.primary = foundStyles[0];
          currentBuild.runes.secondary = foundStyles[1];
        } else if (foundStyles.length === 1) {
          currentBuild.runes.primary = foundStyles[0];
          currentBuild.runes.secondary = 8000;
        }
        currentBuild.runes.perks = Array.from(new Set(foundPerks));
      }

      // --- Spells ---
      const spellsHeaders = $(".box").filter((_, box) =>
        $(box).text().includes("Summoner Spells"),
      );
      const spellBox = spellsHeaders.eq(
        index < spellsHeaders.length ? index : 0,
      );
      if (spellBox.length) {
        const sp: number[] = [];
        spellBox.find("[class*='spell-']").each((_, s) => {
          const c = $(s).attr("class") || "";
          const m = c.match(/spell-(\d+)/);
          if (m) sp.push(parseInt(m[1], 10));
        });
        currentBuild.spells = Array.from(new Set(sp)).slice(0, 2);
      }

      builds.push(currentBuild);
    });

    console.log(
      `[Scraper] ✅ DONE in ${Date.now() - startTime}ms - Found ${builds.length} builds`,
    );

    // Save to cache
    try {
      await fs.writeFile(
        cachePath,
        JSON.stringify(
          {
            dataVersion: gameVersion,
            builds: builds,
          },
          null,
          2,
        ),
      );
    } catch (err) {
      console.error("[Scraper] Failed to write cache", err);
    }

    return builds;
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
      `[Counter] ✅ Found ${winsAgainst.length} wins, ${losesAgainst.length} loses`,
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
