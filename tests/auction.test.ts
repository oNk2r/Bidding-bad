import { describe, it, expect } from "vitest";
import { Auction, createBalancedPot } from "../src/models/auction.js";
import { Player } from "../src/models/player.js";

describe("Live Auction Mechanics", () => {
  const masterPool = [
    new Player("Alisson", "GK", 89, 4, 0, "Liverpool", "Brazil"),
    new Player("Ederson", "GK", 88, 4, 0, "Man City", "Brazil"),
    new Player("Courtois", "GK", 90, 5, 0, "Real Madrid", "Belgium"),
    new Player("Van Dijk", "DEF", 89, 4, 0, "Liverpool", "Netherlands"),
    new Player("Dias", "DEF", 88, 4, 0, "Man City", "Portugal"),
    new Player("Saliba", "DEF", 87, 4, 0, "Arsenal", "France"),
    new Player("Rodri", "MID", 90, 5, 0, "Man City", "Spain"),
    new Player("De Bruyne", "MID", 90, 5, 0, "Man City", "Belgium"),
    new Player("Bellingham", "MID", 90, 5, 0, "Real Madrid", "England"),
    new Player("Pedri", "MID", 86, 3, 0, "Barcelona", "Spain"),
    new Player("Haaland", "FW", 91, 5, 0, "Man City", "Norway"),
    new Player("Mbappe", "FW", 92, 5, 0, "Real Madrid", "France"),
    new Player("Kane", "FW", 89, 4, 0, "Bayern", "England"),
    new Player("Salah", "FW", 89, 4, 0, "Liverpool", "Egypt"),
  ];

  it("creates balanced pot with minimum GK and outfield distribution", () => {
    const pot = createBalancedPot(masterPool, 2);
    expect(pot.length).toBeGreaterThanOrEqual(14);
    const gks = pot.filter((p) => p.position === "GK");
    expect(gks.length).toBeGreaterThanOrEqual(3);
  });

  it("enforces minimum $1 reserve per remaining slot when calculating max legal bid", () => {
    const auction = new Auction("user_1", "Manager 1");
    auction.addPlayer("user_2", "Manager 2");
    auction.start(masterPool);

    const player = auction.currentPlayer!;
    // With 0 players acquired (5 slots needed), budget = 50.
    // 4 remaining slots after this player require $4 reserve.
    // Max legal bid = 50 - 4 = $46.
    const maxBid = auction.calculateMaxBid("user_1", player);
    expect(maxBid).toBe(46);

    // Bidding $47 should fail
    const overbid = auction.placeBid("user_1", 47);
    expect(overbid.success).toBe(false);
    expect(overbid.message).toContain("reserve at least $1");

    // Bidding $46 should succeed
    const legalBid = auction.placeBid("user_1", 46);
    expect(legalBid.success).toBe(true);
  });

  it("handles selling current player and deducting budget", () => {
    const auction = new Auction("user_1", "Manager 1");
    auction.addPlayer("user_2", "Manager 2");
    auction.start(masterPool);

    const initialPlayer = auction.currentPlayer!;
    auction.placeBid("user_1", 10);

    const result = auction.sellCurrentPlayer();
    expect(result).not.toBeNull();
    const [sold, winnerId, winningBid] = result!;
    expect(winnerId).toBe("user_1");
    expect(winningBid).toBe(10);
    expect(auction.budgets["user_1"]).toBe(40);
    expect(auction.squads["user_1"].players.length).toBe(1);
  });
});
