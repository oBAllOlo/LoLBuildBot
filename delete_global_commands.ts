/**
 * Script to delete ALL global commands
 * This removes cached global commands that may conflict with guild-specific commands
 */
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, ".env.example") });

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || "YOUR_CLIENT_ID"; // You need to set this

if (!TOKEN) {
  console.error("❌ TOKEN not found in .env.example");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function deleteGlobalCommands() {
  try {
    console.log("🗑️ Deleting all global commands...");

    // Get the bot's application ID from the token
    const appInfo = (await rest.get(Routes.oauth2CurrentApplication())) as any;
    const clientId = appInfo.id;

    console.log(`📌 Bot Client ID: ${clientId}`);

    // Delete all global commands by setting empty array
    await rest.put(Routes.applicationCommands(clientId), { body: [] });

    console.log("✅ All global commands deleted!");
    console.log(
      "🔄 Now restart your bot and the guild-specific commands should work."
    );
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

deleteGlobalCommands();
