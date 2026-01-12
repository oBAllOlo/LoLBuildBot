/**
 * Script to clear all global slash commands
 * Run with: npx tsx clear-commands.ts
 */
import "dotenv/config";
import { REST, Routes } from "discord.js";

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("TOKEN not found in .env");
  process.exit(1);
}

// Extract client ID from token (first part before the dot)
const clientId = Buffer.from(TOKEN.split(".")[0], "base64").toString();

console.log(`[Clear] Client ID: ${clientId}`);
console.log(`[Clear] Clearing all global commands...`);

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function clearCommands() {
  try {
    // Clear global commands
    console.log("[Clear] Deleting global application commands...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("[Clear] ✅ Global commands cleared!");

    // Clear guild commands if DEV_GUILD_ID is set
    const guildId = process.env.DEV_GUILD_ID;
    if (guildId) {
      console.log(`[Clear] Deleting guild commands for ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: [],
      });
      console.log("[Clear] ✅ Guild commands cleared!");
    }

    console.log(
      "\n[Clear] Done! Now restart your bot with 'npm run dev' to re-register commands."
    );
  } catch (error) {
    console.error("[Clear] Error:", error);
  }
}

clearCommands();
