/**
 * /help Command
 * 
 * Shows available commands and bot information
 */

import { EmbedBuilder } from "discord.js";
import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";

export const data: CommandData = {
  name: "help",
  description: "แสดงคำสั่งทั้งหมดและข้อมูลบอท",
};

export const run = async ({ interaction, client }: SlashCommandProps) => {
  const embed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("📚 LoLBuildBot - คำสั่งทั้งหมด")
    .setDescription(
      "บอทสำหรับค้นหาข้อมูล Build และ Counter ของแชมเปี้ยนใน League of Legends"
    )
    .addFields(
      {
        name: "🎮 คำสั่ง LoL",
        value:
          "`/build [champion] [role]` - ค้นหา Item Build, Runes และ Spells\n" +
          "`/counter [champion]` - ดู Counter Matchups (ชนะ/แพ้ใคร)",
        inline: false,
      },
      {
        name: "⚙️ คำสั่งทั่วไป",
        value:
          "`/ping` - ตรวจสอบความเร็วในการตอบสนอง\n" +
          "`/help` - แสดงคำสั่งทั้งหมด\n" +
          "`/stats` - ดูสถิติการใช้งานบอท",
        inline: false,
      },
      {
        name: "📊 ข้อมูล",
        value:
          `**Servers:** ${client.guilds.cache.size}\n` +
          `**Uptime:** ${formatUptime(process.uptime())}\n` +
          `**Ping:** ${client.ws.ping}ms`,
        inline: true,
      },
      {
        name: "🔗 ลิงก์",
        value:
          "[GitHub](https://github.com) | [Support Server](https://discord.gg)",
        inline: true,
      }
    )
    .setFooter({
      text: `Requested by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}วัน ${hours}ชั่วโมง`;
  }
  if (hours > 0) {
    return `${hours}ชั่วโมง ${minutes}นาที`;
  }
  return `${minutes}นาที`;
}

export const options: CommandOptions = {};
