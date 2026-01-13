import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";

/** @type {import('commandkit').CommandData} */
export const data: CommandData = {
  name: "ping",
  description: "Replies with Pong",
};

/**
 * @param {import('commandkit').SlashCommandProps} param0
 */
export const run = ({ interaction }: SlashCommandProps) => {
  interaction.reply("Pong!");
};

/** @type {import('commandkit').CommandOptions} */
export const options: CommandOptions = {
  // https://commandkit.js.org/typedef/CommandOptions
};
