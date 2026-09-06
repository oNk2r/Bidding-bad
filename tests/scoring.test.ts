import { describe, it, expect } from "vitest";
import { Squad } from "../src/models/squad.js";
import { Player } from "../src/models/player.js";
import { calculateScore, getChemistryBreakdown } from "../src/models/scoring.js";

describe("Scoring and Chemistry Synergies", () => {
  it("calculates club link bonuses (+1.0 pts per link pair)", () => {
    const squad = new Squad([
      new Player("Alisson", "GK", 89, 4, 0, "Liverpool", "Brazil"),
      new Player("Van Dijk", "DEF", 89, 4, 0, "Liverpool", "Netherlands"),
      new Player("Alexander-Arnold", "DEF", 86, 3, 0, "Liverpool", "England"),
      new Player("Rodri", "MID", 90, 5, 0, "Man City", "Spain"),
      new Player("Haaland", "FW", 91, 5, 0, "Man City", "Norway"),
    ]);

    const { totalBonus, synergies } = getChemistryBreakdown(squad);
    // 3 Liverpool players: 1.0 * (3 - 1) = 2.0 pts
    // 2 Man City players: 1.0 * (2 - 1) = 1.0 pts
    // Total club bonus: 3.0 pts
    expect(totalBonus).toBe(3.0);
    expect(synergies.length).toBe(2);
  });

  it("calculates nation link bonuses (+0.5 pts per link pair)", () => {
    const squad = new Squad([
      new Player("Ederson", "GK", 88, 4, 0, "Man City", "Brazil"),
      new Player("Marquinhos", "DEF", 87, 4, 0, "PSG", "Brazil"),
      new Player("Casemiro", "MID", 86, 3, 0, "Man United", "Brazil"),
      new Player("Pedri", "MID", 86, 3, 0, "Barcelona", "Spain"),
      new Player("Yamal", "FW", 85, 3, 0, "Barcelona", "Spain"),
    ]);

    const { totalBonus, synergies } = getChemistryBreakdown(squad);
    // 3 Brazil players: 0.5 * (3 - 1) = 1.0 pts
    // 2 Spain players: 0.5 * (2 - 1) = 0.5 pts
    // 2 Barcelona players: 1.0 * (2 - 1) = 1.0 pts
    // Total: 1.0 + 0.5 + 1.0 = 2.5 pts
    expect(totalBonus).toBe(2.5);
  });

  it("calculates nerfed realistic score", () => {
    const squad = new Squad([
      new Player("Courtois", "GK", 90, 5, 0, "Real Madrid", "Belgium"),
      new Player("Rudiger", "DEF", 88, 4, 0, "Real Madrid", "Germany"),
      new Player("Valverde", "MID", 90, 5, 0, "Real Madrid", "Uruguay"),
      new Player("Bellingham", "MID", 90, 5, 0, "Real Madrid", "England"),
      new Player("Mbappe", "FW", 92, 5, 0, "Real Madrid", "France"),
    ]);

    const score = calculateScore(squad);
    // Base avg: (90+88+90+90+92)/5 = 90.0
    // Star bonus (>=90): 4 * 0.2 = +0.8
    // Real Madrid (5 players): 1.0 * (5 - 1) = +4.0
    // Total raw: 90.0 + 0.8 + 4.0 = 94.8
    expect(score).toBe(94.8);
  });
});
