/**
 * Environment Configuration Validator
 *
 * Centralized environment variable validation and type-safe access
 */

interface EnvConfig {
  TOKEN: string;
  DEV_GUILD_IDS: string[];
  PORT: number;
  RIOT_API_KEY?: string;
  NODE_ENV: "development" | "production" | "test";
  DEBUG?: boolean;
}

class EnvValidator {
  private config: Partial<EnvConfig> = {};

  /**
   * Validate and load environment variables
   */
  validate(): EnvConfig {
    const errors: string[] = [];

    // Required: TOKEN
    const token = process.env.TOKEN;
    if (!token || typeof token !== "string" || token.trim() === "") {
      errors.push("TOKEN is required and must be a non-empty string");
    } else {
      this.config.TOKEN = token;
    }

    // Optional: DEV_GUILD_IDS
    const devGuildIds =
      process.env.DEV_GUILD_IDS || process.env.DEV_GUILD_ID || "";
    this.config.DEV_GUILD_IDS = devGuildIds
      ? devGuildIds
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== "")
      : [];

    // Optional: PORT
    const port = process.env.PORT;
    if (port) {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push(`PORT must be a number between 1 and 65535, got: ${port}`);
      } else {
        this.config.PORT = portNum;
      }
    } else {
      this.config.PORT = 8080; // Default
    }

    // Optional: RIOT_API_KEY
    this.config.RIOT_API_KEY = process.env.RIOT_API_KEY;

    // NODE_ENV
    const nodeEnv = (process.env.NODE_ENV ||
      "development") as EnvConfig["NODE_ENV"];
    if (!["development", "production", "test"].includes(nodeEnv)) {
      errors.push(`NODE_ENV must be one of: development, production, test`);
    } else {
      this.config.NODE_ENV = nodeEnv;
    }

    // DEBUG
    this.config.DEBUG = process.env.DEBUG === "true";

    if (errors.length > 0) {
      throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
    }

    return this.config as EnvConfig;
  }

  /**
   * Get validated config (throws if not validated)
   */
  getConfig(): EnvConfig {
    if (!this.config.TOKEN) {
      throw new Error("Environment not validated. Call validate() first.");
    }
    return this.config as EnvConfig;
  }
}

// Export singleton instance
export const envValidator = new EnvValidator();

// Export type
export type { EnvConfig };
