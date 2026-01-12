import "dotenv/config";

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

import { dirname as dn } from "node:path";
import { fileURLToPath } from "node:url";

const dirname = dn(fileURLToPath(import.meta.url));

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

client.login(process.env.TOKEN);
