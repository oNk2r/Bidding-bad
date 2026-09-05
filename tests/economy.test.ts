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
});
