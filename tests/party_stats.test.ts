import { describe, it, expect, vi, afterEach } from "vitest";
import { partyStatsService } from "../src/party/services/partyStatsService.js";
import { getAllCategories, getCategory, getCategoryItems } from "../src/party/categories/index.js";
import type { ShareablePartyResult } from "../src/party/types.js";
import { prisma } from "../src/database/client.js";

describe("Party Stats, Achievements & Categories", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads all 10 party categories properly", () => {
    const categories = getAllCategories();
    expect(categories.length).toBe(10);

    const expected = [
      "football",
      "cricket",
      "basketball",
      "movies",
      "tv",
      "games",
      "superheroes",
      "anime",
      "music",
      "random",
    ];

    for (const catId of expected) {
      const cat = getCategory(catId);
      expect(cat).toBeDefined();
      expect(cat!.id).toBe(catId);
      expect(cat!.scenarios.length).toBeGreaterThanOrEqual(5);

      const items = getCategoryItems(catId, 15);
      expect(items.length).toBeGreaterThanOrEqual(15);
      for (const item of items) {
        expect(item.name).toBeTruthy();
        expect(item.tags.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("records game results and unlocks achievements", async () => {
    // Mock prisma.gameRecord.findUnique and upsert
    const mockStore: Record<string, string> = {};

    vi.spyOn(prisma.gameRecord, "findUnique").mockImplementation(async ({ where }: { where: { key: string } }) => {
      const val = mockStore[where.key];
      return val ? ({ key: where.key, value: val, updatedAt: new Date() } as any) : null;
    });

    vi.spyOn(prisma.gameRecord, "upsert").mockImplementation(
      async ({
        where,
        create,
        update,
      }: {
        where: { key: string };
        create: { key: string; value: string };
        update: { value: string };
      }) => {
        mockStore[where.key] = update?.value ?? create?.value ?? "";
        return { key: where.key, value: mockStore[where.key], updatedAt: new Date() } as any;
      }
    );

    const sampleResult: ShareablePartyResult = {
      gameId: "test_game_123",
      guildId: "g1",
      channelId: "c1",
      completedAt: new Date().toISOString(),
      category: { id: "football", name: "Football", emoji: "⚽" },
      scenario: { id: "s1", title: "Test Scenario", description: "Desc" },
      players: [
        {
          userId: "user_winner",
          displayName: "Winner",
          items: [
            { name: "Item 1", price: 10, tags: ["goat"] },
            { name: "Item 2", price: 10, tags: ["legend"] },
            { name: "Item 3", price: 10, tags: ["speed"] },
            { name: "Item 4", price: 10, tags: ["dribbler"] },
            { name: "Item 5", price: 6, tags: ["clutch"] },
          ],
          remainingPurse: 4,
          spentPurse: 46, // >= 45 BB -> Financial Criminal
          votesReceived: 3,
        },
        {
          userId: "user_runnerup",
          displayName: "Runner Up",
          items: [],
          remainingPurse: 30,
          spentPurse: 20,
          votesReceived: 1,
        },
      ],
      winner: { userId: "user_winner", displayName: "Winner", votes: 3 },
      awards: [
        {
          id: "the_cook",
          title: "The Cook",
          emoji: "🏆",
          description: "Best team",
          winnerId: "user_winner",
          winnerName: "Winner",
          reason: "Cooked",
        },
        {
          id: "snake",
          title: "The Snake",
          emoji: "🐍",
          description: "Outbids",
          winnerId: "user_winner",
          winnerName: "Winner",
          reason: "Sniped",
        },
      ],
      totalSpending: { Winner: 46, "Runner Up": 20 },
    };

    await partyStatsService.recordGameResults(sampleResult);

    const stats = await partyStatsService.getPartyStats("user_winner");
    expect(stats.partyGames).toBe(1);
    expect(stats.partyWins).toBe(1);
    expect(stats.partyMoneySpent).toBe(46);
    expect(stats.partyCookAwards).toBe(1);
    expect(stats.partySnakeAwards).toBe(1);
    expect(stats.unlockedAchievements).toContain("💸 Financial Criminal");
    expect(stats.unlockedAchievements).toContain("🐍 Snake");

    const loserStats = await partyStatsService.getPartyStats("user_runnerup");
    expect(loserStats.partyGames).toBe(1);
    expect(loserStats.partyWins).toBe(0);
    expect(loserStats.partyLosses).toBe(1);
  });
});
