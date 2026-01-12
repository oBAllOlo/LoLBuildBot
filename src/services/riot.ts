/**
 * Riot API Service Layer
 *
 * Handles all interactions with Riot Games API
 * - League-V4: Get Challenger players
 * - Match-V5: Get match history and details
 */

import axios, { AxiosError } from "axios";
import {
  ChallengerLeagueResponse,
  MatchResponse,
  ChallengerBuildResult,
  ChallengerBuildResponse,
  REGIONS,
  PlatformRegion,
  RoutingRegion,
} from "../types/riot.js";

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Number of players to sample from Challenger ladder
const SAMPLE_SIZE = 10;

// Number of recent matches to check per player
const MATCHES_TO_CHECK = 20;

/**
 * Make a request to Riot API with proper headers
 */
async function riotRequest<T>(url: string): Promise<T> {
  if (!RIOT_API_KEY) {
    throw new Error("RIOT_API_KEY is not set in environment variables");
  }

  try {
    const response = await axios.get<T>(url, {
      headers: {
        "X-Riot-Token": RIOT_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 403) {
        throw new Error("Invalid or expired Riot API Key");
      }
      if (error.response?.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (error.response?.status === 404) {
        throw new Error("Resource not found");
      }
    }
    throw error;
  }
}

/**
 * Get Challenger League players from a specific region
 */
async function getChallengerPlayers(
  platform: PlatformRegion
): Promise<ChallengerLeagueResponse> {
  const url = `https://${platform}.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`;
  return riotRequest<ChallengerLeagueResponse>(url);
}

/**
 * Get match history for a player by PUUID
 */
async function getMatchHistory(
  routing: RoutingRegion,
  puuid: string,
  count: number = 20
): Promise<string[]> {
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&count=${count}`;
  return riotRequest<string[]>(url);
}

/**
 * Get detailed match information
 */
async function getMatchDetails(
  routing: RoutingRegion,
  matchId: string
): Promise<MatchResponse> {
  const url = `https://${routing}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  return riotRequest<MatchResponse>(url);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Normalize champion name for matching
 * Handles cases like "Lee Sin" -> "leesin", "Kai'Sa" -> "kaisa"
 */
function normalizeChampionName(name: string): string {
  return name.toLowerCase().replace(/['\s]/g, "");
}

/**
 * Main function: Get a Challenger player's build for a specific champion
 *
 * Logic:
 * 1. Fetch Challenger ladder from the specified region
 * 2. Randomly sample players to diversify results
 * 3. For each player, check their recent match history (using PUUID directly)
 * 4. Find a match where they played the specified champion
 * 5. Extract and return build information
 */
export async function getChallengerBuild(
  championName: string,
  regionKey: string = "KR"
): Promise<ChallengerBuildResponse> {
  // Validate region
  const regionConfig = REGIONS[regionKey.toUpperCase()];
  if (!regionConfig) {
    return {
      success: false,
      error: `Invalid region: ${regionKey}. Valid regions: ${Object.keys(
        REGIONS
      ).join(", ")}`,
    };
  }

  const { platform, routing, displayName } = regionConfig;
  const normalizedChampion = normalizeChampionName(championName);

  try {
    // Step 1: Get Challenger players
    console.log(`[RiotAPI] Fetching Challenger ladder from ${displayName}...`);
    const challengerLeague = await getChallengerPlayers(platform);

    if (!challengerLeague.entries || challengerLeague.entries.length === 0) {
      return {
        success: false,
        error: `No Challenger players found in ${displayName}`,
        region: regionKey,
      };
    }

    // Step 2: Randomly sample players
    const sampledPlayers = shuffleArray(challengerLeague.entries).slice(
      0,
      SAMPLE_SIZE
    );
    console.log(`[RiotAPI] Sampled ${sampledPlayers.length} players to check`);

    // Step 3: Search through players' match histories
    for (const player of sampledPlayers) {
      try {
        // Use PUUID directly from LeagueEntry
        const puuid = player.puuid;

        // Fallback identifier for logging using PUUID
        const identifier =
          player.summonerName ||
          (puuid ? `${puuid.substring(0, 8)}...` : "Unknown");
        console.log(`[RiotAPI] Checking player: ${identifier}`);

        if (!puuid) {
          console.error("[RiotAPI] Player missing puuid:", player);
          continue;
        }

        // Get match history using PUUID directly
        const matchIds = await getMatchHistory(
          routing,
          puuid,
          MATCHES_TO_CHECK
        );

        if (matchIds.length === 0) {
          continue; // No matches found
        }

        // Step 4: Check each match for the champion
        for (const matchId of matchIds) {
          try {
            const match = await getMatchDetails(routing, matchId);

            // Find the participant (our Challenger player)
            // Match API participants use PUUID, so we can compare directly
            const participant = match.info.participants.find(
              (p) => p.puuid === puuid
            );

            if (!participant) continue;

            // Check if they played the requested champion
            const participantChampion = normalizeChampionName(
              participant.championName
            );

            if (participantChampion === normalizedChampion) {
              console.log(
                `[RiotAPI] Found match! ${participant.riotIdGameName} playing ${participant.championName}`
              );

              // Extract rune information
              const primaryStyle = participant.perks.styles[0];
              const secondaryStyle = participant.perks.styles[1];

              // Step 5: Build and return result
              const result: ChallengerBuildResult = {
                success: true,
                playerName:
                  participant.riotIdGameName ||
                  player.summonerName ||
                  "Unknown",
                riotId: `${participant.riotIdGameName}#${participant.riotIdTagline}`,
                region: regionKey,
                championName: participant.championName,
                championId: participant.championId,
                items: [
                  participant.item0,
                  participant.item1,
                  participant.item2,
                  participant.item3,
                  participant.item4,
                  participant.item5,
                  participant.item6, // Trinket
                ].filter((id) => id !== 0),
                runes: {
                  primaryStyle: primaryStyle.style,
                  primarySelections: primaryStyle.selections.map((s) => s.perk),
                  secondaryStyle: secondaryStyle.style,
                  secondarySelections: secondaryStyle.selections.map(
                    (s) => s.perk
                  ),
                  statPerks: participant.perks.statPerks,
                },
                summonerSpells: {
                  spell1: participant.summoner1Id,
                  spell2: participant.summoner2Id,
                },
                kda: {
                  kills: participant.kills,
                  deaths: participant.deaths,
                  assists: participant.assists,
                  ratio:
                    participant.deaths === 0
                      ? "Perfect"
                      : (
                          (participant.kills + participant.assists) /
                          participant.deaths
                        ).toFixed(2),
                },
                win: participant.win,
                gameMode: match.info.gameMode,
                gameDuration: Math.floor(match.info.gameDuration / 60), // Convert to minutes
              };

              return result;
            }
          } catch (matchError) {
            console.error(
              `[RiotAPI] Error fetching match ${matchId}:`,
              matchError
            );
            continue;
          }
        }
      } catch (playerError) {
        console.error(`[RiotAPI] Error checking player:`, playerError);
        continue;
      }
    }

    // If we've checked all sampled players and found nothing
    return {
      success: false,
      error: `Could not find a recent ${championName} game from Challenger players in ${displayName}. Try a different region or a more popular champion.`,
      region: regionKey,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      success: false,
      error: message,
      region: regionKey,
    };
  }
}

/**
 * Search all regions for a Challenger build
 */
export async function getChallengerBuildAllRegions(
  championName: string
): Promise<ChallengerBuildResponse> {
  const regionKeys = Object.keys(REGIONS);

  for (const regionKey of regionKeys) {
    console.log(`[RiotAPI] Searching ${regionKey}...`);
    const result = await getChallengerBuild(championName, regionKey);

    if (result.success) {
      return result;
    }
  }

  return {
    success: false,
    error: `Could not find a recent ${championName} game from any Challenger player across all regions.`,
  };
}

/**
 * Get list of available regions
 */
export function getAvailableRegions(): string[] {
  return Object.keys(REGIONS);
}

/**
 * Get region display name
 */
export function getRegionDisplayName(regionKey: string): string {
  return REGIONS[regionKey.toUpperCase()]?.displayName || regionKey;
}
