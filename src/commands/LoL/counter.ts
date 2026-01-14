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
import { canRunInGuild, isDevelopment } from "../../utils/env.js";

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
  // Check if command should run in this guild (dev mode protection)
  if (!canRunInGuild(interaction.guildId)) {
    if (isDevelopment()) {
      try {
        await interaction.reply({
          content: "⚠️ This bot is running in development mode and only works in test servers.",
          ephemeral: true,
        });
      } catch (e) {
        // Ignore if already replied
      }
      return;
    }
  }

  const champion = interaction.options.getString("champion", true);

  // Defer reply since scraping may take time
  try {
    await interaction.deferReply();
  } catch (e) {
    // Interaction already acknowledged, skip
    console.warn(
      "[Counter Command] Interaction already acknowledged, skipping..."
    );
    return;
  }

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

  // Check if already responded
  if (interaction.responded) {
    return;
  }

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

    // Sort champions alphabetically for consistent display
    const sortedChampions = [...championNames].sort((a, b) => 
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );

    // Filter champions that match the query
    // If query is empty, show first 25 champions (alphabetically sorted)
    let filtered: string[];
    if (query.length === 0) {
      // Show first 25 champions when no query (sorted alphabetically)
      filtered = sortedChampions.slice(0, 25);
      console.log(`[Counter Autocomplete] Showing first 25 champions (sorted alphabetically, total: ${championNames.length})`);
    } else {
      // Filter by query (also sorted alphabetically)
      filtered = sortedChampions
        .filter((name) => name.toLowerCase().includes(query))
        .slice(0, 25); // Discord autocomplete limit is 25
      console.log(`[Counter Autocomplete] Filtered ${championNames.length} champions to ${filtered.length} matches for query "${query}"`);
    }

    // Double check before responding
    if (!interaction.responded) {
      await interaction.respond(
        filtered.map((name) => ({
          name: name,
          value: name,
        }))
      );
    }
  } catch (error: any) {
    // Only log if it's not the "already acknowledged" error
    if (error?.code !== 40060) {
      console.error("[Counter Autocomplete] Error:", error);
    }
    // Don't try to respond again if already responded
  }
};

/** @type {import('commandkit').CommandOptions} */
export const options: CommandOptions = {};
