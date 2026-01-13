import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname as dn } from "node:path";
import fs from "fs";

const __dirname = dn(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env.example") });

const log = (msg: string) => {
  console.log(msg);
  fs.appendFileSync("startup_test.log", msg + "\n");
};

log("=== Startup Test ===");
log(`Token exists: ${!!process.env.TOKEN}`);
log(`Token length: ${process.env.TOKEN?.length || 0}`);
log(`DEV_GUILD_ID: ${process.env.DEV_GUILD_ID || "not set"}`);
log("Test complete!");
