/**
 * /stats Command
 * 
 * Shows bot usage statistics
 */

import { EmbedBuilder } from "discord.js";
import type {
  SlashCommandProps,
  CommandOptions,
  CommandData,
} from "commandkit";
import { commandStats } from "../../utils/commandStats.js";

export const data: CommandData = {
  name: "stats",
  description: "ดูสถิติการใช้งานบอท",
};

export const run = async ({ interaction, client }: SlashCommandProps) => {
  const totalCommands = commandStats.getUsageCount();
  const successRate = commandStats.getSuccessRate();
  const mostUsed = commandStats.getMostUsed(5);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 สถิติการใช้งานบอท")
    .addFields(
      {
        name: "📈 สถิติโดยรวม",
        value:
          `**คำสั่งทั้งหมด:** ${totalCommands}\n` +
          `**อัตราสำเร็จ:** ${successRate.toFixed(1)}%\n` +
          `**Servers:** ${client.guilds.cache.size}\n` +
          `**Users:** ${client.users.cache.size}`,
        inline: false,
      },
      {
        name: "🔥 คำสั่งยอดนิยม",
        value:
          mostUsed.length > 0
            ? mostUsed
                .map((cmd, i) => `**${i + 1}.** \`/${cmd.command}\` - ${cmd.count} ครั้ง`)
                .join("\n")
            : "ยังไม่มีข้อมูล",
        inline: false,
      },
      {
        name: "⚙️ ระบบ",
        value:
          `**Uptime:** ${formatUptime(process.uptime())}\n` +
          `**Memory:** ${formatMemory(process.memoryUsage().heapUsed)}\n` +
          `**Node.js:** ${process.version}`,
        inline: false,
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

function formatMemory(bytes: number): string {
  const mb = (bytes / 1024 / 1024).toFixed(2);
  return `${mb} MB`;
}

export const options: CommandOptions = {};
