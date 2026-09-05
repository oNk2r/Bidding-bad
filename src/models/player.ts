import type { Position } from "../config/constants.js";

export interface PlayerData {
  name: string;
  position: Position;
  rating: number;
  startingPrice: number;
  purchasePrice?: number;
  club: string;
  nation: string;
}

export class Player implements PlayerData {
  name: string;
  position: Position;
  rating: number;
  startingPrice: number;
  purchasePrice: number;
  club: string;
  nation: string;

  constructor(
    name: string,
    position: Position,
    rating: number,
    startingPrice: number,
    purchasePrice = 0,
    club = "",
    nation = ""
  ) {
    this.name = name;
    this.position = position;
    this.rating = rating;
    this.startingPrice = startingPrice;
    this.purchasePrice = purchasePrice;
    this.club = club;
    this.nation = nation;
  }
}

export function calculatePlayerValue(rating: number): number {
  if (rating <= 85) return 120;
  if (rating === 86) return 180;
  if (rating === 87) return 280;
  if (rating === 88) return 450;
  if (rating === 89) return 750;
  if (rating === 90) return 1200;
  return 2000;
}

export function getCardTier(rating: number): { tierName: string; tierBadge: string } {
  if (rating <= 85) return { tierName: "Silver Star", tierBadge: "🥈" };
  if (rating <= 87) return { tierName: "Gold Rare", tierBadge: "🥇" };
  if (rating <= 89) return { tierName: "World Class", tierBadge: "💎" };
  if (rating === 90) return { tierName: "Superstar", tierBadge: "🔥" };
  return { tierName: "Icon Legend", tierBadge: "👑" };
}
