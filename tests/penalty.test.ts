import { describe, it, expect } from "vitest";
import { PenaltyShootoutState } from "../src/models/penalty.js";

describe("Penalty Shootout Mechanics", () => {
  it("processes a round of penalties and switches turns", () => {
    const state = new PenaltyShootoutState("home_1", "Home Manager", "away_1", "Away Manager", 100);

    expect(state.currentTurn).toBe("HOME");
    expect(state.currentRound).toBe(1);

    // Home shoots, Away dives
    const shot1 = state.processShot("TOP_RIGHT", "LEFT");
    expect(state.history.length).toBe(1);
    expect(state.currentTurn).toBe("AWAY");

    // Away shoots, Home dives
    const shot2 = state.processShot("BOTTOM_LEFT", "LEFT");
    expect(state.history.length).toBe(2);
    expect(state.currentTurn).toBe("HOME");
    expect(state.currentRound).toBe(2);
  });
});
