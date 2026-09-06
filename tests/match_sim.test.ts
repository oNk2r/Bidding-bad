import { describe, it, expect } from "vitest";
import { simulateMatch, createBotClub, ClubMatchSide } from "../src/models/match.js";
import { Squad } from "../src/models/squad.js";
import { Player } from "../src/models/player.js";
import { getTacticInfo, TacticType } from "../src/models/tactics.js";
import { MAX_INVENTORY_CARDS } from "../src/config/constants.js";

describe("Live Match Simulation & MatchStats", () => {
  it("enforces maximum inventory limit constant of 50 cards", () => {
    expect(MAX_INVENTORY_CARDS).toBe(50);
  });

  it("simulates realistic live match with dynamic events, head coach influence, and complete stats", () => {
    const homePlayers = [
      new Player("Thibaut Courtois", "GK", 89, 1, 0, "Real Madrid", "Belgium"),
      new Player("Virgil van Dijk", "DEF", 89, 1, 0, "Liverpool", "Netherlands"),
      new Player("Kevin De Bruyne", "MID", 91, 1, 0, "Manchester City", "Belgium"),
      new Player("Erling Håland", "FW", 90, 1, 0, "Manchester City", "Norway"),
      new Player("Kylian Mbappé", "FW", 91, 1, 0, "Real Madrid", "France"),
    ];
    const homeSquad = new Squad(homePlayers);
    const homeSide = new ClubMatchSide(
      "user_1",
      "Manager Pep",
      "Galácticos XI",
      "⚪🟣",
      homeSquad,
      2.0,
      getTacticInfo(TacticType.TIKI_TAKA),
      false,
      "Pep Guardiola"
    );

    const botSide = createBotClub("Dynamo AI FC", 87, "GEGENPRESS");

    const result = simulateMatch(homeSide, botSide, undefined, false);

    expect(result.events.length).toBeGreaterThanOrEqual(4);
    expect(result.mvp).toBeDefined();
    expect(result.tacticalSummary).toBeDefined();

    // Check stats
    expect(result.stats).toBeDefined();
    expect(result.stats.homePossession + result.stats.awayPossession).toBe(100);
    expect(result.stats.homeShots).toBeGreaterThanOrEqual(0);
    expect(result.stats.awayShots).toBeGreaterThanOrEqual(0);
    expect(result.stats.homeShotsOnTarget).toBeLessThanOrEqual(result.stats.homeShots);
    expect(result.stats.awayShotsOnTarget).toBeLessThanOrEqual(result.stats.awayShots);

    // Verify Head Coach opening event was generated
    const tacticalEvents = result.events.filter((e) => e.eventType === "TACTICAL");
    expect(tacticalEvents.length).toBeGreaterThanOrEqual(1);
    expect(tacticalEvents[0].commentary).toContain("Pep Guardiola");
  });

  it("handles knockout matches and penalty shootouts if tied", () => {
    const p1 = [
      new Player("GK 1", "GK", 80, 1),
      new Player("DEF 1", "DEF", 80, 1),
      new Player("MID 1", "MID", 80, 1),
      new Player("FW 1", "FW", 80, 1),
      new Player("FW 2", "FW", 80, 1),
    ];
    const side1 = new ClubMatchSide("u1", "M1", "Team A", "🔴", new Squad(p1));
    const side2 = new ClubMatchSide("u2", "M2", "Team B", "🔵", new Squad(p1));

    let foundPenalty = false;
    for (let i = 0; i < 30; i++) {
      const res = simulateMatch(side1, side2, undefined, true);
      if (res.homeScore === res.awayScore) {
        expect(res.penaltyHomeScore).toBeDefined();
        expect(res.penaltyAwayScore).toBeDefined();
        expect(res.penaltyHomeScore).not.toBe(res.penaltyAwayScore);
        expect(res.winner).not.toBeNull();
        foundPenalty = true;
        break;
      }
    }
  });
});
