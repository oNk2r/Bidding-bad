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

    // Tier 5 awards 1x Premium Pack
    const tier5 = SEASON_TIERS.find((t) => t.level === 5);
    expect(tier5?.packType).toBe("premium");
    expect(tier5?.packCount).toBe(1);

    // Tier 8 awards 2x Premium Packs + 1500 coins
    const tier8 = SEASON_TIERS.find((t) => t.level === 8);
    expect(tier8?.packType).toBe("premium");
    expect(tier8?.packCount).toBe(2);
    expect(tier8?.coinAmount).toBe(1500);

    // Tier 13 awards 3x Premium Packs
    const tier13 = SEASON_TIERS.find((t) => t.level === 13);
    expect(tier13?.packType).toBe("premium");
    expect(tier13?.packCount).toBe(3);
  });

  it("exposes current season number", () => {
    expect(seasonService.getCurrentSeason()).toBe(1);
  });
});
