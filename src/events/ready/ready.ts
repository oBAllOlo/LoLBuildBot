import type { Client } from "discord.js";
import { logger } from "../../utils/logger.js";
import { commandStats } from "../../utils/commandStats.js";

/** @param {import('discord.js').Client} client */
export default (client: Client) => {
  const guildCount = client.guilds.cache.size;
  const userCount = client.users.cache.size;

  logger.info(`${client.user?.tag} is online!`, {
    guilds: guildCount,
    users: userCount,
    commands: client.application?.commands.cache.size || 0,
  });

  // Log bot status
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🤖 ${client.user?.tag} is ready!`);
  console.log(`📊 Servers: ${guildCount}`);
  console.log(`👥 Users: ${userCount}`);
  console.log(`⚡ Commands: ${client.application?.commands.cache.size || 0}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Reset command stats on restart (optional)
  // commandStats.clear();
};
