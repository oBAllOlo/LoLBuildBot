import axios from "axios";
import fs from "fs/promises";

async function run() {
  const url = `https://www.leagueofgraphs.com/champions/builds/teemo`;
  console.log(`Fetching ${url}...`);
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    await fs.writeFile("teemo_dump.html", data);
    console.log("Dumped to teemo_dump.html");
  } catch (e) {
    console.error(e);
  }
}

run();
