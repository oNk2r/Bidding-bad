import { CORE_POSITIONS, FLEX_POSITIONS, SQUAD_SIZE, type Position, type CorePosition } from "../config/constants.js";
import type { Player } from "./player.js";

export class Squad {
  players: Player[];

  constructor(players: Player[] = []) {
    this.players = [...players];
  }

  addPlayer(player: Player, purchasePrice?: number): void {
    if (purchasePrice !== undefined) {
      player.purchasePrice = purchasePrice;
    }
    this.players.push(player);
  }

  canAddPlayer(player: Player): { canAdd: boolean; reason: string } {
    if (this.players.length >= SQUAD_SIZE) {
      return { canAdd: false, reason: "Your squad is already full (5/5 players)." };
    }

    if (!CORE_POSITIONS.includes(player.position as CorePosition)) {
      return { canAdd: false, reason: `Unknown position: ${player.position}.` };
    }

    const posToAdd = player.position as CorePosition;

    // Simulate adding the player
    const simulatedPositions = [...this.players.map((p) => p.position as CorePosition), posToAdd];
    const counts: Record<CorePosition, number> = {
      GK: 0,
      DEF: 0,
      MID: 0,
      FW: 0,
    };

    for (const pos of simulatedPositions) {
      if (pos in counts) {
        counts[pos] = (counts[pos] || 0) + 1;
      }
    }

    // GK constraint: exactly 1 allowed, no GK flex
    if (counts.GK > 1) {
      return { canAdd: false, reason: "You already have a Goalkeeper (GK). Max 1 GK per squad." };
    }

    // Position max: at most 2 for DEF, MID, FW (1 core + 1 flex)
    if (counts[posToAdd] > 2) {
      return {
        canAdd: false,
        reason: `You already have 2 ${player.position}s. Squad allows at most 2 (1 base + 1 flex).`,
      };
    }

    // Flex limit: only 1 flex player across DEF, MID, FW allowed
    const flexUsed = FLEX_POSITIONS.reduce(
      (sum, pos) => sum + Math.max(0, counts[pos] - 1),
      0
    );
    if (flexUsed > 1) {
      const missing = CORE_POSITIONS.filter((pos) => counts[pos] === 0);
      const missingStr = missing.length > 0 ? missing.join(", ") : "None";
      return {
        canAdd: false,
        reason: `Only 1 FLEX position is allowed. You still need: ${missingStr}.`,
      };
    }

    // Mathematical feasibility: remaining slots must be >= missing core positions
    const remainingSlots = SQUAD_SIZE - simulatedPositions.length;
    const missingCore = CORE_POSITIONS.filter((pos) => counts[pos] === 0);

    if (missingCore.length > remainingSlots) {
      const missingStr = missingCore.join(", ");
      return {
        canAdd: false,
        reason: `Buying another ${player.position} makes it impossible to complete a valid squad. You still need: ${missingStr}.`,
      };
    }

    return { canAdd: true, reason: "Player can be added." };
  }

  isValid(): boolean {
    if (this.players.length !== SQUAD_SIZE) {
      return false;
    }

    const positions = this.players.map((p) => p.position as CorePosition);
    const counts: Record<CorePosition, number> = {
      GK: 0,
      DEF: 0,
      MID: 0,
      FW: 0,
    };

    for (const pos of positions) {
      if (pos in counts) {
        counts[pos] = (counts[pos] || 0) + 1;
      }
    }

    if (counts.GK !== 1) return false;
    if (counts.DEF < 1 || counts.DEF > 2) return false;
    if (counts.MID < 1 || counts.MID > 2) return false;
    if (counts.FW < 1 || counts.FW > 2) return false;

    return true;
  }

  getMissingPositions(): Position[] {
    const currentPositions = new Set(this.players.map((p) => p.position));
    return CORE_POSITIONS.filter((pos) => !currentPositions.has(pos));
  }

  hasPosition(position: Position): boolean {
    return this.players.some((p) => p.position === position);
  }
}
