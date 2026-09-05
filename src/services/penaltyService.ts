import { PenaltyShootoutState } from "../models/penalty.js";

export interface ActivePenaltyGame {
  id: string;
  state: PenaltyShootoutState;
  pendingStrikerChoice?: string;
  messageId?: string;
}

export class PenaltyService {
  private games: Map<string, ActivePenaltyGame> = new Map();

  createGame(id: string, state: PenaltyShootoutState): ActivePenaltyGame {
    const game: ActivePenaltyGame = { id, state };
    this.games.set(id, game);

    // Auto-expire inactive games after 15 minutes
    setTimeout(() => {
      this.games.delete(id);
    }, 15 * 60 * 1000);

    return game;
  }

  getGame(id: string): ActivePenaltyGame | undefined {
    return this.games.get(id);
  }

  deleteGame(id: string): void {
    this.games.delete(id);
  }
}

export const penaltyService = new PenaltyService();
