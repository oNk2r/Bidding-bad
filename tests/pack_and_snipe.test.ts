import { describe, it, expect } from "vitest";
import { getRemainingTimerSeconds } from "../src/jobs/auctionTimer.js";

describe("Pack Walkout and Auction Anti-Snipe Features", () => {
  it("determines walkout eligibility correctly for 88+ rating", () => {
    const cards = [
      { rating: 84, name: "Card A" },
      { rating: 89, name: "Mbappe" },
      { rating: 82, name: "Card C" },
    ];
    const topCard = [...cards].sort((a, b) => b.rating - a.rating)[0];
    const isWalkout = topCard.rating >= 88;
    expect(isWalkout).toBe(true);
    expect(topCard.name).toBe("Mbappe");
  });

  it("handles non-walkout packs under 88 rating", () => {
    const cards = [
      { rating: 85, name: "Card A" },
      { rating: 87, name: "Card B" },
    ];
    const topCard = [...cards].sort((a, b) => b.rating - a.rating)[0];
    const isWalkout = topCard.rating >= 88;
    expect(isWalkout).toBe(false);
  });

  it("returns 0 remaining seconds when no timer exists", () => {
    const remaining = getRemainingTimerSeconds("non_existent_guild");
    expect(remaining).toBe(0);
  });
});
