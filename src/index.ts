import dotenv from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname as dn } from "node:path";

// Load env vars from .env.example
const __dirname = dn(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.example") });

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

const dirname = __dirname;

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds],
});

// Get dev guild ID from environment for instant command updates
const devGuildIds = process.env.DEV_GUILD_ID ? [process.env.DEV_GUILD_ID] : [];

console.log(
  `[Bot] Dev Guild IDs: ${
    devGuildIds.length > 0
      ? devGuildIds.join(", ")
      : "None (using global commands)"
  }`
);

new CommandKit({
  client,
  eventsPath: `${dirname}/events`,
  commandsPath: `${dirname}/commands`,
  devGuildIds,
});

import { getAllChampionNames } from "./utils/ddragon.js";

// Pre-warm cache
console.log("[System] Pre-warming DDragon cache...");
getAllChampionNames()
  .then((names) => {
    console.log(`[System] Cached ${names.length} champions`);
    client.login(process.env.TOKEN);
  })
  .catch((err) => {
    console.error("[System] Failed to pre-warm cache:", err);
    client.login(process.env.TOKEN);
  });
