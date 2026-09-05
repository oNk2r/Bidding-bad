import { INVALID_CLUBS, INVALID_NATIONS } from "../config/constants.js";
import type { Squad } from "./squad.js";

export interface ChemistryResult {
  totalBonus: number;
  synergies: string[];
}

export function getChemistryBreakdown(squad: Squad): ChemistryResult {
  if (!squad.players || squad.players.length === 0) {
    return { totalBonus: 0.0, synergies: [] };
  }

  const clubCounts: Record<string, number> = {};
  const nationCounts: Record<string, number> = {};

  for (const p of squad.players) {
    const club = (p.club || "").trim();
    const nation = (p.nation || "").trim();

    if (club && !club.startsWith("Academy") && !INVALID_CLUBS.has(club.toLowerCase())) {
      clubCounts[club] = (clubCounts[club] || 0) + 1;
    }
    if (nation && !nation.startsWith("Academy") && !INVALID_NATIONS.has(nation.toLowerCase())) {
      nationCounts[nation] = (nationCounts[nation] || 0) + 1;
    }
  }

  const synergies: string[] = [];
  let totalBonus = 0.0;

  // Club synergies (+3.0 pts for 2+ players from same club)
  const sortedClubs = Object.entries(clubCounts).sort((a, b) => b[1] - a[1]);
  for (const [club, count] of sortedClubs) {
    if (count >= 2) {
      const bonus = 3.0 * (count - 1);
      totalBonus += bonus;
      synergies.push(`🏰 **${club} Link** (${count} players) ➔ **+${bonus.toFixed(1)} pts**`);
    }
  }

  // Nation synergies (+2.0 pts for 2+ players from same nation)
  const sortedNations = Object.entries(nationCounts).sort((a, b) => b[1] - a[1]);
  for (const [nation, count] of sortedNations) {
    if (count >= 2) {
      const bonus = 2.0 * (count - 1);
      totalBonus += bonus;
      synergies.push(`🏳️ **${nation} Link** (${count} players) ➔ **+${bonus.toFixed(1)} pts**`);
    }
  }

  return {
    totalBonus: Math.round(totalBonus * 10) / 10,
    synergies,
  };
}

export function calculateScore(squad: Squad): number {
  if (!squad.isValid()) {
    return 0.0;
  }

  // Base: Average player rating
  const totalRating = squad.players.reduce((sum, p) => sum + p.rating, 0);
  const averageRating = totalRating / squad.players.length;

  // Star player bonus: +1.0 for each player rated 90 or higher
  const starBonus = squad.players.filter((p) => p.rating >= 90).length * 1.0;

  // Structure completion bonus for building a valid 5-player squad
  const structureBonus = 5.0;

  // Chemistry synergy bonuses
  const { totalBonus: chemBonus } = getChemistryBreakdown(squad);

  const totalScore = averageRating + starBonus + structureBonus + chemBonus;

  return Math.round(Math.min(100.0, totalScore) * 100) / 100;
}
