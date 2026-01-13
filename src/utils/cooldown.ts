/**
 * Command Cooldown System
 *
 * Prevents command spam by enforcing cooldowns per user
 */

interface CooldownEntry {
  userId: string;
  commandName: string;
  lastUsed: number;
}

class CooldownManager {
  private cooldowns: Map<string, CooldownEntry> = new Map();
  private defaultCooldown: number = 3000; // 3 seconds default

  /**
   * Get cooldown key for a user and command
   */
  private getKey(userId: string, commandName: string): string {
    return `${userId}:${commandName}`;
  }

  /**
   * Check if user is on cooldown
   * @param userId Discord user ID
   * @param commandName Command name
   * @param cooldownMs Cooldown in milliseconds (optional, uses default if not provided)
   * @returns Time remaining in milliseconds, or 0 if not on cooldown
   */
  isOnCooldown(
    userId: string,
    commandName: string,
    cooldownMs?: number
  ): number {
    const key = this.getKey(userId, commandName);
    const entry = this.cooldowns.get(key);

    if (!entry) {
      return 0; // Not on cooldown
    }

    const cooldown = cooldownMs || this.defaultCooldown;
    const timeSinceLastUse = Date.now() - entry.lastUsed;
    const timeRemaining = cooldown - timeSinceLastUse;

    if (timeRemaining <= 0) {
      // Cooldown expired, remove entry
      this.cooldowns.delete(key);
      return 0;
    }

    return timeRemaining;
  }

  /**
   * Set cooldown for a user and command
   */
  setCooldown(userId: string, commandName: string): void {
    const key = this.getKey(userId, commandName);
    this.cooldowns.set(key, {
      userId,
      commandName,
      lastUsed: Date.now(),
    });
  }

  /**
   * Clear cooldown for a user and command
   */
  clearCooldown(userId: string, commandName: string): void {
    const key = this.getKey(userId, commandName);
    this.cooldowns.delete(key);
  }

  /**
   * Clear all cooldowns for a user
   */
  clearUserCooldowns(userId: string): void {
    for (const [key, entry] of this.cooldowns.entries()) {
      if (entry.userId === userId) {
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Clean up expired cooldowns (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cooldowns.entries()) {
      const timeSinceLastUse = now - entry.lastUsed;
      if (timeSinceLastUse > this.defaultCooldown * 10) {
        // Remove entries older than 10x default cooldown
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Format time remaining as human-readable string
   */
  formatTimeRemaining(ms: number): string {
    if (ms < 1000) {
      return `${Math.ceil(ms)}ms`;
    }
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}วินาที`;
  }
}

// Export singleton instance
export const cooldownManager = new CooldownManager();

// Cleanup expired cooldowns every 5 minutes
setInterval(() => {
  cooldownManager.cleanup();
}, 5 * 60 * 1000);
