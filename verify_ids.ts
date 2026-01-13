import dotenv from "dotenv";
import { resolve } from "node:path";

// Mock environment
process.env.DEV_GUILD_IDS = "805871254657695824, 1133734444780499054";

const devConfig = process.env.DEV_GUILD_IDS || process.env.DEV_GUILD_ID || "";
const devGuildIds = devConfig
  ? devConfig
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "")
  : [];

console.log("Parsed Guild IDs:", devGuildIds);
if (
  devGuildIds.length === 2 &&
  devGuildIds[0] === "805871254657695824" &&
  devGuildIds[1] === "1133734444780499054"
) {
  console.log("✅ Verification Successful!");
} else {
  console.log("❌ Verification Failed!");
  process.exit(1);
}
