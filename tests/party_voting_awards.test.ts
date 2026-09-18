import { describe, it, expect } from "vitest";
import { PartyGame } from "../src/party/models/partyGame.js";

describe("Party Voting & Funny Awards", () => {
  it("enforces single vote per user during community voting", () => {
    const game = new PartyGame("g1", "c1", "host_1", "Host", { minPlayers: 3 });
    game.addPlayer("p2", "Player 2");
    game.addPlayer("p3", "Player 3");
    game.start();

    // Voting before open should fail
    const earlyVote = game.castVote("voter_1", "host_1");
    expect(earlyVote.success).toBe(false);
    expect(earlyVote.message).toContain("not currently open");

    // Open voting
    game.startVoting();
    expect(game.status).toBe("VOTING");

    // Valid vote
    const v1 = game.castVote("voter_1", "host_1");
    expect(v1.success).toBe(true);

    // Duplicate vote attempt by same user
    const vDup = game.castVote("voter_1", "p2");
    expect(vDup.success).toBe(false);
    expect(vDup.message).toContain("already voted");

    // Vote for invalid non-player
    const vBad = game.castVote("voter_2", "random_stranger");
    expect(vBad.success).toBe(false);
    expect(vBad.message).toContain("not a contestant");
  });

  it("calculates all funny awards correctly after voting", () => {
    const game = new PartyGame("g1", "c1", "host_1", "Host User", { minPlayers: 3 });
    game.addPlayer("player_2", "Player Two");
    game.addPlayer("player_3", "Player Three");
    game.start();

    // Simulate item acquisitions and spending
    // Host spends 20 BB (30 BB remaining)
    game.playerStates["host_1"].purse = 30;
    game.playerStates["host_1"].itemPrices = { i1: 20 };
    game.playerStates["host_1"].items = [
      { id: "i1", name: "Heavy Spender Item", category: "movies", tags: ["action"] },
    ];
    game.squads["host_1"].addItem(game.playerStates["host_1"].items[0], 20);

    // Player 2 spends 10 BB (40 BB remaining) - Moneyball candidate!
    // Player 2 also has 4 outbids - Snake candidate!
    game.playerStates["player_2"].purse = 40;
    game.playerStates["player_2"].outbidsCount = 4;
    game.playerStates["player_2"].itemPrices = { i2: 10 };
    game.playerStates["player_2"].items = [
      { id: "i2", name: "Value Item", category: "movies", tags: ["smart"] },
    ];
    game.squads["player_2"].addItem(game.playerStates["player_2"].items[0], 10);

    // Player 3 has high synergies - Aura Farmer candidate!
    game.playerStates["player_3"].purse = 25;
    game.playerStates["player_3"].items = [
      { id: "i3", name: "Aura 1", category: "movies", tags: ["legend", "god"] },
      { id: "i4", name: "Aura 2", category: "movies", tags: ["legend", "god"] },
    ];
    game.squads["player_3"].addItem(game.playerStates["player_3"].items[0], 15);
    game.squads["player_3"].addItem(game.playerStates["player_3"].items[1], 10);

    // Voting phase
    game.startVoting();
    // 3 votes for Player 2 (The Cook)
    game.castVote("voter_1", "player_2");
    game.castVote("voter_2", "player_2");
    game.castVote("voter_3", "player_2");
    // 1 vote for Host
    game.castVote("voter_4", "host_1");
    // 0 votes for Player 3 (The Fraud)

    const awards = game.calculateAwards();
    expect(awards.length).toBe(7);

    const cook = awards.find((a) => a.id === "the_cook")!;
    expect(cook.winnerId).toBe("player_2");

    const moneyball = awards.find((a) => a.id === "moneyball")!;
    expect(moneyball.winnerId).toBe("player_2");

    const snake = awards.find((a) => a.id === "snake")!;
    expect(snake.winnerId).toBe("player_2");

    const npc = awards.find((a) => a.id === "npc_purchase")!;
    expect(npc.winnerId).toBe("host_1"); // Spent 20 on single item

    const fraud = awards.find((a) => a.id === "the_fraud")!;
    expect(fraud.winnerId).toBe("player_3"); // Received 0 votes
  });

  it("produces valid shareable result payload", () => {
    const game = new PartyGame("g1", "c1", "host_1", "Host", { minPlayers: 3 });
    game.addPlayer("p2", "Player 2");
    game.addPlayer("p3", "Player 3");
    game.start();
    game.startVoting();

    const shareable = game.generateShareableResult();
    expect(shareable.gameId).toBe(game.gameId);
    expect(shareable.guildId).toBe("g1");
    expect(shareable.channelId).toBe("c1");
    expect(shareable.category.id).toBe(game.category.id);
    expect(shareable.scenario.title).toBe(game.scenario.title);
    expect(shareable.players.length).toBe(3);
    expect(shareable.awards.length).toBeGreaterThanOrEqual(7);
  });
});
