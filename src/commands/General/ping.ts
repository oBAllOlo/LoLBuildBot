import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";
import { canRunInGuild, isDevelopment } from "../../utils/env.js";

/** @type {import('commandkit').CommandData} */
export const data: CommandData = {
  name: "ping",
  description: "Replies with Pong",
};

/**
 * @param {import('commandkit').SlashCommandProps} param0
 */
export const run = ({ interaction }: SlashCommandProps) => {
  // Check if command should run in this guild (dev mode protection)
  if (!canRunInGuild(interaction.guildId)) {
    if (isDevelopment()) {
      interaction.reply({
        content: "⚠️ This bot is running in development mode and only works in test servers.",
        ephemeral: true,
      });
      return;
    }
  }

  interaction.reply("Pong!");
};

/** @type {import('commandkit').CommandOptions} */
export const options: CommandOptions = {
  // https://commandkit.js.org/typedef/CommandOptions
};
