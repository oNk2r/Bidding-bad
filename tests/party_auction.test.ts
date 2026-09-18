import { describe, it, expect, beforeEach } from "vitest";
import { PartyGame } from "../src/party/models/partyGame.js";
import { partyService } from "../src/party/services/partyService.js";
import { PartySquad } from "../src/party/models/partySquad.js";

describe("Party Auction Core Mechanics", () => {
  let game: PartyGame;

  beforeEach(() => {
    game = new PartyGame("guild_test", "channel_test", "host_1", "Host User", {
      minPlayers: 3,
      maxPlayers: 6,
      startingPurse: 50,
      squadSize: 5,
      category: "football",
    });
  });

  it("enforces lobby min and max player constraints", () => {
    expect(game.canStart).toBe(false); // Only 1 player (host)

    // Add 2nd player
    const res2 = game.addPlayer("player_2", "Player Two");
    expect(res2.success).toBe(true);
    expect(game.canStart).toBe(false);

    // Add 3rd player (min reached)
    const res3 = game.addPlayer("player_3", "Player Three");
    expect(res3.success).toBe(true);
    expect(game.canStart).toBe(true);

    // Duplicate join rejection
    const dupRes = game.addPlayer("player_2", "Player Two Again");
    expect(dupRes.success).toBe(false);
    expect(dupRes.message).toContain("already joined");

    // Add players up to max (6)
    game.addPlayer("player_4", "Player 4");
    game.addPlayer("player_5", "Player 5");
    game.addPlayer("player_6", "Player 6");
    expect(game.players.length).toBe(6);

    // 7th player should be rejected
    const res7 = game.addPlayer("player_7", "Player 7");
    expect(res7.success).toBe(false);
    expect(res7.message).toContain("full");
  });

  it("handles player leaving lobby", () => {
    game.addPlayer("player_2", "Player Two");
    expect(game.players.includes("player_2")).toBe(true);

    const leaveRes = game.removePlayer("player_2");
    expect(leaveRes.success).toBe(true);
    expect(game.players.includes("player_2")).toBe(false);

    // Leaving non-existent player
    const leaveAgain = game.removePlayer("player_2");
    expect(leaveAgain.success).toBe(false);
  });

  it("initializes auction with 50 BB and secret objectives assigned", () => {
    game.addPlayer("player_2", "Player 2");
    game.addPlayer("player_3", "Player 3");
    expect(game.canStart).toBe(true);

    const started = game.start();
    expect(started).toBe(true);
    expect(game.status).toBe("AUCTION");
    expect(game.currentItem).not.toBeNull();
    expect(game.currentBid).toBe(game.currentItem!.startingPrice || 1);

    for (const pid of game.players) {
      expect(game.playerStates[pid].purse).toBe(50);
      expect(game.playerStates[pid].secretObjective).toBeDefined();
    }
  });

  it("enforces minimum 1 BB reserve per remaining empty slot", () => {
    game.addPlayer("player_2", "Player 2");
    game.addPlayer("player_3", "Player 3");
    game.start();

    // 0 items owned, 5 empty slots.
    // 4 remaining slots after this item require 4 BB reserve.
    // Max legal bid = 50 - 4 = 46 BB.
    const maxBid = game.calculateMaxLegalBid("host_1");
    expect(maxBid).toBe(46);

    // Overbidding 47 BB should fail
    const overbid = game.placeBid("host_1", "Host User", 47);
    expect(overbid.success).toBe(false);
    expect(overbid.message).toContain("reserve at least 1 BB");

    // Legal bid of 46 BB should succeed
    const legalBid = game.placeBid("host_1", "Host User", 46);
    expect(legalBid.success).toBe(true);
    expect(game.currentBid).toBe(46);
    expect(game.currentBidder).toBe("host_1");
  });

  it("rejects bids lower than current bid and handles outbidding with roasts", () => {
    game.addPlayer("player_2", "Player 2");
    game.addPlayer("player_3", "Player 3");
    game.start();

    // Player 1 bids 10 BB
    game.placeBid("host_1", "Host User", 10);

    // Player 2 bids equal to or less than 10 BB
    const underbid = game.placeBid("player_2", "Player 2", 10);
    expect(underbid.success).toBe(false);
    expect(underbid.message).toContain("higher than current bid");

    // Player 2 outbids with 15 BB
    const outbidRes = game.placeBid("player_2", "Player 2", 15);
    expect(outbidRes.success).toBe(true);
    expect(outbidRes.isOutbid).toBe(true);
    expect(outbidRes.prevBidderId).toBe("host_1");
    expect(outbidRes.roast).not.toBeNull();
    expect(game.playerStates["player_2"].outbidsCount).toBe(1);
  });

  it("rejects bids exceeding available purse", () => {
    game.addPlayer("player_2", "Player 2");
    game.addPlayer("player_3", "Player 3");
    game.start();

    // Player has 50 BB, trying to bid 55 BB
    const brokeBid = game.placeBid("host_1", "Host User", 55);
    expect(brokeBid.success).toBe(false);
    expect(brokeBid.message).toContain("cannot afford");
  });

  it("handles selling item and deducting virtual BB purse", () => {
    game.addPlayer("player_2", "Player 2");
    game.addPlayer("player_3", "Player 3");
    game.start();

    const currentItem = game.currentItem!;
    game.placeBid("player_2", "Player 2", 12);

    const saleResult = game.sellCurrentItem();
    expect(saleResult).not.toBeNull();
    expect(saleResult!.winnerId).toBe("player_2");
    expect(saleResult!.finalPrice).toBe(12);
    expect(saleResult!.remainingPurse).toBe(38);
    expect(game.playerStates["player_2"].items.length).toBe(1);
    expect(game.playerStates["player_2"].items[0].id).toBe(currentItem.id);
  });

  it("handles passing and skips item when all eligible players pass", () => {
    game.addPlayer("player_2", "Player 2");
    game.addPlayer("player_3", "Player 3");
    game.start();

    const initialItem = game.currentItem!;

    // 1st pass
    const p1 = game.pass("host_1");
    expect(p1.allPassed).toBe(false);
    expect(p1.passCount).toBe(1);

    // 2nd pass
    const p2 = game.pass("player_2");
    expect(p2.allPassed).toBe(false);
    expect(p2.passCount).toBe(2);

    // 3rd pass (unanimous)
    const p3 = game.pass("player_3");
    expect(p3.allPassed).toBe(true);

    const skipped = game.skipCurrentItem();
    expect(skipped).not.toBeNull();
    expect(skipped!.id).toBe(initialItem.id);
  });

  it("prevents players with full squads (5 items) from bidding", () => {
    const squad = new PartySquad(5);
    expect(squad.isFull).toBe(false);

    for (let i = 0; i < 5; i++) {
      squad.addItem(
        { id: `item_${i}`, name: `Item ${i}`, category: "games", tags: ["test"] },
        5
      );
    }
    expect(squad.isFull).toBe(true);
    expect(squad.remainingSlots).toBe(0);
  });

  it("isolates game instances by guild and channel", () => {
    const gameA = partyService.createGame("guild_1", "channel_1", "user_a", "User A");
    const gameB = partyService.createGame("guild_1", "channel_2", "user_b", "User B");

    expect(gameA.channelId).toBe("channel_1");
    expect(gameB.channelId).toBe("channel_2");
    expect(partyService.getGame("guild_1", "channel_1")?.hostId).toBe("user_a");
    expect(partyService.getGame("guild_1", "channel_2")?.hostId).toBe("user_b");

    partyService.removeGame("guild_1", "channel_1");
    expect(partyService.getGame("guild_1", "channel_1")).toBeUndefined();
    expect(partyService.getGame("guild_1", "channel_2")).toBeDefined();

    partyService.removeGame("guild_1", "channel_2");
  });
});
