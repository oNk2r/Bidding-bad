import { describe, it, expect } from "vitest";
import { calculatePlayerValue, getCardTier } from "../src/models/player.js";
import { STADIUM_TIERS, getStadiumTier } from "../src/models/stadium.js";
import { spinWheel, SPIN_SECTORS } from "../src/models/spin.js";

describe("Economy Models and Calculations", () => {
  it("calculates player card values based on OVR tier", () => {
    expect(calculatePlayerValue(80)).toBe(120);
    expect(calculatePlayerValue(86)).toBe(180);
    expect(calculatePlayerValue(87)).toBe(280);
    expect(calculatePlayerValue(88)).toBe(450);
    expect(calculatePlayerValue(89)).toBe(750);
    expect(calculatePlayerValue(90)).toBe(1200);
    expect(calculatePlayerValue(94)).toBe(2000);
  });

  it("assigns card tier badges and names", () => {
    expect(getCardTier(80).tierName).toBe("Silver Star");
    expect(getCardTier(86).tierName).toBe("Gold Rare");
    expect(getCardTier(88).tierName).toBe("World Class");
    expect(getCardTier(90).tierName).toBe("Superstar");
    expect(getCardTier(95).tierName).toBe("Icon Legend");
  });

  it("provides 5 stadium infrastructure tiers with increasing capacity and revenue", () => {
    expect(getStadiumTier(1).capacity).toBe(5000);
    expect(getStadiumTier(1).revenuePerClaim).toBe(100);

    expect(getStadiumTier(5).capacity).toBe(110000);
    expect(getStadiumTier(5).revenuePerClaim).toBe(1500);
    expect(getStadiumTier(5).homeMoraleBuff).toBe(5.0);
  });

  it("spins wheel and returns weighted valid sector", () => {
    for (let i = 0; i < 20; i++) {
      const sector = spinWheel();
      expect(SPIN_SECTORS.some((s) => s.name === sector.name)).toBe(true);
    }
  });

  it("selects optimal Starting 5 lineup with valid positions and highest ratings", async () => {
    const { Squad } = await import("../src/models/squad.js");
    const { Player } = await import("../src/models/player.js");

    const sampleInventory = [
      { name: "Alisson", position: "GK", rating: 89, club: "Liverpool", nation: "Brazil" },
      { name: "Ederson", position: "GK", rating: 88, club: "Man City", nation: "Brazil" },
      { name: "Van Dijk", position: "DEF", rating: 89, club: "Liverpool", nation: "Netherlands" },
      { name: "Dias", position: "DEF", rating: 88, club: "Man City", nation: "Portugal" },
      { name: "Saliba", position: "DEF", rating: 86, club: "Arsenal", nation: "France" },
      { name: "De Bruyne", position: "MID", rating: 91, club: "Man City", nation: "Belgium" },
      { name: "Rodri", position: "MID", rating: 89, club: "Man City", nation: "Spain" },
      { name: "Haaland", position: "FW", rating: 91, club: "Man City", nation: "Norway" },
      { name: "Salah", position: "FW", rating: 89, club: "Liverpool", nation: "Egypt" },
    ];

    const sorted = [...sampleInventory].sort((a, b) => b.rating - a.rating);
    const autoSquad = new Squad();

    const bestGk = sorted.find((c) => c.position === "GK");
    if (bestGk) {
      autoSquad.addPlayer(new Player(bestGk.name, bestGk.position as any, bestGk.rating, 1, 0, bestGk.club, bestGk.nation));
    }

    for (const card of sorted) {
      if (autoSquad.players.length >= 5) break;
      if (card.name === bestGk?.name) continue;
      const p = new Player(card.name, card.position as any, card.rating, 1, 0, card.club, card.nation);
      if (autoSquad.canAddPlayer(p).canAdd) {
        autoSquad.addPlayer(p);
      }
    }

    expect(autoSquad.isValid()).toBe(true);
    expect(autoSquad.players.length).toBe(5);
    expect(autoSquad.players.some((p) => p.name === "Alisson")).toBe(true);
    expect(autoSquad.players.some((p) => p.name === "De Bruyne")).toBe(true);
    expect(autoSquad.players.some((p) => p.name === "Haaland")).toBe(true);
  });
});
