/**
 * Rate Limiter Utility
 * 
 * Prevents too many requests to external APIs/scrapers
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  /**
   * Check if a request is allowed
   * @param key Unique identifier for the rate limit (e.g., "mobalytics", "ddragon")
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );

    // Check if we've exceeded the limit
    if (validRequests.length >= this.config.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Get time until next request is allowed (in milliseconds)
   */
  getTimeUntilNext(key: string): number {
    const requests = this.requests.get(key) || [];
    const now = Date.now();
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );

    if (validRequests.length < this.config.maxRequests) {
      return 0;
    }

    // Get oldest request in window
    const oldestRequest = Math.min(...validRequests);
    return oldestRequest + this.config.windowMs - now;
  }

  /**
   * Clear rate limit for a key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }
}

// Pre-configured rate limiters for different services
export const mobalyticsLimiter = new RateLimiter({
  maxRequests: 10, // 10 requests
  windowMs: 60 * 1000, // per minute
});

export const ddragonLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 60 * 1000, // per minute
});

/**
 * Wait if rate limited
 */
export async function waitIfRateLimited(
  limiter: RateLimiter,
  key: string
): Promise<void> {
  if (!limiter.isAllowed(key)) {
    const waitTime = limiter.getTimeUntilNext(key);
    if (waitTime > 0) {
      console.log(`[RateLimiter] ⏳ Rate limited, waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}
