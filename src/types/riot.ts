/**
 * TypeScript interfaces for Riot API responses
 */

// ===========================
// League-V4 API Types
// ===========================

export interface LeagueEntry {
  puuid: string;
  summonerId?: string;
  summonerName?: string;
  leaguePoints: number;
  rank: string;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface ChallengerLeagueResponse {
  tier: string;
  leagueId: string;
  queue: string;
  name: string;
  entries: LeagueEntry[];
}

// ===========================
// Summoner-V4 API Types
// ===========================

export interface SummonerResponse {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

// ===========================
// Match-V5 API Types
// ===========================

export interface MatchMetadata {
  dataVersion: string;
  matchId: string;
  participants: string[]; // PUUIDs
}

export interface Participant {
  puuid: string;
  summonerId: string;
  summonerName: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  teamId: number;
  win: boolean;

  // KDA
  kills: number;
  deaths: number;
  assists: number;

  // Items (0-6 = slots, 6 = trinket)
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;

  // Runes
  perks: {
    statPerks: {
      defense: number;
      flex: number;
      offense: number;
    };
    styles: Array<{
      description: string;
      selections: Array<{
        perk: number;
        var1: number;
        var2: number;
        var3: number;
      }>;
      style: number;
    }>;
  };

  // Summoner Spells
  summoner1Id: number;
  summoner2Id: number;
}

export interface MatchInfo {
  gameCreation: number;
  gameDuration: number;
  gameEndTimestamp: number;
  gameId: number;
  gameMode: string;
  gameName: string;
  gameStartTimestamp: number;
  gameType: string;
  gameVersion: string;
  mapId: number;
  participants: Participant[];
  platformId: string;
  queueId: number;
  teams: Array<{
    teamId: number;
    win: boolean;
  }>;
  tournamentCode: string;
}

export interface MatchResponse {
  metadata: MatchMetadata;
  info: MatchInfo;
}

// ===========================
// Custom Result Types
// ===========================

export interface ChallengerBuildResult {
  success: true;
  playerName: string;
  riotId: string;
  region: string;
  championName: string;
  championId: number;
  items: number[];
  earlyItems?: number[]; // Added for Mobalytics alignment
  runes: {
    primaryStyle: number;
    primarySelections: number[];
    secondaryStyle: number;
    secondarySelections: number[];
    statPerks: {
      offense: number;
      flex: number;
      defense: number;
    };
  };
  summonerSpells: {
    spell1: number;
    spell2: number;
  };
  kda: {
    kills: number;
    deaths: number;
    assists: number;
    ratio: string;
  };
  win: boolean;
  gameMode: string;
  gameDuration: number;
  // Optional fields for static build data
  winRate?: string;
  pickRate?: string;
  source?: string;
  buildData?: any; // Contains full static build info (starting items, etc.)
  perks?: number[]; // Detailed rune selections
}

export interface ChallengerBuildError {
  success: false;
  error: string;
  region?: string;
}

export type ChallengerBuildResponse =
  | ChallengerBuildResult
  | ChallengerBuildError;

// ===========================
// Region Configuration
// ===========================

export type PlatformRegion =
  | "br1" // Brazil
  | "eun1" // EU Nordic & East
  | "euw1" // EU West
  | "jp1" // Japan
  | "kr" // Korea
  | "la1" // Latin America North
  | "la2" // Latin America South
  | "na1" // North America
  | "oc1" // Oceania
  | "ph2" // Philippines
  | "ru" // Russia
  | "sg2" // Singapore
  | "th2" // Thailand
  | "tr1" // Turkey
  | "tw2" // Taiwan
  | "vn2"; // Vietnam

export type RoutingRegion = "americas" | "asia" | "europe" | "sea";

export interface RegionConfig {
  platform: PlatformRegion;
  routing: RoutingRegion;
  displayName: string;
}

export const REGIONS: Record<string, RegionConfig> = {
  NA: { platform: "na1", routing: "americas", displayName: "North America" },
  EUW: { platform: "euw1", routing: "europe", displayName: "EU West" },
  EUNE: {
    platform: "eun1",
    routing: "europe",
    displayName: "EU Nordic & East",
  },
  KR: { platform: "kr", routing: "asia", displayName: "Korea" },
  JP: { platform: "jp1", routing: "asia", displayName: "Japan" },
  BR: { platform: "br1", routing: "americas", displayName: "Brazil" },
  LAN: {
    platform: "la1",
    routing: "americas",
    displayName: "Latin America North",
  },
  LAS: {
    platform: "la2",
    routing: "americas",
    displayName: "Latin America South",
  },
  OCE: { platform: "oc1", routing: "sea", displayName: "Oceania" },
  TR: { platform: "tr1", routing: "europe", displayName: "Turkey" },
  RU: { platform: "ru", routing: "europe", displayName: "Russia" },
  PH: { platform: "ph2", routing: "sea", displayName: "Philippines" },
  SG: { platform: "sg2", routing: "sea", displayName: "Singapore" },
  TH: { platform: "th2", routing: "sea", displayName: "Thailand" },
  TW: { platform: "tw2", routing: "sea", displayName: "Taiwan" },
  VN: { platform: "vn2", routing: "sea", displayName: "Vietnam" },
};
