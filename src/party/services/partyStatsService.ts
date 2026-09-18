import { prisma } from "../../database/client.js";
import type { PartyPlayerStats, ShareablePartyResult } from "../types.js";

export class PartyStatsService {
  async getPartyStats(userId: string): Promise<PartyPlayerStats> {
    try {
      const record = await prisma.gameRecord.findUnique({
        where: { key: `party_stats_${userId}` },
      });

      if (record) {
        const parsed = JSON.parse(record.value);
        return {
          userId,
          partyGames: parsed.partyGames || 0,
          partyWins: parsed.partyWins || 0,
          partyLosses: parsed.partyLosses || 0,
          partyAuctions: parsed.partyAuctions || 0,
          partyItemsWon: parsed.partyItemsWon || 0,
          partyMoneySpent: parsed.partyMoneySpent || 0,
          partyVotesReceived: parsed.partyVotesReceived || 0,
          partyCookAwards: parsed.partyCookAwards || 0,
          partyFraudAwards: parsed.partyFraudAwards || 0,
          partySnakeAwards: parsed.partySnakeAwards || 0,
          unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
            ? parsed.unlockedAchievements
            : [],
        };
      }
    } catch (err) {
      console.warn(`Could not load party stats for user ${userId}:`, err);
    }

    return {
      userId,
      partyGames: 0,
      partyWins: 0,
      partyLosses: 0,
      partyAuctions: 0,
      partyItemsWon: 0,
      partyMoneySpent: 0,
      partyVotesReceived: 0,
      partyCookAwards: 0,
      partyFraudAwards: 0,
      partySnakeAwards: 0,
      unlockedAchievements: [],
    };
  }

  async savePartyStats(stats: PartyPlayerStats): Promise<void> {
    try {
      await prisma.gameRecord.upsert({
        where: { key: `party_stats_${stats.userId}` },
        update: { value: JSON.stringify(stats) },
        create: {
          key: `party_stats_${stats.userId}`,
          value: JSON.stringify(stats),
        },
      });
    } catch (err) {
      console.error(`Failed to save party stats for ${stats.userId}:`, err);
    }
  }

  async recordGameResults(result: ShareablePartyResult): Promise<void> {
    try {
      // 1. Save game history record
      await prisma.gameRecord.upsert({
        where: { key: `party_game_${result.gameId}` },
        update: { value: JSON.stringify(result) },
        create: {
          key: `party_game_${result.gameId}`,
          value: JSON.stringify(result),
        },
      });

      const winnerId = result.winner.userId;
      const cookAward = result.awards.find((a) => a.id === "the_cook");
      const fraudAward = result.awards.find((a) => a.id === "the_fraud");
      const snakeAward = result.awards.find((a) => a.id === "snake");
      const auraAward = result.awards.find((a) => a.id === "aura_farmer");

      // 2. Update each participant's persistent profile
      for (const p of result.players) {
        const stats = await this.getPartyStats(p.userId);

        stats.partyGames++;
        stats.partyAuctions++;
        stats.partyItemsWon += p.items.length;
        stats.partyMoneySpent += p.spentPurse;
        stats.partyVotesReceived += p.votesReceived;

        const isWinner = p.userId === winnerId;
        if (isWinner) {
          stats.partyWins++;
        } else {
          stats.partyLosses++;
        }

        if (cookAward && cookAward.winnerId === p.userId) {
          stats.partyCookAwards++;
        }
        if (fraudAward && fraudAward.winnerId === p.userId) {
          stats.partyFraudAwards++;
        }
        if (snakeAward && snakeAward.winnerId === p.userId) {
          stats.partySnakeAwards++;
        }

        // Achievements verification
        const unlocked = new Set(stats.unlockedAchievements);

        // 1. 🔨 Auction Demon - Win 10 party auctions
        if (stats.partyWins >= 10) {
          unlocked.add("🔨 Auction Demon");
        }

        // 2. 💸 Financial Criminal - Spend 90%+ of your purse (>= 45 BB)
        if (p.spentPurse >= 45) {
          unlocked.add("💸 Financial Criminal");
        }

        // 3. 🧠 5D Chess - Win while spending the least
        const lowestSpent = Math.min(...result.players.map((pl) => pl.spentPurse));
        if (isWinner && p.spentPurse === lowestSpent) {
          unlocked.add("🧠 5D Chess");
        }

        // 4. 🐍 Snake - Outbid opponents multiple times (won snake award or high count)
        if (snakeAward && snakeAward.winnerId === p.userId) {
          unlocked.add("🐍 Snake");
        }

        // 5. 🔥 Aura Farmer - Win Aura award
        if (auraAward && auraAward.winnerId === p.userId) {
          unlocked.add("🔥 Aura Farmer");
        }

        stats.unlockedAchievements = Array.from(unlocked);
        await this.savePartyStats(stats);
      }
    } catch (err) {
      console.error("Error recording party game results:", err);
    }
  }
}

export const partyStatsService = new PartyStatsService();
