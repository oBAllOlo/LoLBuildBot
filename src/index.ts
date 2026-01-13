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
import { envValidator } from "./config/env.js";
import { logger } from "./utils/logger.js";

const dirname = __dirname;

// Validate environment variables
let envConfig;
try {
  envConfig = envValidator.validate();
  logger.info("Environment variables validated successfully");
} catch (error) {
  logger.error("Environment validation failed", error);
  process.exit(1);
}

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds],
});

// Get dev guild IDs from validated config
const devGuildIds = envConfig.DEV_GUILD_IDS;

logger.info(
  `Dev Guild IDs: ${
    devGuildIds.length > 0
      ? devGuildIds.join(", ")
      : "None (using global commands)"
  }`
);

// Use validated token
const token = envConfig.TOKEN;

new CommandKit({
  client,
  eventsPath: `${dirname}/events`,
  commandsPath: `${dirname}/commands`,
  devGuildIds,
});

import { getAllChampionNames } from "./utils/ddragon.js";
import { cleanOldCache } from "./utils/imageCache.js";

// Start keep-alive server for UptimeRobot
keepAlive();

// Clean old cache files on startup
cleanOldCache();

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
