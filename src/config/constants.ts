export const AUCTION_TIMER_SECONDS = 8;
export const BID_TIMER_SECONDS = 5;
export const STARTING_BUDGET = 50;
export const MIN_BID_RESERVE_PER_SLOT = 1;
export const SQUAD_SIZE = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const POT_SIZE = 14;

export const CORE_POSITIONS = ["GK", "DEF", "MID", "FW"] as const;
export const FLEX_POSITIONS = ["DEF", "MID", "FW"] as const;
export const ALL_POSITIONS = ["GK", "DEF", "MID", "FW", "MGR"] as const;

export type CorePosition = (typeof CORE_POSITIONS)[number];
export type Position = (typeof ALL_POSITIONS)[number];

export const POSITION_COLORS: Record<Position, number> = {
  FW: 0xef4444, // Red
  MID: 0x22c55e, // Green
  DEF: 0x3b82f6, // Blue
  GK: 0xeab308, // Gold
  MGR: 0x8b5cf6, // Purple
};

export const INVALID_CLUBS = new Set([
  "free agent",
  "loan xi",
  "unknown",
  "none",
  "n/a",
  "academy",
]);

export const INVALID_NATIONS = new Set([
  "international",
  "unknown",
  "none",
  "n/a",
  "world xi",
  "academy",
]);
