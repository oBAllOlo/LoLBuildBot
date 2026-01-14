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
import { generateCounterImage } from "../../services/image-gen.js";

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

    // Format counter lists with better styling
    const formatBestMatchups = (
      list: { name: string; winRate: string; games: string }[]
    ) => {
      if (!list || list.length === 0) return "```\nไม่มีข้อมูล\n```";
      return list
        .slice(0, 10)
        .map((item, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          return `${medal} **${item.name}** - ${item.winRate}`;
        })
        .join("\n");
    };

    const formatWorstMatchups = (
      list: { name: string; winRate: string; games: string }[]
    ) => {
      if (!list || list.length === 0) return "```\nไม่มีข้อมูล\n```";
      return list
        .slice(0, 10)
        .map((item, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
          return `${medal} **${item.name}** - ${item.winRate}`;
        })
        .join("\n");
    };

    const bestMatchups = formatBestMatchups(result.bestMatchups);
    const worstMatchups = formatWorstMatchups(result.worstMatchups);

    // Calculate stats for description
    const bestCount = result.bestMatchups?.length || 0;
    const worstCount = result.worstMatchups?.length || 0;
    const totalMatchups = bestCount + worstCount;

    // Build Mobalytics URL (sanitize champion name)
    const championNameForUrl = result.championName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const mobalyticsUrl = `https://mobalytics.gg/lol/champions/${championNameForUrl}/counters`;

    // Get champion image URL (with validation)
    const championImageUrl = getChampionImageUrl(version, result.championName);

    // Create embed with better styling
    const embed = new EmbedBuilder()
      .setColor(0x5865f2) // Discord blurple color
      .setTitle(`⚔️ ${result.championName} Counter Matchups`)
      .setDescription(
        `\`\`\`\n` +
        `📊 Matchup Analysis\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Easy Wins:  ${bestCount} champions\n` +
        `❌ Hard Losses: ${worstCount} champions\n` +
        `📈 Total:      ${totalMatchups} matchups\n` +
        `\`\`\``
      );

    // Only set URL if valid
    if (mobalyticsUrl && mobalyticsUrl.startsWith("http")) {
      embed.setURL(mobalyticsUrl);
    } else {
      console.warn(`[Counter Command] ⚠️  Invalid Mobalytics URL: ${mobalyticsUrl}`);
    }

    // Only set thumbnail if valid URL
    if (championImageUrl && championImageUrl.startsWith("http")) {
      embed.setThumbnail(championImageUrl);
    } else {
      console.warn(`[Counter Command] ⚠️  Skipping thumbnail due to invalid URL`);
    }

    embed.addFields(
        {
          name: "✅ Easy Matchups (เราชนะทาง)",
          value: bestMatchups || "```\nไม่มีข้อมูล\n```",
          inline: true,
        },
        {
          name: "❌ Hard Matchups (เราแพ้ทาง)",
          value: worstMatchups || "```\nไม่มีข้อมูล\n```",
          inline: true,
        }
      )
      .setFooter({
        text: `Mobalytics • LoL Patch ${version} • ข้อมูลจากสถิติผู้เล่น`,
        iconURL: "https://mobalytics.gg/favicon.ico",
      })
      .setTimestamp();

    // Generate counter image with champion portraits
    let attachment = null;
    try {
      console.log(`[Counter Command] 🎨 Generating counter image...`);
      attachment = await generateCounterImage(
        result.championName,
        result.bestMatchups || [],
        result.worstMatchups || [],
        version
      );
      if (attachment) {
        embed.setImage("attachment://counter-matchups.png");
        console.log(`[Counter Command] ✅ Counter image generated successfully`);
      } else {
        console.warn(`[Counter Command] ⚠️  Counter image generation returned null`);
      }
    } catch (error) {
      console.error(`[Counter Command] ❌ Error generating counter image:`, error);
      // Continue without image
    }

    await interaction.editReply({ 
      content: "", 
      embeds: [embed],
      files: attachment ? [attachment] : undefined
    });
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
