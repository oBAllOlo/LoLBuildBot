/**
 * /build [champion] [region] Command
 *
 * Searches for Challenger player builds for a specific champion
 * Uses Riot API to find recent matches and extract item builds
 */

import {
  EmbedBuilder,
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import fs from "fs";
import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";
import { getAverageBuild, getMultipleBuilds } from "../../services/scraper.js";
import {
  getLatestVersion,
  getItemImageUrl,
  getChampionImageUrl,
  getItemName,
  getRuneName,
  getAllChampionNames,
} from "../../utils/ddragon.js";
import { generateBuildImage } from "../../services/image-gen.js";
import { canRunInGuild, isDevelopment } from "../../utils/env.js";

/** @type {import('commandkit').CommandData} */
export const data: CommandData = {
  name: "build",
  description: "ค้นหา Item Build จากผู้เล่นระดับสูง",
  options: [
    {
      name: "champion",
      description: "ชื่อแชมเปี้ยน (เช่น Yasuo, Lee Sin, Kai'Sa)",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
    {
      name: "role",
      description: "ตำแหน่งที่ต้องการ (ไม่ระบุ = ตำแหน่งยอดนิยม)",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "🗡️ Top", value: "top" },
        { name: "🌲 Jungle", value: "jungle" },
        { name: "🔮 Mid", value: "middle" },
        { name: "🏹 ADC", value: "adc" },
        { name: "🛡️ Support", value: "support" },
      ],
    },
  ],
};

/**
 * Create a visual item display for Discord
 * Since we can't display actual images inline, we'll format it nicely
 */
function formatItems(items: number[], version: string): string {
  if (items.length === 0) return "No items found";
  return items
    .map((itemId) => `[Item ${itemId}](${getItemImageUrl(version, itemId)})`)
    .join(" → ");
}

/**
 * @param {import('commandkit').SlashCommandProps} param0
 */
