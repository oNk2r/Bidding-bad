import { describe, it, expect } from "vitest";
import { Squad } from "../src/models/squad.js";
import { Player } from "../src/models/player.js";

describe("Squad Domain Model", () => {
  it("allows adding 1 GK, 1 DEF, 1 MID, 1 FW and 1 FLEX position", () => {
    const squad = new Squad();

    const gk = new Player("Alisson", "GK", 89, 4, 0, "Liverpool", "Brazil");
    const def1 = new Player("Van Dijk", "DEF", 89, 4, 0, "Liverpool", "Netherlands");
    const def2 = new Player("Alexander-Arnold", "DEF", 86, 3, 0, "Liverpool", "England");
    const mid = new Player("De Bruyne", "MID", 90, 5, 0, "Man City", "Belgium");
    const fw = new Player("Haaland", "FW", 91, 5, 0, "Man City", "Norway");

    expect(squad.canAddPlayer(gk).canAdd).toBe(true);
    squad.addPlayer(gk);

    expect(squad.canAddPlayer(def1).canAdd).toBe(true);
    squad.addPlayer(def1);

    expect(squad.canAddPlayer(def2).canAdd).toBe(true);
    squad.addPlayer(def2);

    expect(squad.canAddPlayer(mid).canAdd).toBe(true);
    squad.addPlayer(mid);

    expect(squad.canAddPlayer(fw).canAdd).toBe(true);
    squad.addPlayer(fw);

    expect(squad.isValid()).toBe(true);
    expect(squad.players.length).toBe(5);
  });

  it("prevents adding more than 1 Goalkeeper", () => {
    const squad = new Squad();
    const gk1 = new Player("Alisson", "GK", 89, 4);
    const gk2 = new Player("Ederson", "GK", 88, 4);

    squad.addPlayer(gk1);
    const res = squad.canAddPlayer(gk2);
    expect(res.canAdd).toBe(false);
    expect(res.reason).toContain("Max 1 GK");
  });

  it("prevents adding more than 2 of any position", () => {
    const squad = new Squad();
    const fw1 = new Player("Haaland", "FW", 91, 5);
    const fw2 = new Player("Kane", "FW", 89, 4);
    const fw3 = new Player("Lewandowski", "FW", 88, 4);

    squad.addPlayer(fw1);
    squad.addPlayer(fw2);
    const res = squad.canAddPlayer(fw3);
    expect(res.canAdd).toBe(false);
    expect(res.reason).toContain("at most 2");
  });

  it("prevents adding a second flex position when core positions are missing", () => {
    const squad = new Squad();
    const def1 = new Player("Van Dijk", "DEF", 89, 4);
    const def2 = new Player("Dias", "DEF", 88, 4);
    const mid1 = new Player("Rodri", "MID", 90, 5);
    const mid2 = new Player("De Bruyne", "MID", 90, 5);

    squad.addPlayer(def1);
    squad.addPlayer(def2); // Flex #1 (DEF)
    squad.addPlayer(mid1);

    const res = squad.canAddPlayer(mid2); // Flex #2 (MID)
    expect(res.canAdd).toBe(false);
    expect(res.reason).toContain("Only 1 FLEX position is allowed");
  });
});
