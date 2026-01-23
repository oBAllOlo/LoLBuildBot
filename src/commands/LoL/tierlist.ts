/**
 * /tier-list Command
 *
 * Displays the current meta tier list for ALL roles
 */

import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";
import { fetchTierList } from "../../services/tierlist.js";
import { getLatestVersion } from "../../utils/ddragon.js";
import { generateTierListImage } from "../../services/image-gen.js";
import { canRunInGuild, isDevelopment } from "../../utils/env.js";

export const data: CommandData = {
  name: "tier-list",
  description: "แสดง Tier List ของ Meta ปัจจุบัน (ทุกตำแหน่ง)",
  options: [],
};

// Tier colors and emojis
const TIER_CONFIG: Record<string, { color: number; emoji: string }> = {
  "S+": { color: 0xff6b6b, emoji: "👑" },
  S: { color: 0xffa502, emoji: "🔥" },
  A: { color: 0x2ed573, emoji: "✨" },
  B: { color: 0x1e90ff, emoji: "⭐" },
};

export const run = async ({ interaction }: SlashCommandProps) => {
  if (!canRunInGuild(interaction.guildId)) {
    if (isDevelopment()) {
      try {
        await interaction.reply({
          content: "⚠️ Bot is in development mode.",
          ephemeral: true,
        });
      } catch {}
      return;
    }
  }

  try {
    await interaction.deferReply();
  } catch {
    return;
  }

  try {
    const version = await getLatestVersion();

    await interaction.editReply({
      content: `📊 กำลังดึงข้อมูล Tier List สำหรับทุกตำแหน่ง... (0/5)`,
    });

    // Fetch tier list for ALL roles
    const roles = ["top", "jungle", "mid", "adc", "support"];
    const allRolesData: Record<string, { name: string; tier: string }[]> = {};

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      await interaction.editReply({
        content: `📊 กำลังดึงข้อมูล ${role.toUpperCase()}... (${i + 1}/5)`,
      });

      const tierData = await fetchTierList(role);
      const roleName = role.charAt(0).toUpperCase() + role.slice(1);

      if (tierData.success && tierData.champions.length > 0) {
        allRolesData[roleName] = tierData.champions;
      }
    }

    if (Object.keys(allRolesData).length === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle("❌ ไม่พบข้อมูล")
        .setDescription("ไม่สามารถดึงข้อมูล Tier List ได้")
        .setTimestamp();

      await interaction.editReply({ content: "", embeds: [errorEmbed] });
      return;
    }

    // Create summary embed
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`📊 Tier List - All Roles`)
      .setDescription(`Meta ปัจจุบัน (S+ และ S Tier) สำหรับทุกตำแหน่ง`)
      .setFooter({ text: `Mobalytics | LoL v${version}` })
      .setTimestamp();

    // Add summary for each role
    const roleEmojis: Record<string, string> = {
      Top: "🗡️",
      Jungle: "🌲",
      Mid: "🔮",
      Adc: "🏹",
      Support: "🛡️",
    };

    for (const [role, champs] of Object.entries(allRolesData)) {
      const topChamps = champs
        .filter((c) => c.tier === "S+" || c.tier === "S")
        .slice(0, 8);
      if (topChamps.length > 0) {
        embed.addFields({
          name: `${roleEmojis[role] || "📌"} ${role}`,
          value: topChamps
            .map((c) => `${c.tier === "S+" ? "👑" : "🔥"} ${c.name}`)
            .join(", "),
          inline: false,
        });
      }
    }

    // Generate tier list image
    await interaction.editReply({ content: `🎨 กำลังสร้างรูป Tier List...` });
    const tierListImage = await generateTierListImage(allRolesData, version);

    if (tierListImage) {
      embed.setImage("attachment://tier-list.png");
    }

    await interaction.editReply({
      content: "",
      embeds: [embed],
      files: tierListImage ? [tierListImage] : [],
    });
  } catch (error) {
    console.error("[TierList Command] Error:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: "❌ เกิดข้อผิดพลาดในการดึงข้อมูล",
      });
    }
  }
};

export const options: CommandOptions = {};