// @param {import('commandkit').SlashCommandProps} param0
export const run = async ({ interaction }: SlashCommandProps) => {
  if (!canRunInGuild(interaction.guildId)) {
    if (isDevelopment()) {
      try {
        await interaction.reply({
          content:
            "⚠️ This bot is running in development mode and only works in test servers.",
          ephemeral: true,
        });
      } catch (e) {} // Ignore
      return;
    }
  }

  const champion = interaction.options.getString("champion", true);
  const role = interaction.options.getString("role") || undefined;

  try {
    await interaction.deferReply();
  } catch (e) {
    return;
  }

  try {
    const version = await getLatestVersion();
    const roleText = role ? ` (${role.toUpperCase()})` : "";

    await interaction.editReply({
      content: `🔍 กำลังดึงข้อมูล Build ของ **${champion}**${roleText}... (10%)`,
    });

    // Use New Scraper for Multiple Builds
    const result = await getMultipleBuilds(champion, role);

    if (!result.success || !result.builds || result.builds.length === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle("❌ ไม่พบข้อมูล")
        .setDescription(result.error || `ไม่พบข้อมูลสำหรับ ${champion}`)
        .setFooter({ text: "ลองตรวจสอบชื่อ Champion หรือลองใหม่อีกครั้ง" })
        .setTimestamp();

      await interaction.editReply({ content: "", embeds: [errorEmbed] });
      return;
    }

    // Prepare Function to Generate Embed for a specific build index
    const generateEmbedForBuild = async (index: number) => {
      const build = result.builds[index];

      // Resolve Item Names
      const itemNames = await Promise.all(
        build.items.map((id) => getItemName(version, id)),
      );
      const itemsDisplay = build.items
        .map(
          (id, idx) => `[${itemNames[idx]}](${getItemImageUrl(version, id)})`,
        )
        .join(" → ");

      // Resolve Rune Names
      const primaryRuneName = await getRuneName(
        version,
        build.runes.primaryStyle,
      );
      const secondaryRuneName = await getRuneName(
        version,
        build.runes.secondaryStyle,
      );

      const spellNames: Record<number, string> = {
        4: "Flash",
        7: "Heal",
        14: "Ignite",
        12: "Teleport",
        6: "Ghost",
        3: "Exhaust",
        11: "Smite",
        21: "Barrier",
        32: "Snowball",
      };
      const spell1Name = spellNames[build.summonerSpells.spell1] || "Unknown";
      const spell2Name = spellNames[build.summonerSpells.spell2] || "Unknown";

      // Build Mobalytics URL (fallback)
      const championNameForUrl = build.championName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const mobalyticsUrl = `https://mobalytics.gg/lol/champions/${championNameForUrl}/build`;
      const championImageUrl = getChampionImageUrl(version, build.championName);

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`📊 ${build.championName} Build #${index + 1}`)
        .setDescription(
          `**Role:** ${build.gameMode || "N/A"}\n**Win Rate:** ${build.winRate || "N/A"} • **Matches:** ${build.pickRate || "N/A"}`,
        );

      if (mobalyticsUrl) embed.setURL(mobalyticsUrl);
      if (championImageUrl) embed.setThumbnail(championImageUrl);

      embed
        .addFields(
          { name: "📦 Core Items", value: itemsDisplay, inline: false },
          {
            name: "✨ Summoner Spells",
            value: `${spell1Name} + ${spell2Name}`,
            inline: true,
          },
          {
            name: "🔮 Runes",
            value: `Primary: ${primaryRuneName}\nSecondary: ${secondaryRuneName}`,
            inline: true,
          },
        )
        .setFooter({
          text: `Sources: LeagueOfGraphs | Build ${index + 1}/${result.builds.length} | LoL v${version}`,
        })
        .setTimestamp();

      return embed;
    };

    // Initial State (Build 1)
    let currentIndex = 0;

    // Pre-generate ALL images upfront for faster switching
    await interaction.editReply({
      content: `🎨 กำลังเตรียมรูป Build ทั้งหมด... (80%)`,
    });

    const cachedImages: (any | null)[] = await Promise.all(
      result.builds.slice(0, 3).map(async (build) => {
        if (build.buildData) {
          return await generateBuildImage(
            build.championName,
            build.buildData,
            version,
            {
              winRate: build.winRate || "N/A",
              pickRate: build.pickRate?.toString() || "N/A",
              role: build.gameMode || "Auto",
            },
          );
        }
        return null;
      }),
    );

    // Pre-generate all embeds
    const cachedEmbeds = await Promise.all(
      result.builds.slice(0, 3).map((_, idx) => generateEmbedForBuild(idx)),
    );

    // Set image on embeds
    cachedEmbeds.forEach((embed, idx) => {
      if (cachedImages[idx]) {
        embed.setImage("attachment://build-summary.png");
      }
    });

    // Create Buttons if multiple builds exist
    const components: any[] = [];
    if (result.builds.length > 1) {
      const row = new ActionRowBuilder();

      result.builds.slice(0, 3).forEach((_, idx) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`build_${idx}`)
            .setLabel(`Build ${idx + 1}`)
            .setStyle(
              idx === currentIndex
                ? ButtonStyle.Primary
                : ButtonStyle.Secondary,
            )
            .setDisabled(idx === currentIndex),
        );
      });

      components.push(row);
    }

    const message = await interaction.editReply({
      content: "",
      embeds: [cachedEmbeds[currentIndex]],
      files: cachedImages[currentIndex] ? [cachedImages[currentIndex]] : [],
      components: components,
    });

    // Collector for Buttons - NOW USES CACHED DATA (FAST!)
    if (result.builds.length > 1) {
      const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000, // 2 minute timeout (longer since it's now fast)
      });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: "คุณไม่ใช่ผู้เรียกคำสั่งนี้!",
            ephemeral: true,
          });
          return;
        }

        const selectedIndex = parseInt(i.customId.split("_")[1]);
        if (isNaN(selectedIndex) || selectedIndex === currentIndex) {
          await i.deferUpdate();
          return;
        }

        await i.deferUpdate();
        currentIndex = selectedIndex;

        // Update Buttons State
        const updatedRow = new ActionRowBuilder();
        result.builds.slice(0, 3).forEach((_, idx) => {
          updatedRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`build_${idx}`)
              .setLabel(`Build ${idx + 1}`)
              .setStyle(
                idx === currentIndex
                  ? ButtonStyle.Primary
                  : ButtonStyle.Secondary,
              )
              .setDisabled(idx === currentIndex),
          );
        });

        // Use CACHED embed and image (INSTANT!)
        await interaction.editReply({
          embeds: [cachedEmbeds[currentIndex]],
          files: cachedImages[currentIndex] ? [cachedImages[currentIndex]] : [],
          components: [updatedRow as any],
        });
      });

      collector.on("end", () => {
        // Remove buttons after timeout
        interaction.editReply({ components: [] }).catch(() => {});
      });
    }
  } catch (error) {
    console.error("[Build Command] Error:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: "❌ เกิดข้อผิดพลาดในการดึงข้อมูล",
      });
    }
  }
};

