import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname as dn } from "node:path";

// Load env vars from .env (or .env.example as fallback)
const __dirname = dn(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envExamplePath = resolve(__dirname, "../.env.example");

// Try .env first, then fallback to .env.example
dotenv.config({ path: envPath });
dotenv.config({ path: envExamplePath });

// Suppress discord.js deprecation warning about 'ready' -> 'clientReady'
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (
    warning.name === "DeprecationWarning" &&
    warning.message.includes("clientReady")
  ) {
    return; // Ignore this specific warning
  }
  console.warn(warning);
});

import { Client, IntentsBitField } from "discord.js";
import { CommandKit } from "commandkit";
import { keepAlive } from "./utils/keepAlive.js";

const dirname = __dirname;

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds],
});

// Get dev guild IDs from environment for instant command updates
const devConfig = process.env.DEV_GUILD_IDS || process.env.DEV_GUILD_ID || "";
const devGuildIds = devConfig
  ? devConfig
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "")
  : [];

console.log(
  `[Bot] Dev Guild IDs: ${
    devGuildIds.length > 0
      ? devGuildIds.join(", ")
      : "None (using global commands)"
  }`
);

// Validate token before initializing CommandKit
const token = process.env.TOKEN;
if (!token || typeof token !== "string" || token.trim() === "") {
  console.error("[Error] Discord bot token is missing or invalid!");
  console.error(
    "[Error] Please create a .env file (or .env.example) with TOKEN=your_bot_token"
  );
  process.exit(1);
}

new CommandKit({
  client,
  eventsPath: `${dirname}/events`,
  commandsPath: `${dirname}/commands`,
  devGuildIds,
});

import { getAllChampionNames } from "./utils/ddragon.js";

// Start keep-alive server for UptimeRobot
keepAlive();

// Pre-warm cache
console.log("[System] Pre-warming DDragon cache...");
getAllChampionNames()
  .then((names) => {
    console.log(`[System] Cached ${names.length} champions`);
    client.login(token);
  })
  .catch((err) => {
    console.error("[System] Failed to pre-warm cache:", err);
    client.login(token);
  });
