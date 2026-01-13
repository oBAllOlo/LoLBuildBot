import { getAllChampionNames } from "./src/utils/ddragon.js";

async function test() {
  try {
    console.log("Fetching champions...");
    const names = await getAllChampionNames();
    console.log(`Found ${names.length} champions.`);
    console.log("First 5:", names.slice(0, 5));

    const query = "te";
    const filtered = names.filter((name) => name.toLowerCase().includes(query));
    console.log(`Query "${query}" matches:`, filtered);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