/**
 * Autocomplete handler for champion name
 */
// CommandKit passes an object with { interaction, client, handler }
export const autocomplete = async (
  ctx: any, // Untyped or specific CommandKit type
): Promise<void> => {
  const interaction = ctx.interaction as AutocompleteInteraction;

  // Check if already responded
  if (interaction.responded) {
    return;
  }

  try {
    // Check if options exists and has getFocused method
    if (
      !interaction.options ||
      typeof interaction.options.getFocused !== "function"
    ) {
      console.warn("[Build Autocomplete] Options or getFocused not available");
      return;
    }

    // Get the focused option value
    const focusedValue = interaction.options.getFocused(false) as string;
    const query = (focusedValue || "").toLowerCase().trim();

    console.log(`[Build Autocomplete] Query: "${query}"`);

    // Fetch champion names (with timeout)
    let championNames: string[] = [];
    try {
      championNames = await Promise.race([
        getAllChampionNames(),
        new Promise<string[]>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000),
        ),
      ]);
    } catch (fetchError) {
      console.error(
        "[Build Autocomplete] Failed to fetch champion names:",
        fetchError,
      );
      // Return empty if fetch fails
      if (!interaction.responded) {
        await interaction.respond([]);
      }
      return;
    }

    if (!championNames || championNames.length === 0) {
      console.warn("[Build Autocomplete] No champion names available");
      if (!interaction.responded) {
        await interaction.respond([]);
      }
      return;
    }

    console.log(`[Build Autocomplete] Found ${championNames.length} champions`);

    // Sort champions alphabetically for consistent display
    const sortedChampions = [...championNames].sort((a, b) =>
      a.localeCompare(b, "en", { sensitivity: "base" }),
    );

    // Filter champions that match the query
    // If query is empty, show first 25 champions (alphabetically sorted)
    let filtered: string[];
    if (query.length === 0) {
      // Show first 25 champions when no query (sorted alphabetically)
      filtered = sortedChampions.slice(0, 25);
      console.log(
        `[Build Autocomplete] Showing first 25 champions (sorted alphabetically, total: ${championNames.length})`,
      );
    } else {
      // Filter by query (also sorted alphabetically)
      filtered = sortedChampions
        .filter((name) => name.toLowerCase().includes(query))
        .slice(0, 25); // Discord autocomplete limit is 25
      console.log(
        `[Build Autocomplete] Filtered ${championNames.length} champions to ${filtered.length} matches for query "${query}"`,
      );
    }

    // Double check before responding
    if (!interaction.responded) {
      const choices = filtered.map((name) => ({
        name: name,
        value: name,
      }));

      await interaction.respond(choices);
      console.log(
        `[Build Autocomplete] Responded with ${choices.length} choices`,
      );
    }
  } catch (error: any) {
    // Only log if it's not the "already acknowledged" error
    if (
      error?.code !== 40060 &&
      error?.message !==
        "The reply to this interaction has already been sent or deferred."
    ) {
      console.error("[Build Autocomplete] Error:", error);
      console.error("[Build Autocomplete] Error stack:", error?.stack);
    }

    // Try to respond with empty array if not responded yet
    if (!interaction.responded) {
      try {
        await interaction.respond([]);
      } catch (e) {
        // Ignore if already responded
      }
    }
  }
};

/** @type {import('commandkit').CommandOptions} */
export const options: CommandOptions = {
  // devOnly: true, // Uncomment for development testing
  // userPermissions: ['Administrator'], // Restrict if needed
  // botPermissions: ['SendMessages', 'EmbedLinks'],
};
