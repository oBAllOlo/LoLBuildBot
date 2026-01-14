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
        
        // If image generation failed (returned null), it might mean champion doesn't exist
        if (!attachment) {
          console.warn(`[Build Command] ⚠️  Image generation failed for ${champion} - might be invalid champion or missing data`);
        }
      }
    } catch (e) {
      console.error("[Build Command] Failed to generate image:", e);
      // Check if it's a 403/404 error
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (errorMsg.includes("403") || errorMsg.includes("404") || errorMsg.includes("rejected")) {
        // This might mean champion doesn't exist
        const errorEmbed = new EmbedBuilder()
          .setColor(0xff4444)
          .setTitle("❌ ไม่พบข้อมูล Build")
          .setDescription(
            `ไม่พบข้อมูล Build สำหรับ **${champion}**${role ? ` (${role})` : ""}\n\n` +
            `**สาเหตุที่เป็นไปได้:**\n` +
            `• ชื่อ Champion ไม่ถูกต้อง\n` +
            `• ไม่มีข้อมูล Build สำหรับตำแหน่งนี้\n` +
            `• ข้อมูลยังไม่พร้อมใช้งาน\n\n` +
            `ลองตรวจสอบชื่อ Champion หรือลองตำแหน่งอื่น`
          )
          .setFooter({ text: "LoL Build Bot" })
          .setTimestamp();
        
        await interaction.editReply({ content: "", embeds: [errorEmbed] });
        return;
      }
    }

    // Validate champion name and version
    if (!result.championName) {
      throw new Error("Champion name is missing from result");
    }
    if (!version) {
      throw new Error("Game version is missing");
    }

    // Build Mobalytics URL (sanitize champion name)
    const championNameForUrl = result.championName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const rolePath = result.gameMode && result.gameMode !== "Popular"
      ? "/" + result.gameMode.toLowerCase().replace("middle", "mid").replace("bot", "adc")
      : "";
    const mobalyticsUrl = `https://mobalytics.gg/lol/champions/${championNameForUrl}/build${rolePath}`;

    // Get champion image URL (with validation)
    const championImageUrl = getChampionImageUrl(version, result.championName);
    
    // Validate URLs before setting
    if (!championImageUrl) {
      console.warn(`[Build Command] ⚠️  Invalid champion image URL for ${result.championName} (version: ${version})`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`📊 ${result.championName} Build`)
      .setDescription(
        `**Role:** ${result.gameMode || "N/A"}\n**Win Rate:** ${
          result.winRate || "N/A"
        } • **Matches:** ${result.pickRate || "N/A"}`
      );

    // Only set URL if valid
    if (mobalyticsUrl && mobalyticsUrl.startsWith("http")) {
      embed.setURL(mobalyticsUrl);
    } else {
      console.warn(`[Build Command] ⚠️  Invalid Mobalytics URL: ${mobalyticsUrl}`);
    }

    // Only set thumbnail if valid URL
    if (championImageUrl && championImageUrl.startsWith("http")) {
      embed.setThumbnail(championImageUrl);
    } else {
      console.warn(`[Build Command] ⚠️  Skipping thumbnail due to invalid URL`);
    }

    embed.addFields(
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
          setTimeout(() => reject(new Error("Timeout")), 5000)
        ),
      ]);
    } catch (fetchError) {
      console.error("[Build Autocomplete] Failed to fetch champion names:", fetchError);
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
      a.localeCompare(b, 'en', { sensitivity: 'base' })
    );

    // Filter champions that match the query
    // If query is empty, show first 25 champions (alphabetically sorted)
    let filtered: string[];
    if (query.length === 0) {
      // Show first 25 champions when no query (sorted alphabetically)
      filtered = sortedChampions.slice(0, 25);
      console.log(`[Build Autocomplete] Showing first 25 champions (sorted alphabetically, total: ${championNames.length})`);
    } else {
      // Filter by query (also sorted alphabetically)
      filtered = sortedChampions
        .filter((name) => name.toLowerCase().includes(query))
        .slice(0, 25); // Discord autocomplete limit is 25
      console.log(`[Build Autocomplete] Filtered ${championNames.length} champions to ${filtered.length} matches for query "${query}"`);
    }


    // Double check before responding
    if (!interaction.responded) {
      const choices = filtered.map((name) => ({
        name: name,
        value: name,
      }));
      
      await interaction.respond(choices);
      console.log(`[Build Autocomplete] Responded with ${choices.length} choices`);
    }
  } catch (error: any) {
    // Only log if it's not the "already acknowledged" error
    if (error?.code !== 40060 && error?.message !== "The reply to this interaction has already been sent or deferred.") {
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
