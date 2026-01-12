/**
 * Debug: Check Summoner Spells extraction
 */
import axios from "axios";
import * as cheerio from "cheerio";

async function debugSpells(champion: string) {
  const url = `https://www.leagueofgraphs.com/champions/builds/${champion.toLowerCase()}`;
  console.log(`\n🔍 Debugging Summoner Spells for: ${champion}\n`);

  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);

  // Find Summoner Spells section
  const spellBox = $(".box")
    .filter((_, el) => $(el).text().includes("Summoner Spells"))
    .first();
  console.log(`Summoner Spells .box found: ${spellBox.length > 0}`);

  if (spellBox.length) {
    console.log("\n📍 Content of Summoner Spells box (first 300 chars):");
    console.log(spellBox.text().substring(0, 300).replace(/\s+/g, " "));

    console.log("\n📍 Images in Summoner Spells box:");
    spellBox.find("img").each((i, img) => {
      if (i < 10) {
        const src = $(img).attr("src") || $(img).attr("data-src") || "";
        const className = $(img).attr("class") || "";
        const parentStyle = $(img).parent().attr("style") || "";
        console.log(`  [${i}] class="${className}"`);
        console.log(`       src: ${src.substring(0, 80)}`);
        console.log(`       parent style: "${parentStyle}"`);
      }
    });

    console.log("\n📍 Elements with spell class:");
    spellBox.find("[class*='spell'], [class*='Summoner']").each((i, el) => {
      if (i < 10) {
        const className = $(el).attr("class") || "";
        console.log(`  ${className}`);
      }
    });
  }

  // Also check current scraper's spell logic
  const spellHeader = $("h3")
    .filter((_, el) => $(el).text().includes("Summoner Spells"))
    .first();
  if (spellHeader.length) {
    console.log("\n📍 Using h3 header approach:");
    const spellDiv = spellHeader.closest("div");
    spellDiv.find("img").each((i, img) => {
      const src = $(img).attr("src") || "";
      console.log(`  img src: ${src.substring(0, 60)}`);
    });
  }
}

debugSpells("hwei");
