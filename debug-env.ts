import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(process.cwd(), ".env.example") });

console.log("Current Directory:", process.cwd());
console.log(
  "Token Loaded:",
  process.env.TOKEN
    ? "Yes (" + process.env.TOKEN.substring(0, 10) + "...)"
    : "No"
);
console.log("Guild ID:", process.env.DEV_GUILD_ID);
