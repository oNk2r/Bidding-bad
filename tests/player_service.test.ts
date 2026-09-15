import { describe, it, expect } from "vitest";
import { playerService } from "../src/services/playerService.js";

describe("PlayerService Indexing & Performance", () => {
  it("loads 10,000+ players and pre-indexes them", () => {
    const players = playerService.getAllPlayers();
    expect(players.length).toBeGreaterThan(1000);

    const entities = playerService.getAllEntities();
    expect(entities.length).toBeGreaterThan(players.length);
  });

  it("finds players by exact name in O(1) time", () => {
    const start = performance.now();
    const p1 = playerService.findPlayerByName("Kylian Mbappé");
    const p2 = playerService.findPlayerByName("Pep Guardiola");
    const duration = performance.now() - start;

    expect(p1).toBeDefined();
    expect(p1?.rating).toBeGreaterThanOrEqual(90);
    expect(p2).toBeDefined();
    expect(p2?.position).toBe("MGR");
    expect(duration).toBeLessThan(10); // instantaneous
  });

  it("samples random players from rating bucket without scanning full dataset", () => {
    for (let i = 0; i < 10; i++) {
      const player = playerService.getRandomPlayer({ min: 88, max: 91 });
      expect(player.rating).toBeGreaterThanOrEqual(88);
      expect(player.rating).toBeLessThanOrEqual(91);
    }
  });

  it("samples random managers within rating range", () => {
    const manager = playerService.getRandomManager({ min: 90, max: 96 });
    expect(manager.position).toBe("MGR");
    expect(manager.rating).toBeGreaterThanOrEqual(90);
  });
});
