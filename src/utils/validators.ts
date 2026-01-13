/**
 * Input Validation Utilities
 *
 * Validates user input for commands
 */

import { getAllChampionNames } from "./ddragon.js";

/**
 * Normalize champion name for matching
 * Handles special characters and case insensitivity
 */
export function normalizeChampionName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['\s-]/g, "")
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u");
}

/**
 * Validate champion name
 * @param championName Input champion name
 * @param availableNames List of valid champion names
 * @returns Normalized champion name if valid, null otherwise
 */
export async function validateChampionName(
  championName: string
): Promise<{ valid: boolean; normalized?: string; suggestions?: string[] }> {
  if (!championName || typeof championName !== "string") {
    return { valid: false };
  }

  const normalized = normalizeChampionName(championName);
  const availableNames = await getAllChampionNames();

  // Exact match (case-insensitive, ignoring special chars)
  const exactMatch = availableNames.find(
    (name) => normalizeChampionName(name) === normalized
  );

  if (exactMatch) {
    return { valid: true, normalized: exactMatch };
  }

  // Fuzzy match - find similar names
  const suggestions = availableNames
    .filter((name) => {
      const nameNormalized = normalizeChampionName(name);
      return (
        nameNormalized.includes(normalized) ||
        normalized.includes(nameNormalized)
      );
    })
    .slice(0, 5); // Top 5 suggestions

  return {
    valid: false,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Validate role name
 */
export function validateRole(role: string): boolean {
  const validRoles = [
    "top",
    "jungle",
    "middle",
    "mid",
    "adc",
    "bot",
    "support",
    "sup",
  ];
  return validRoles.includes(role.toLowerCase());
}

/**
 * Sanitize user input (prevent injection, etc.)
 */
export function sanitizeInput(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  return input.trim().slice(0, maxLength).replace(/[<>]/g, ""); // Remove potential HTML tags
}
