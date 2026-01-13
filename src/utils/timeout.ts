/**
 * Interaction Timeout Handler
 * 
 * Handles interaction timeouts and provides better error messages
 */

import { Interaction } from "discord.js";
import { logger } from "./logger.js";

/**
 * Set a timeout for interaction handling
 * If interaction takes too long, send a timeout message
 */
export async function withTimeout<T>(
  interaction: Interaction,
  timeoutMs: number,
  fn: () => Promise<T>
): Promise<T | null> {
  const timeout = setTimeout(async () => {
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: "⏱️ คำสั่งใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง",
          ephemeral: true,
        });
      } catch (error) {
        logger.error("Failed to send timeout message", error);
      }
    }
  }, timeoutMs);

  try {
    const result = await fn();
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Check if interaction is still valid (not expired)
 */
export function isInteractionValid(interaction: Interaction): boolean {
  // Discord interactions expire after 3 seconds if not acknowledged
  // But we defer reply, so we have 15 minutes
  const maxAge = 15 * 60 * 1000; // 15 minutes
  const age = Date.now() - interaction.createdTimestamp;
  return age < maxAge;
}
