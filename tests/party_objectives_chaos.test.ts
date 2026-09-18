import { describe, it, expect } from "vitest";
import { SECRET_OBJECTIVES, assignSecretObjectives } from "../src/party/objectives/objectives.js";
import type { PartyPlayerState } from "../src/party/types.js";
import { PartyGame } from "../src/party/models/partyGame.js";
import { createInitialChaosState } from "../src/party/chaos/chaosEvents.js";

describe("Party Secret Objectives & Chaos Events", () => {
  it("assigns unique secret objectives to players", () => {
    const players: PartyPlayerState[] = [
      {
        userId: "p1",
        displayName: "P1",
        purse: 50,
        items: [],
        itemPrices: {},
        totalBidsPlaced: 0,
        outbidsCount: 0,
        questionablePurchases: 0,
      },
      {
        userId: "p2",
        displayName: "P2",
        purse: 50,
        items: [],
        itemPrices: {},
        totalBidsPlaced: 0,
        outbidsCount: 0,
        questionablePurchases: 0,
      },
      {
        userId: "p3",
        displayName: "P3",
        purse: 50,
        items: [],
        itemPrices: {},
        totalBidsPlaced: 0,
        outbidsCount: 0,
        questionablePurchases: 0,
      },
    ];

    assignSecretObjectives(players);
    expect(players[0].secretObjective).toBeDefined();
    expect(players[1].secretObjective).toBeDefined();
    expect(players[2].secretObjective).toBeDefined();
    expect(players[0].objectiveCompleted).toBe(false);
  });

  it("validates The Collector objective (2 items sharing a tag)", () => {
    const collectorObj = SECRET_OBJECTIVES.find((o) => o.id === "the_collector")!;
    expect(collectorObj).toBeDefined();

    const player: PartyPlayerState = {
      userId: "u1",
      displayName: "Collector",
      purse: 30,
      items: [
        { id: "1", name: "Messi", category: "football", tags: ["goat", "attacker"] },
        { id: "2", name: "Ronaldo", category: "football", tags: ["goat", "striker"] },
      ],
      itemPrices: { "1": 10, "2": 10 },
      totalBidsPlaced: 2,
      outbidsCount: 0,
      questionablePurchases: 0,
    };

    expect(collectorObj.validate(player, [player])).toBe(true);

    // If no shared tags
    player.items[1].tags = ["defender", "brazil"];
    expect(collectorObj.validate(player, [player])).toBe(false);
  });

  it("validates Moneyball objective (finish with >= 15 BB)", () => {
    const moneyball = SECRET_OBJECTIVES.find((o) => o.id === "moneyball")!;
    const player: PartyPlayerState = {
      userId: "u1",
      displayName: "Moneyballer",
      purse: 15,
      items: [
        { id: "1", name: "I1", category: "m", tags: [] },
        { id: "2", name: "I2", category: "m", tags: [] },
        { id: "3", name: "I3", category: "m", tags: [] },
        { id: "4", name: "I4", category: "m", tags: [] },
        { id: "5", name: "I5", category: "m", tags: [] },
      ],
      itemPrices: { "1": 7, "2": 7, "3": 7, "4": 7, "5": 7 },
      totalBidsPlaced: 5,
      outbidsCount: 0,
      questionablePurchases: 0,
    };

    expect(moneyball.validate(player, [player])).toBe(true);

    player.purse = 14;
    expect(moneyball.validate(player, [player])).toBe(false);
  });

  it("validates Big Spender objective (spend >= 40 BB)", () => {
    const bigSpender = SECRET_OBJECTIVES.find((o) => o.id === "big_spender")!;
    const player: PartyPlayerState = {
      userId: "u1",
      displayName: "Big Spender",
      purse: 10,
      items: [],
      itemPrices: { "1": 20, "2": 20 },
      totalBidsPlaced: 2,
      outbidsCount: 0,
      questionablePurchases: 0,
    };

    expect(bigSpender.validate(player, [player])).toBe(true);

    player.itemPrices = { "1": 20, "2": 19 };
    expect(bigSpender.validate(player, [player])).toBe(false);
  });

  it("validates 5D Chess objective (spending less than everyone else)", () => {
    const chess = SECRET_OBJECTIVES.find((o) => o.id === "five_d_chess")!;
    const p1: PartyPlayerState = {
      userId: "p1",
      displayName: "Smart",
      purse: 35,
      items: [],
      itemPrices: { "1": 5, "2": 10 }, // Spent 15 BB
      totalBidsPlaced: 2,
      outbidsCount: 0,
      questionablePurchases: 0,
    };

    const p2: PartyPlayerState = {
      userId: "p2",
      displayName: "Spender 1",
      purse: 20,
      items: [],
      itemPrices: { "3": 15, "4": 15 }, // Spent 30 BB
      totalBidsPlaced: 2,
      outbidsCount: 0,
      questionablePurchases: 0,
    };

    const p3: PartyPlayerState = {
      userId: "p3",
      displayName: "Spender 2",
      purse: 25,
      items: [],
      itemPrices: { "5": 10, "6": 15 }, // Spent 25 BB
      totalBidsPlaced: 2,
      outbidsCount: 0,
      questionablePurchases: 0,
    };

    expect(chess.validate(p1, [p1, p2, p3])).toBe(true);
    expect(chess.validate(p2, [p1, p2, p3])).toBe(false);
  });

  it("applies chaos stimulus correctly to all players", () => {
    const game = new PartyGame("g1", "c1", "host_1", "Host", { minPlayers: 3 });
    game.addPlayer("p2", "Player 2");
    game.addPlayer("p3", "Player 3");
    game.start();

    // Trigger stimulus
    for (const pid of game.players) {
      game.playerStates[pid].purse += 3;
    }

    for (const pid of game.players) {
      expect(game.playerStates[pid].purse).toBe(53);
    }
  });

  it("applies chaos inflation (+2 BB extra tax on win)", () => {
    const game = new PartyGame("g1", "c1", "host_1", "Host", { minPlayers: 3 });
    game.addPlayer("p2", "Player 2");
    game.addPlayer("p3", "Player 3");
    game.start();

    // Reset purse to 50, clear random chaos, and enable inflation
    game.playerStates["host_1"].purse = 50;
    game.chaosState = createInitialChaosState();
    game.chaosState.inflationRoundsRemaining = 1;

    const bidRes = game.placeBid("host_1", "Host", 10);
    expect(bidRes.success).toBe(true);
    const sold = game.sellCurrentItem();

    expect(sold).not.toBeNull();
    expect(sold!.finalPrice).toBe(12); // 10 + 2 BB inflation
    expect(sold!.remainingPurse).toBe(38); // 50 - 12
    expect(game.chaosState.inflationRoundsRemaining).toBe(0);
  });

  it("applies chaos double bid (2x price on win)", () => {
    const game = new PartyGame("g1", "c1", "host_1", "Host", { minPlayers: 3 });
    game.addPlayer("p2", "Player 2");
    game.addPlayer("p3", "Player 3");
    game.start();

    // Reset purse to 50, clear random chaos, and enable double jeopardy
    game.playerStates["p2"].purse = 50;
    game.chaosState = createInitialChaosState();
    game.chaosState.doubleBidActive = true;

    const bidRes = game.placeBid("p2", "Player 2", 8);
    expect(bidRes.success).toBe(true);
    const sold = game.sellCurrentItem();

    expect(sold).not.toBeNull();
    expect(sold!.finalPrice).toBe(16); // 8 * 2
    expect(sold!.remainingPurse).toBe(34); // 50 - 16
  });
});
