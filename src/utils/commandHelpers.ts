/**
 * Command Helper Utilities
 * 
 * Common utilities for commands (cooldown, validation, error handling)
 */

import {
  EmbedBuilder,
  SlashCommandProps,
} from "discord.js";
import { cooldownManager } from "./cooldown.js";
import { validateChampionName } from "./validators.js";
import { handleCommandError, createErrorEmbed } from "./errorHandler.js";
import { commandStats } from "./commandStats.js";

/**
 * Check cooldown and return error embed if on cooldown
 */
export async function checkCooldown(
  userId: string,
  commandName: string,
  cooldownMs: number = 3000
): Promise<EmbedBuilder | null> {
  const timeRemaining = cooldownManager.isOnCooldown(
    userId,
    commandName,
    cooldownMs
  );

  if (timeRemaining > 0) {
    return createErrorEmbed(
      "กรุณารอสักครู่",
      `คุณใช้คำสั่งเร็วเกินไป กรุณารออีก **${cooldownManager.formatTimeRemaining(timeRemaining)}**`,
      "Cooldown"
    );
  }

  // Set cooldown
  cooldownManager.setCooldown(userId, commandName);
  return null;
}

/**
 * Validate champion name and return error embed if invalid
 */
export async function validateChampionInput(
  championName: string
): Promise<{ valid: boolean; normalized?: string; errorEmbed?: EmbedBuilder }> {
  const validation = await validateChampionName(championName);

  if (validation.valid && validation.normalized) {
    return { valid: true, normalized: validation.normalized };
  }

  let errorMessage = `ไม่พบแชมเปี้ยน **${championName}**`;

  if (validation.suggestions && validation.suggestions.length > 0) {
    errorMessage += `\n\n**คำแนะนำ:**\n${validation.suggestions
      .map((name) => `• ${name}`)
      .join("\n")}`;
  }

  return {
    valid: false,
    errorEmbed: createErrorEmbed(
      "ไม่พบแชมเปี้ยน",
      errorMessage,
      "ลองตรวจสอบชื่อแชมเปี้ยนอีกครั้ง"
    ),
  };
}

/**
 * Wrapper for command execution with error handling and stats tracking
 */
export async function executeCommand<T>(
  commandName: string,
  interaction: SlashCommandProps["interaction"],
  fn: () => Promise<T>
): Promise<T | null> {
  const userId = interaction.user.id;
  const guildId = interaction.guildId;

  try {
    const result = await fn();
    commandStats.record(commandName, userId, guildId, true);
    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    commandStats.record(commandName, userId, guildId, false, errorMessage);

    const errorEmbed = await handleCommandError(
      error,
      commandName,
      userId
    );

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    } catch (replyError) {
      // Ignore reply errors (already replied, etc.)
      console.error("Failed to send error message:", replyError);
    }

    return null;
  }
}
