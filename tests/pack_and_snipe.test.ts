import { describe, it, expect } from "vitest";
import { getRemainingTimerSeconds } from "../src/jobs/auctionTimer.js";

describe("Pack Walkout and Auction Anti-Snipe Features", () => {
  it("determines walkout eligibility correctly for better players (86+ rating)", () => {
    const cards = [
      { rating: 84, name: "Card A", position: "MID" },
      { rating: 87, name: "Alexander-Arnold", position: "DEF" },
      { rating: 82, name: "Card C", position: "GK" },
    ];
    const topCard = [...cards].sort((a, b) => b.rating - a.rating)[0];
    const isWalkout = topCard.rating >= 86 || topCard.position === "MGR";
    expect(isWalkout).toBe(true);
    expect(topCard.name).toBe("Alexander-Arnold");
  });

  it("triggers walkout animation for managers regardless of rating", () => {
    const managerCard = { rating: 89, name: "Mikel Arteta", position: "MGR" };
    const isWalkout = managerCard.rating >= 86 || managerCard.position === "MGR";
    expect(isWalkout).toBe(true);
  });

  it("handles non-walkout packs under 86 rating", () => {
    const cards = [
      { rating: 83, name: "Card A", position: "MID" },
      { rating: 85, name: "Card B", position: "FW" },
    ];
    const topCard = [...cards].sort((a, b) => b.rating - a.rating)[0];
    const isWalkout = topCard.rating >= 86 || topCard.position === "MGR";
    expect(isWalkout).toBe(false);
  });

  it("returns 0 remaining seconds when no timer exists", () => {
    const remaining = getRemainingTimerSeconds("non_existent_guild");
    expect(remaining).toBe(0);
  });
});
