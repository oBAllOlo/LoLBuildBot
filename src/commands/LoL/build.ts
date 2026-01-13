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
} from "discord.js";
import fs from "fs";
import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";
import { getAverageBuild } from "../../services/scraper.js";
import {
  getChallengerBuild,
  getChallengerBuildAllRegions,
} from "../../services/riot.js";
import {
  getLatestVersion,
  getItemImageUrl,
  getChampionImageUrl,
  getItemName,
  getRuneName,
  getAllChampionNames,
} from "../../utils/ddragon.js";
import { generateBuildImage } from "../../services/image-gen.js";

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
export const run = async ({ interaction }: SlashCommandProps) => {
  const champion = interaction.options.getString("champion", true);
  const role = interaction.options.getString("role") || undefined;

  // Defer reply since scraping may take time
  try {
    await interaction.deferReply();
  } catch (e) {
    console.warn(
      "[Build Command] Interaction already acknowledged, skipping..."
    );
    return;
  }
  try {
    const version = await getLatestVersion();

    console.log(
      `[Command] /build input - Champion: "${champion}", Role: "${
        role || "Auto"
      }"`
    );

    // Progress: 10%
    const roleText = role ? ` (${role.toUpperCase()})` : "";
    await interaction.editReply({
      content: `🔍 กำลังดึงข้อมูล Build ของ **${champion}**${roleText}... (10%)`,
    });

    // Use Scraper for Meta Build (default)
    const result = await getAverageBuild(champion, role);

    if (!result.success) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle("❌ ไม่พบข้อมูล")
        .setDescription(result.error)
        .setFooter({ text: "ลองตรวจสอบชื่อ Champion หรือลองใหม่อีกครั้ง" })
        .setTimestamp();

      await interaction.editReply({ content: "", embeds: [errorEmbed] });
      return;
    }

    // Progress: 50%
    await interaction.editReply({
      content: `🔍 กำลังดึงข้อมูล Build ของ **${champion}**... (50%)`,
    });

    // Resolve Item Names
    const itemNames = await Promise.all(
      result.items.map((id) => getItemName(version, id))
    );
    const itemsDisplay = result.items
      .map(
        (id, index) => `[${itemNames[index]}](${getItemImageUrl(version, id)})`
      )
      .join(" → ");

    // Resolve Rune Names
    const primaryRuneName = await getRuneName(
      version,
      result.runes.primaryStyle
    );
    const secondaryRuneName = await getRuneName(
      version,
      result.runes.secondaryStyle
    );

    // Get summoner spell names
    const spellNames: Record<number, string> = {
      4: "Flash",
      7: "Heal",
      14: "Ignite",
      12: "Teleport",
      6: "Ghost",
      3: "Exhaust",
      11: "Smite",
      21: "Barrier",
    };
    const spell1Name = spellNames[result.summonerSpells.spell1] || "Unknown";
    const spell2Name = spellNames[result.summonerSpells.spell2] || "Unknown";

    // Generate Image (only for Meta builds with buildData)
    let attachment = null;
    try {
      if (result.buildData) {
        // Progress: 80%
        await interaction.editReply({
          content: `🎨 กำลังสร้างรูป Build ของ **${champion}**... (80%)`,
        });

        attachment = await generateBuildImage(
          result.championName,
          result.buildData,
          version,
          {
            winRate: result.winRate || "N/A",
            pickRate: result.pickRate || "N/A",
            role: result.gameMode,
          }
        );
      }
    } catch (e) {
      console.error("Failed to generate image", e);
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`📊 ${result.championName} Build`)
      .setURL(
        `https://mobalytics.gg/lol/champions/${result.championName.toLowerCase()}/build${
          result.gameMode && result.gameMode !== "Popular"
            ? "/" +
              result.gameMode
                .toLowerCase()
                .replace("middle", "mid")
                .replace("bot", "adc")
            : ""
        }`
      )
      .setDescription(
        `**Role:** ${result.gameMode}\n**Win Rate:** ${
          result.winRate || "N/A"
        } • **Matches:** ${result.pickRate || "N/A"}`
      )
      .setThumbnail(getChampionImageUrl(version, result.championName))
      .addFields(
        {
          name: "📦 Core Items",
          value: itemsDisplay, // Keep text links as backup/accessible
          inline: false,
        },
        {
          name: "✨ Summoner Spells",
          value: `${spell1Name} + ${spell2Name}`,
          inline: true,
        },
        {
          name: "🔮 Runes",
          value: `Primary: ${primaryRuneName}\nSecondary: ${secondaryRuneName}`,
          inline: true,
        }
      )
      .setFooter({
        text: `${result.source || "Meta Build"} | LoL v${version}`,
      })
      .setTimestamp();

    if (attachment) {
      embed.setImage("attachment://build-summary.png");
    }

    await interaction.editReply({
      content: "",
      embeds: [embed],
      files: attachment ? [attachment] : [],
    });
  } catch (error) {
    console.error("[Build Command] Error:", error);

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
// CommandKit passes an object with { interaction, client, handler }
export const autocomplete = async (
  ctx: any // Untyped or specific CommandKit type
): Promise<void> => {
  const interaction = ctx.interaction as AutocompleteInteraction;

  try {
    // Check if options exists and has getFocused method
    if (
      !interaction.options ||
      typeof interaction.options.getFocused !== "function"
    ) {
      fs.appendFileSync(
        "debug_error.log",
        `[${new Date().toISOString()}] interaction.options invalid\n`
      );
      console.error(
        "[Autocomplete] interaction.options.getFocused is not available"
      );
      return;
    }

    // Get the focused option value
    const focusedValue = interaction.options.getFocused(false) as string;
    const query = (focusedValue || "").toLowerCase().trim();

    const championNames = await getAllChampionNames();

    // Filter champions that match the query
    const filtered = championNames
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 25); // Discord autocomplete limit is 25

    await interaction.respond(
      filtered.map((name) => ({
        name: name,
        value: name,
      }))
    );
  } catch (error) {
    fs.appendFileSync(
      "debug_error.log",
      `[${new Date().toISOString()}] Autocomplete caught error: ${error}\n`
    );
    console.error("[Autocomplete] Error:", error);
    // Return empty response on error
    try {
      await interaction.respond([]);
    } catch (respondError) {
      // Ignore if already responded
    }
  }
};

/** @type {import('commandkit').CommandOptions} */
export const options: CommandOptions = {
  // devOnly: true, // Uncomment for development testing
  // userPermissions: ['Administrator'], // Restrict if needed
  // botPermissions: ['SendMessages', 'EmbedLinks'],
};
