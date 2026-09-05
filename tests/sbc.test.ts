import { describe, it, expect } from "vitest";
import { getSbcById, validateSbcSubmission, type SubmittedCard } from "../src/models/sbc.js";

describe("Squad Building Challenges (SBC)", () => {
  it("validates Grassroots Warmup requirements (3 players <= 85 OVR)", () => {
    const sbc = getSbcById("sbc_daily_recycle")!;
    expect(sbc).toBeDefined();

    const validCards: SubmittedCard[] = [
      { id: "1", cardId: "p1", name: "Player 1", rating: 80, position: "MID", club: "A", nation: "X" },
      { id: "2", cardId: "p2", name: "Player 2", rating: 82, position: "DEF", club: "B", nation: "Y" },
      { id: "3", cardId: "p3", name: "Player 3", rating: 84, position: "FW", club: "C", nation: "Z" },
    ];

    const res = validateSbcSubmission(sbc, validCards);
    expect(res.valid).toBe(true);

    const invalidCardOverRating: SubmittedCard[] = [
      { id: "1", cardId: "p1", name: "Player 1", rating: 80, position: "MID", club: "A", nation: "X" },
      { id: "2", cardId: "p2", name: "Player 2", rating: 82, position: "DEF", club: "B", nation: "Y" },
      { id: "3", cardId: "p3", name: "Player 3", rating: 90, position: "FW", club: "C", nation: "Z" },
    ];
    const invalidRes = validateSbcSubmission(sbc, invalidCardOverRating);
    expect(invalidRes.valid).toBe(false);
  });

  it("validates Pelé Icon Tribute requirements (5 players, avg 88+ OVR, 2+ Brazil)", () => {
    const sbc = getSbcById("sbc_icon_pele")!;
    expect(sbc).toBeDefined();

    const validCards: SubmittedCard[] = [
      { id: "1", cardId: "p1", name: "Alisson", rating: 89, position: "GK", club: "Liverpool", nation: "Brazil" },
      { id: "2", cardId: "p2", name: "Vinicius Jr", rating: 90, position: "FW", club: "Real Madrid", nation: "Brazil" },
      { id: "3", cardId: "p3", name: "Mbappe", rating: 92, position: "FW", club: "Real Madrid", nation: "France" },
      { id: "4", cardId: "p4", name: "Rodri", rating: 90, position: "MID", club: "Man City", nation: "Spain" },
      { id: "5", cardId: "p5", name: "Van Dijk", rating: 89, position: "DEF", club: "Liverpool", nation: "Netherlands" },
    ];

    const res = validateSbcSubmission(sbc, validCards);
    expect(res.valid).toBe(true);
  });
});
