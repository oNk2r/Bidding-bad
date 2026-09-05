import { describe, it, expect } from "vitest";
import { renderPlayerCard } from "../src/ui/canvas/cardCanvas.js";
import { renderPitchSquad } from "../src/ui/canvas/pitchCanvas.js";

describe("Canvas Graphics Engine", () => {
  it("renders a valid PNG buffer for an Icon player card", async () => {
    const buffer = await renderPlayerCard({
      name: "Pelé",
      position: "FW",
      rating: 95,
      club: "Santos",
      nation: "Brazil",
      value: 2000,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // Verify PNG magic header bytes: 0x89, 0x50, 0x4E, 0x47
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4e);
    expect(buffer[3]).toBe(0x47);
  });

  it("renders a valid PNG buffer for a Gold card", async () => {
    const buffer = await renderPlayerCard({
      name: "Bukayo Saka",
      position: "FW",
      rating: 87,
      club: "Arsenal",
      nation: "England",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("renders a valid tactical pitch buffer", async () => {
    const mockCards = [
      { id: "1", userId: "u1", cardId: "c1", name: "Alisson", position: "GK", rating: 89, club: "Liverpool", nation: "Brazil", value: 750, untradeable: false, isStarting5: true, cardData: null, createdAt: new Date() },
      { id: "2", userId: "u1", cardId: "c2", name: "Virgil van Dijk", position: "DEF", rating: 89, club: "Liverpool", nation: "Netherlands", value: 750, untradeable: false, isStarting5: true, cardData: null, createdAt: new Date() },
      { id: "3", userId: "u1", cardId: "c3", name: "Kevin De Bruyne", position: "MID", rating: 91, club: "Man City", nation: "Belgium", value: 2000, untradeable: false, isStarting5: true, cardData: null, createdAt: new Date() },
      { id: "4", userId: "u1", cardId: "c4", name: "Jude Bellingham", position: "MID", rating: 90, club: "Real Madrid", nation: "England", value: 1200, untradeable: false, isStarting5: true, cardData: null, createdAt: new Date() },
      { id: "5", userId: "u1", cardId: "c5", name: "Erling Haaland", position: "FW", rating: 91, club: "Man City", nation: "Norway", value: 2000, untradeable: false, isStarting5: true, cardData: null, createdAt: new Date() },
    ];

    const pitchBuffer = await renderPitchSquad("FC Bidding Bad", "🔴⚪", mockCards);
    expect(pitchBuffer).toBeInstanceOf(Buffer);
    expect(pitchBuffer.length).toBeGreaterThan(1000);
    expect(pitchBuffer[0]).toBe(0x89);
  });
});
