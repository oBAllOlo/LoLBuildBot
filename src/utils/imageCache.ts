/**
 * Image Cache Utility
 * 
 * Caches generated build images to avoid regenerating the same image
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import crypto from "crypto";

const CACHE_DIR = join(process.cwd(), "data", "cache", "images");

// Ensure cache directory exists
try {
  mkdirSync(CACHE_DIR, { recursive: true });
} catch (error) {
  // Directory might already exist
}

interface CacheEntry {
  championName: string;
  role: string;
  version: string;
  buildHash: string;
}

/**
 * Generate a hash from build data for cache key
 */
function generateBuildHash(buildData: any): string {
  const data = JSON.stringify({
    items: buildData.coreItems || [],
    runes: buildData.runesPrimary || 0,
    perks: buildData.perks || [],
    spells: [buildData.summonerSpell1, buildData.summonerSpell2],
  });

  return crypto.createHash("md5").update(data).digest("hex");
}

/**
 * Get cache file path
 */
function getCachePath(key: string): string {
  return join(CACHE_DIR, `${key}.png`);
}

/**
 * Check if cached image exists
 */
export function hasCachedImage(
  championName: string,
  role: string,
  version: string,
  buildData: any
): string | null {
  const buildHash = generateBuildHash(buildData);
  const cacheKey = `${championName}-${role}-${version}-${buildHash}`;
  const cachePath = getCachePath(cacheKey);

  if (existsSync(cachePath)) {
    return cachePath;
  }

  return null;
}

/**
 * Save image to cache
 */
export function saveImageToCache(
  championName: string,
  role: string,
  version: string,
  buildData: any,
  imageBuffer: Buffer
): void {
  try {
    const buildHash = generateBuildHash(buildData);
    const cacheKey = `${championName}-${role}-${version}-${buildHash}`;
    const cachePath = getCachePath(cacheKey);

    writeFileSync(cachePath, imageBuffer);
    console.log(`[ImageCache] 💾 Cached image: ${cacheKey}`);
  } catch (error) {
    console.error("[ImageCache] Failed to save cache:", error);
  }
}

/**
 * Clean old cache files (older than 7 days)
 */
export function cleanOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
  try {
    const { readdirSync, statSync, unlinkSync } = require("fs");
    const files = readdirSync(CACHE_DIR);

    let cleaned = 0;
    const now = Date.now();

    for (const file of files) {
      if (!file.endsWith(".png")) continue;

      const filePath = join(CACHE_DIR, file);
      const stats = statSync(filePath);

      if (now - stats.mtimeMs > maxAgeMs) {
        unlinkSync(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[ImageCache] 🧹 Cleaned ${cleaned} old cache files`);
    }
  } catch (error) {
    console.error("[ImageCache] Failed to clean cache:", error);
  }
}
