/**
 * Script to delete ALL guild-specific commands and re-register them
 */
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env.example") });

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.DEV_GUILD_ID;

if (!TOKEN) {
  console.error("❌ TOKEN not found in .env.example");
  process.exit(1);
}

if (!GUILD_ID) {
  console.error("❌ DEV_GUILD_ID not found in .env.example");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function deleteGuildCommands() {
  try {
    console.log(`🗑️ Deleting all guild commands for guild: ${GUILD_ID}...`);

    // Get the bot's application ID from the token
    const appInfo = (await rest.get(Routes.oauth2CurrentApplication())) as any;
    const clientId = appInfo.id;

    console.log(`📌 Bot Client ID: ${clientId}`);

    // Delete all guild commands by setting empty array
    await rest.put(Routes.applicationGuildCommands(clientId, GUILD_ID), {
      body: [],
    });

    console.log("✅ All guild commands deleted!");
    console.log("🔄 Now restart your bot to re-register the updated commands.");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

deleteGuildCommands();
