/**
 * /counter [champion] Command
 *
 * Shows which champions counter or get countered by the selected champion
 * Uses Mobalytics for data
 */

import {
  EmbedBuilder,
  ApplicationCommandOptionType,
  AutocompleteInteraction,
} from "discord.js";
import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";
import { fetchMobalyticsCounters } from "../../services/mobalytics.js";
import {
  getLatestVersion,
  getChampionImageUrl,
  getAllChampionNames,
} from "../../utils/ddragon.js";

/** @type {import('commandkit').CommandData} */
export const data: CommandData = {
  name: "counter",
  description: "ดู Counter ของแชมเปี้ยน (ชนะ/แพ้ใคร)",
  options: [
    {
      name: "champion",
      description: "ชื่อแชมเปี้ยน (เช่น Yasuo, Lee Sin, Kai'Sa)",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],
};

/**
 * @param {import('commandkit').SlashCommandProps} param0
 */
export const run = async ({ interaction }: SlashCommandProps) => {
  const champion = interaction.options.getString("champion", true);

  await interaction.deferReply();

  try {
    const version = await getLatestVersion();

    await interaction.editReply({
      content: `🔍 กำลังดึงข้อมูล Counter ของ **${champion}**...`,
    });

    const result = await fetchMobalyticsCounters(champion);

    if (!result.success) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle("❌ ไม่พบข้อมูล")
        .setDescription(result.error || "ไม่พบข้อมูล Counter")
        .setTimestamp();

      await interaction.editReply({ content: "", embeds: [errorEmbed] });
      return;
    }

    // Format counter lists with rankings (1-10)
    const formatBestMatchups = (
      list: { name: string; winRate: string; games: string }[]
    ) => {
      if (!list || list.length === 0) return "ไม่มีข้อมูล";
      return list
        .slice(0, 10)
        .map((item, i) => `**${i + 1}.** ${item.name} (${item.winRate})`)
        .join("\n");
    };

    const formatWorstMatchups = (
      list: { name: string; winRate: string; games: string }[]
    ) => {
      if (!list || list.length === 0) return "ไม่มีข้อมูล";
      return list
        .slice(0, 10)
        .map((item, i) => `**${i + 1}.** ${item.name} (${item.winRate})`)
        .join("\n");
    };

    const bestMatchups = formatBestMatchups(result.bestMatchups);
    const worstMatchups = formatWorstMatchups(result.worstMatchups);

    const embed = new EmbedBuilder()
      .setColor(0x00cc66)
      .setTitle(`⚔️ ${result.championName} Counter`)
      .setURL(
        `https://mobalytics.gg/lol/champions/${result.championName.toLowerCase()}/counters`
      )
      .setThumbnail(getChampionImageUrl(version, result.championName))
      .addFields(
        {
          name: "✅ Easy Matchups (เราชนะทาง)",
          value: bestMatchups,
          inline: true,
        },
        {
          name: "❌ Hard Matchups (เราแพ้ทาง)",
          value: worstMatchups,
          inline: true,
        }
      )
      .setFooter({
        text: `Mobalytics | LoL v${version}`,
      })
      .setTimestamp();

    await interaction.editReply({ content: "", embeds: [embed] });
  } catch (error) {
    console.error("[Counter Command] Error:", error);

    const errorEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("⚠️ เกิดข้อผิดพลาด")
      .setDescription(error instanceof Error ? error.message : "Unknown error")
      .setTimestamp();

    await interaction.editReply({ content: "", embeds: [errorEmbed] });
  }
};

/**
 * Autocomplete handler for champion name
 */
export const autocomplete = async (ctx: any): Promise<void> => {
  const interaction = ctx.interaction as AutocompleteInteraction;

  try {
    if (
      !interaction.options ||
      typeof interaction.options.getFocused !== "function"
    ) {
      return;
    }

    const focusedValue = interaction.options.getFocused(false) as string;
    const query = (focusedValue || "").toLowerCase().trim();

    const championNames = await getAllChampionNames();

    const filtered = championNames
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((name) => ({
        name: name,
        value: name,
      }))
    );
  } catch (error) {
    console.error("[Counter Autocomplete] Error:", error);
    try {
      await interaction.respond([]);
    } catch (respondError) {
      // Ignore
    }
  }
};

/** @type {import('commandkit').CommandOptions} */
export const options: CommandOptions = {};
