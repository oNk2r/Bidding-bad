import { describe, it, expect } from "vitest";
import { simulateMatch, createBotClub, ClubMatchSide } from "../src/models/match.js";
import { Squad } from "../src/models/squad.js";
import { Player } from "../src/models/player.js";
import { getTacticInfo, TacticType } from "../src/models/tactics.js";
import { MAX_INVENTORY_CARDS } from "../src/config/constants.js";

describe("Live Match Simulation & MatchStats 2.0", () => {
  it("enforces maximum inventory limit constant of 50 cards", () => {
    expect(MAX_INVENTORY_CARDS).toBe(50);
  });

  it("calculates positional units accurately for a club side", () => {
    const players = [
      new Player("Alisson", "GK", 89, 1),
      new Player("Van Dijk", "DEF", 89, 1),
      new Player("Alexander-Arnold", "DEF", 86, 1),
      new Player("De Bruyne", "MID", 91, 1),
      new Player("Haaland", "FW", 91, 1),
    ];
    const squad = new Squad(players);
    const side = new ClubMatchSide("u1", "Manager", "Club", "🔴", squad);
    const units = side.getUnits();

    expect(units.gk.length).toBe(1);
    expect(units.gkRating).toBe(89);
    expect(units.def.length).toBe(2);
    expect(units.defRating).toBe(87.5);
    expect(units.mid.length).toBe(1);
    expect(units.midRating).toBe(91);
    expect(units.att.length).toBe(1);
    expect(units.attRating).toBe(91);
  });

  it("simulates realistic live match with dynamic events, coach influence, and complete stats", () => {
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
    expect(result.stats.homeShots).toBeGreaterThanOrEqual(result.stats.homeShotsOnTarget);
    expect(result.stats.awayShots).toBeGreaterThanOrEqual(result.stats.awayShotsOnTarget);
    expect(result.stats.homeShotsOnTarget).toBeGreaterThanOrEqual(result.homeScore);
    expect(result.stats.awayShotsOnTarget).toBeGreaterThanOrEqual(result.awayScore);
    expect(result.stats.homeXg).toBeGreaterThan(0);
    expect(result.stats.awayXg).toBeGreaterThan(0);
    expect(result.stats.homeSaves).toBeGreaterThanOrEqual(0);
    expect(result.stats.awaySaves).toBeGreaterThanOrEqual(0);
    expect(result.stats.homeYellowCards).toBeGreaterThanOrEqual(0);
    expect(result.stats.awayYellowCards).toBeGreaterThanOrEqual(0);
    expect(result.stats.homePassAccuracy).toBeGreaterThanOrEqual(60);
    expect(result.stats.awayPassAccuracy).toBeGreaterThanOrEqual(60);
    expect(Array.isArray(result.homeGoalScorers)).toBe(true);
    expect(Array.isArray(result.awayGoalScorers)).toBe(true);
    expect(result.homeGoalScorers.length).toBe(result.homeScore);
    expect(result.awayGoalScorers.length).toBe(result.awayScore);

    // Verify Head Coach opening event was generated
    const tacticalEvents = result.events.filter((e) => e.eventType === "TACTICAL");
    expect(tacticalEvents.length).toBeGreaterThanOrEqual(1);
    expect(tacticalEvents[0].commentary).toContain("Pep Guardiola");
  });

  it("handles tactical influence on possession (Tiki-Taka vs Park the Bus)", () => {
    const p = [
      new Player("GK", "GK", 85, 1),
      new Player("DEF", "DEF", 85, 1),
      new Player("MID", "MID", 85, 1),
      new Player("FW 1", "FW", 85, 1),
      new Player("FW 2", "FW", 85, 1),
    ];
    const tikiSide = new ClubMatchSide("u1", "M1", "Tiki FC", "🔴", new Squad(p), 0, getTacticInfo(TacticType.TIKI_TAKA));
    const busSide = new ClubMatchSide("u2", "M2", "Bus FC", "🔵", new Squad(p), 0, getTacticInfo(TacticType.PARK_THE_BUS));

    let tikiPossSum = 0;
    const runs = 20;
    for (let i = 0; i < runs; i++) {
      const res = simulateMatch(tikiSide, busSide, undefined, false);
      tikiPossSum += res.stats.homePossession;
    }
    const avgTikiPoss = tikiPossSum / runs;
    expect(avgTikiPoss).toBeGreaterThanOrEqual(60);
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
    for (let i = 0; i < 40; i++) {
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
    expect(foundPenalty).toBe(true);
  });
});
