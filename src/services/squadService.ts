import { Squad } from "../models/squad.js";
import { Player } from "../models/player.js";
import { calculateScore, getChemistryBreakdown, type ChemistryResult } from "../models/scoring.js";
import type { Position } from "../config/constants.js";

export class SquadService {
  createEmptySquad(): Squad {
    return new Squad();
  }

  createSquadFromPlayers(players: Player[]): Squad {
    return new Squad(players);
  }

  evaluateSquad(squad: Squad): {
    isValid: boolean;
    score: number;
    chemistry: ChemistryResult;
    missingPositions: Position[];
  } {
    const isValid = squad.isValid();
    const score = calculateScore(squad);
    const chemistry = getChemistryBreakdown(squad);
    const missingPositions = squad.getMissingPositions();

    return {
      isValid,
      score,
      chemistry,
      missingPositions,
    };
  }
}

export const squadService = new SquadService();
