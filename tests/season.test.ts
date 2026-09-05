import { describe, it, expect } from "vitest";
import { seasonService, SEASON_TIERS } from "../src/services/seasonService.js";

describe("Season Battle Pass Service", () => {
  it("calculates level 0 for 0 SXP", () => {
    const level = seasonService.calculateLevel(0);
    expect(level).toBe(0);
  });

  it("calculates correct tier levels based on SXP milestones", () => {
    expect(seasonService.calculateLevel(100)).toBe(1);
    expect(seasonService.calculateLevel(250)).toBe(2);
    expect(seasonService.calculateLevel(999)).toBe(4);
    expect(seasonService.calculateLevel(1000)).toBe(5);
    expect(seasonService.calculateLevel(11000)).toBe(15);
  });

  it("contains 15 configured tiers with rewards", () => {
    expect(SEASON_TIERS.length).toBe(15);
    expect(SEASON_TIERS[0].level).toBe(1);
    expect(SEASON_TIERS[14].level).toBe(15);
    expect(SEASON_TIERS[14].rewardType).toBe("ICON");
  });
});
