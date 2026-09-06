import { describe, it, expect } from "vitest";
import { createClubEmbed } from "../src/ui/embeds/clubEmbeds.js";
import { Squad } from "../src/models/squad.js";
import type { InventoryCard } from "@prisma/client";

describe("Club Identity & Head Coach", () => {
  it("builds a formatted club embed displaying Head Coach, Captain, and finances", () => {
    const mockManager: InventoryCard = {
      id: "mgr-1",
      userId: "user-1",
      cardId: "pep_guardiola",
      name: "Pep Guardiola",
      position: "MGR",
      rating: 94,
      club: "Manchester City",
      nation: "Spain",
      value: 3000,
      untradeable: false,
      isStarting5: false,
      cardData: null,
      createdAt: new Date(),
    };

    const mockCaptain: InventoryCard = {
      id: "cap-1",
      userId: "user-1",
      cardId: "erling_haaland",
      name: "Erling Håland",
      position: "FW",
      rating: 90,
      club: "Manchester City",
      nation: "Norway",
      value: 2000,
      untradeable: false,
      isStarting5: true,
      cardData: null,
      createdAt: new Date(),
    };

    const embed = createClubEmbed({
      userName: "TestManager",
      clubName: "Galácticos FC",
      kitEmoji: "⚪🟣",
      motto: "Hala Madrid",
      tacticName: "GEGENPRESS",
      captain: mockCaptain,
      managerCard: mockManager,
      squad: new Squad([]),
      coins: 5000,
      clubValue: 12000,
      cardCount: 15,
    });

    const data = embed.toJSON();
    expect(data.title).toContain("Galácticos FC");
    expect(data.description).toContain("Pep Guardiola");
    expect(data.description).toContain("Erling Håland");
    expect(data.footer?.text).toContain("/lineup");
    expect(data.footer?.text).not.toContain("/banner");
  });
});
