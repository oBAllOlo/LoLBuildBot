import axios from "axios";
import * as cheerio from "cheerio";

async function run() {
  const url = `https://www.leagueofgraphs.com/champions/builds/hwei`;
  console.log(`Fetching ${url}...`);
  try {
    const { data, status } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    console.log(`Status: ${status}`);
    const $ = cheerio.load(data);
    console.log(`Page Title: ${$("title").text()}`);
    console.log(
      `Body validation: ${
        data.includes("Starting") ? 'Contains "Starting"' : 'MISSING "Starting"'
      }`
    );
    console.log(`Body Preview: ${data.substring(0, 200)}`);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.log(`Axios Error: ${e.response?.status}`);
      console.log(
        `Data: ${
          e.response?.data ? e.response.data.substring(0, 200) : "No data"
        }`
      );
    } else {
      console.error(e);
    }
  }
}

run();
