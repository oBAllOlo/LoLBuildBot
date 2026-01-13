import type { Client } from "discord.js";

/** @param {import('discord.js').Client} client */
export default (client: Client) => {
  console.log(`${client.user?.tag} is online!`);
};
