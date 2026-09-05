import { describe, it, expect } from "vitest";
import {
  calculateTacticalMatchup,
  getTacticInfo,
  TacticType,
} from "../src/models/tactics.js";

describe("Tactics and Counter Matrix", () => {
  it("resolves Tiki-Taka countering Park the Bus", () => {
    const tiki = getTacticInfo(TacticType.TIKI_TAKA);
    const bus = getTacticInfo(TacticType.PARK_THE_BUS);

    const { homeMod, awayMod, matchupNarrative } = calculateTacticalMatchup(tiki, bus);
    expect(homeMod).toBe(4.0);
    expect(awayMod).toBe(-2.0);
    expect(matchupNarrative).toContain("Tactical Advantage");
  });

  it("resolves Gegenpress countering Tiki-Taka", () => {
    const press = getTacticInfo(TacticType.GEGENPRESS);
    const tiki = getTacticInfo(TacticType.TIKI_TAKA);

    const { homeMod, awayMod } = calculateTacticalMatchup(press, tiki);
    expect(homeMod).toBe(4.0);
    expect(awayMod).toBe(-2.0);
  });

  it("handles mirror tactical matchups with 0 modifier", () => {
    const balanced1 = getTacticInfo(TacticType.BALANCED);
    const balanced2 = getTacticInfo(TacticType.BALANCED);

    const { homeMod, awayMod, matchupNarrative } = calculateTacticalMatchup(
      balanced1,
      balanced2
    );
    expect(homeMod).toBe(0.0);
    expect(awayMod).toBe(0.0);
    expect(matchupNarrative).toContain("Mirror Match");
  });
});
