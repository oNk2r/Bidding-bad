import { describe, it, expect } from "vitest";
import { dailyShopService } from "../src/services/dailyShopService.js";
import { playerService } from "../src/services/playerService.js";

describe("Daily Shop 24-Hour Cycle & Managers", () => {
  it("generates deterministic offers for the same date key", () => {
    const dateKey = "2026-09-06";
    const run1 = dailyShopService.getDailyOffers(dateKey);
    const run2 = dailyShopService.getDailyOffers(dateKey);

    expect(run1.length).toBe(4);
    expect(run2.length).toBe(4);

    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].id).toBe(run2[i].id);
      expect(run1[i].name).toBe(run2[i].name);
      expect(run1[i].rating).toBe(run2[i].rating);
      expect(run1[i].price).toBe(run2[i].price);
    }
  });

  it("rotates offers when date key changes", () => {
    const day1 = dailyShopService.getDailyOffers("2026-09-06");
    const day2 = dailyShopService.getDailyOffers("2026-09-07");

    const names1 = day1.map((o) => o.name).join(",");
    const names2 = day2.map((o) => o.name).join(",");

    expect(names1).not.toBe(names2);
  });

  it("includes both footballers and tactical managers in daily showcase", () => {
    const offers = dailyShopService.getDailyOffers("2026-09-06");
    
    // Last offer is a dedicated manager slot
    const managerOffer = offers.find((o) => o.isManager || o.position === "MGR");
    expect(managerOffer).toBeDefined();
    expect(managerOffer?.rating).toBeGreaterThanOrEqual(88);

    // Offers have direct signing prices > 0
    for (const o of offers) {
      expect(o.price).toBeGreaterThan(0);
      expect(o.tierName).toBeDefined();
    }
  });

  it("loads legendary managers in playerService", () => {
    const managers = playerService.getAllManagers();
    expect(managers.length).toBeGreaterThanOrEqual(10);

    const pep = playerService.findPlayerByName("Pep Guardiola");
    expect(pep).toBeDefined();
    expect(pep?.position).toBe("MGR");
    expect(pep?.rating).toBeGreaterThanOrEqual(90);

    const ferguson = playerService.findPlayerByName("Sir Alex Ferguson");
    expect(ferguson).toBeDefined();
    expect(ferguson?.position).toBe("MGR");
    expect(ferguson?.rating).toBeGreaterThanOrEqual(95);

    const klopp = playerService.findPlayerByName("Jürgen Klopp");
    expect(klopp).toBeDefined();
    expect(klopp?.position).toBe("MGR");
  });

  it("allows searching for both players and managers", () => {
    const results = playerService.searchPlayers("Ancelotti");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain("Ancelotti");
    expect(results[0].position).toBe("MGR");
  });
});
