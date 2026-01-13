/**
 * Command Usage Statistics
 * 
 * Track command usage for analytics
 */

interface CommandStat {
  commandName: string;
  userId: string;
  guildId: string | null;
  timestamp: number;
  success: boolean;
  error?: string;
}

class CommandStatsTracker {
  private stats: CommandStat[] = [];
  private readonly MAX_STATS = 1000; // Keep last 1000 commands

  /**
   * Record a command usage
   */
  record(
    commandName: string,
    userId: string,
    guildId: string | null,
    success: boolean,
    error?: string
  ): void {
    this.stats.push({
      commandName,
      userId,
      guildId,
      timestamp: Date.now(),
      success,
      error,
    });

    // Keep only last MAX_STATS entries
    if (this.stats.length > this.MAX_STATS) {
      this.stats.shift();
    }
  }

  /**
   * Get command usage count
   */
  getUsageCount(commandName?: string, timeWindowMs?: number): number {
    const now = Date.now();
    const window = timeWindowMs || Infinity;

    return this.stats.filter((stat) => {
      const inWindow = now - stat.timestamp < window;
      const matchesCommand = !commandName || stat.commandName === commandName;
      return inWindow && matchesCommand;
    }).length;
  }

  /**
   * Get success rate
   */
  getSuccessRate(commandName?: string, timeWindowMs?: number): number {
    const now = Date.now();
    const window = timeWindowMs || Infinity;

    const relevant = this.stats.filter((stat) => {
      const inWindow = now - stat.timestamp < window;
      const matchesCommand = !commandName || stat.commandName === commandName;
      return inWindow && matchesCommand;
    });

    if (relevant.length === 0) return 0;

    const successful = relevant.filter((stat) => stat.success).length;
    return (successful / relevant.length) * 100;
  }

  /**
   * Get most used commands
   */
  getMostUsed(limit: number = 10): Array<{ command: string; count: number }> {
    const counts = new Map<string, number>();

    for (const stat of this.stats) {
      const current = counts.get(stat.commandName) || 0;
      counts.set(stat.commandName, current + 1);
    }

    return Array.from(counts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get all stats (for debugging/admin)
   */
  getAllStats(): CommandStat[] {
    return [...this.stats];
  }

  /**
   * Clear all stats
   */
  clear(): void {
    this.stats = [];
  }
}

// Export singleton instance
export const commandStats = new CommandStatsTracker();
