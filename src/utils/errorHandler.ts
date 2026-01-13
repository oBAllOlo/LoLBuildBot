/**
 * Error Handler Utility
 *
 * Centralized error handling with better error messages
 */

import { EmbedBuilder } from "discord.js";
import { logger } from "./logger.js";

export class BotError extends Error {
  constructor(
    message: string,
    public userMessage?: string,
    public code?: string
  ) {
    super(message);
    this.name = "BotError";
  }
}

/**
 * Create user-friendly error embed
 */
export function createErrorEmbed(
  title: string,
  description: string,
  footer?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();

  if (footer) {
    embed.setFooter({ text: footer });
  }

  return embed;
}

/**
 * Handle command errors
 */
export async function handleCommandError(
  error: unknown,
  commandName: string,
  userId?: string
): Promise<EmbedBuilder> {
  // Log error
  logger.error(`[${commandName}] Command error`, {
    error,
    userId,
    commandName,
  });

  // Handle known error types
  if (error instanceof BotError) {
    return createErrorEmbed(
      "เกิดข้อผิดพลาด",
      error.userMessage || error.message,
      "ลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ"
    );
  }

  if (error instanceof Error) {
    // Network errors
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("timeout")
    ) {
      return createErrorEmbed(
        "ไม่สามารถเชื่อมต่อได้",
        "เซิร์ฟเวอร์ภายนอกไม่ตอบสนอง กรุณาลองใหม่อีกครั้งในภายหลัง",
        "Network Error"
      );
    }

    // Rate limit errors
    if (error.message.includes("rate limit") || error.message.includes("429")) {
      return createErrorEmbed(
        "คำขอมากเกินไป",
        "กรุณารอสักครู่ก่อนลองอีกครั้ง",
        "Rate Limited"
      );
    }

    // Generic error
    return createErrorEmbed(
      "เกิดข้อผิดพลาด",
      "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง",
      error.message.length > 100
        ? error.message.substring(0, 100)
        : error.message
    );
  }

  // Unknown error
  return createErrorEmbed(
    "เกิดข้อผิดพลาด",
    "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง",
    "Unknown Error"
  );
}

/**
 * Safe async wrapper for commands
 */
export function safeAsync<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => T
): Promise<T> {
  return fn().catch((error) => {
    if (errorHandler) {
      return errorHandler(error);
    }
    throw error;
  });
}
