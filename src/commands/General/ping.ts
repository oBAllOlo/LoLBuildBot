import { EmbedBuilder } from "discord.js";
import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";

/** @type {import('commandkit').CommandData} */
export const data: CommandData = {
  name: "ping",
  description: "ตรวจสอบความเร็วในการตอบสนองของบอท",
};

/**
 * @param {import('commandkit').SlashCommandProps} param0
 */
export const run = async ({ interaction, client }: SlashCommandProps) => {
  const sent = await interaction.deferReply({ fetchReply: true });

  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = client.ws.ping;

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle("🏓 Pong!")
    .addFields(
      {
        name: "⏱️ Latency",
        value: `${latency}ms`,
        inline: true,
      },
      {
        name: "🌐 API Latency",
        value: `${apiLatency}ms`,
        inline: true,
      },
      {
        name: "💓 Status",
        value: latency < 200 ? "🟢 Excellent" : latency < 500 ? "🟡 Good" : "🔴 Slow",
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
};

/** @type {import('commandkit').CommandOptions} */
export const options: CommandOptions = {};
