import axios from "axios";
import * as cheerio from "cheerio";

async function test() {
  // Yasuo usually has defined builds
  const url = "https://www.leagueofgraphs.com/champions/builds/aatrox";
  console.log(`Fetching ${url}...`);
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    const $ = cheerio.load(data);

    console.log("--- Headers found ---");
    const headers = $("h3");
    console.log(`Total h3 tags: ${headers.length}`);

    headers.each((i, el) => {
      const text = $(el).text().trim();
      if (
        text.includes("Core") ||
        text.includes("Start") ||
        text.includes("Rune")
      ) {
        console.log(`[${i}] ${text}`);
      }
    });

    console.log("\n--- Core Items Headers ---");
    const coreHeaders = $("h3.box-title, .box-title").filter(
      (_, el) =>
        $(el).text().trim().includes("Core Items") ||
        $(el).text().trim().includes("Core Build"),
    );
    console.log(`Selector found: ${coreHeaders.length} elements`);
  } catch (e) {
    console.error(e);
  }
}

test();
