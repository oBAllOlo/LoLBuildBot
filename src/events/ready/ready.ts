import type { Client } from "discord.js";
import { isDevelopment } from "../../utils/env.js";

/** @param {import('discord.js').Client} client */
export default (client: Client) => {
  const botTag = client.user?.tag || "Unknown";
  const botId = client.user?.id || "Unknown";
  const guildCount = client.guilds.cache.size;
  
  console.log("\n" + "=".repeat(60));
  console.log(`[Bot] ✅ ${botTag} is online!`);
  console.log(`[Bot] 🆔 Bot ID: ${botId}`);
  console.log(`[Bot] 🏠 Servers: ${guildCount} guild(s)`);
  console.log(`[Bot] 🔧 Mode: ${isDevelopment() ? "DEVELOPMENT" : "PRODUCTION"}`);
  console.log(`[Bot] 📍 Status: ${isDevelopment() ? "Testing on localhost" : "Running on production"}`);
  console.log("=".repeat(60) + "\n");
};
