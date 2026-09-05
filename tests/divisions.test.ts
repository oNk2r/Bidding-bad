import { describe, it, expect } from "vitest";
import {
  calculateMatchRp,
  getDivisionByRp,
  DIVISIONS,
} from "../src/models/divisions.js";

describe("Division Rivals and Rank Points", () => {
  it("determines correct division by RP tier", () => {
    expect(getDivisionByRp(0).division).toBe(5); // Grassroots
    expect(getDivisionByRp(350).division).toBe(4); // Semi-Pro
    expect(getDivisionByRp(800).division).toBe(3); // Professional
    expect(getDivisionByRp(1300).division).toBe(2); // Champions League
    expect(getDivisionByRp(2000).division).toBe(1); // Elite Masters
  });

  it("calculates match win RP with 3+ streak bonuses", () => {
    // Grassroots (Div 5): win = +35 RP. Streak >= 3: +10 bonus -> +45 RP.
    const { newRp, delta } = calculateMatchRp(100, "WIN", 3);
    expect(delta).toBe(45);
    expect(newRp).toBe(145);
  });

  it("protects Division 5 from loss RP deductions", () => {
    const { newRp, delta } = calculateMatchRp(100, "LOSS", 0);
    expect(delta).toBe(0);
    expect(newRp).toBe(100);
  });
});
