/**
 * Logger Utility
 * 
 * Centralized logging with different log levels
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      return `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage("info", message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage("warn", message, data));
  }

  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;
    console.error(this.formatMessage("error", message, errorData));
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG === "true") {
      console.debug(this.formatMessage("debug", message, data));
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances if needed
export { Logger };
