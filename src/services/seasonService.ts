import { prisma } from "../database/client.js";
import { economyService } from "./economyService.js";
import { playerService } from "./playerService.js";

export const CURRENT_SEASON = 1;

export interface SeasonTier {
  level: number;
  sxpRequired: number;
  title: string;
  rewardType: "COINS" | "PACK" | "CARD" | "ICON" | "HYBRID";
  rewardDesc: string;
  coinAmount?: number;
  cardMinRating?: number;
  packType?: "standard" | "premium";
  packCount?: number;
}

export const SEASON_TIERS: SeasonTier[] = [
  { level: 1, sxpRequired: 100, title: "Kickoff Bonus", rewardType: "COINS", rewardDesc: "💰 500 Coins", coinAmount: 500 },
  { level: 2, sxpRequired: 250, title: "Scout Pack", rewardType: "PACK", rewardDesc: "📦 1x Standard Pack", packType: "standard", packCount: 1 },
  { level: 3, sxpRequired: 450, title: "Club Treasury", rewardType: "COINS", rewardDesc: "💰 1,000 Coins", coinAmount: 1000 },
  { level: 4, sxpRequired: 700, title: "Gold Reinforcement", rewardType: "CARD", rewardDesc: "🥇 Guaranteed 86+ Rated Card", cardMinRating: 86 },
  { level: 5, sxpRequired: 1000, title: "Pro Pack", rewardType: "PACK", rewardDesc: "🔥 1x Premium Pack", packType: "premium", packCount: 1 },
  { level: 6, sxpRequired: 1400, title: "Matchday Revenue", rewardType: "COINS", rewardDesc: "💰 2,500 Coins", coinAmount: 2500 },
  { level: 7, sxpRequired: 1900, title: "Tactical Upgrade", rewardType: "CARD", rewardDesc: "💎 Guaranteed 87+ Rated Card", cardMinRating: 87 },
  { level: 8, sxpRequired: 2500, title: "Jumbo Pro Pack", rewardType: "HYBRID", rewardDesc: "🔥 2x Premium Packs + 💰 1,500 Coins", coinAmount: 1500, packType: "premium", packCount: 2 },
  { level: 9, sxpRequired: 3200, title: "World Class Scout", rewardType: "CARD", rewardDesc: "💎 Guaranteed 88+ World Class Card", cardMinRating: 88 },
  { level: 10, sxpRequired: 4000, title: "Halfway Milestone", rewardType: "HYBRID", rewardDesc: "💰 5,000 Coins + 📦 Standard Pack", coinAmount: 5000, packType: "standard", packCount: 1 },
  { level: 11, sxpRequired: 5000, title: "Superstar Signing", rewardType: "CARD", rewardDesc: "🔥 Guaranteed 89+ Superstar Card", cardMinRating: 89 },
  { level: 12, sxpRequired: 6200, title: "Syndicate Payout", rewardType: "COINS", rewardDesc: "💰 7,500 Coins", coinAmount: 7500 },
  { level: 13, sxpRequired: 7600, title: "Champions Stash", rewardType: "PACK", rewardDesc: "👑 3x Premium Packs", packType: "premium", packCount: 3 },
  { level: 14, sxpRequired: 9200, title: "Grand Treasury", rewardType: "COINS", rewardDesc: "💰 10,000 Coins", coinAmount: 10000 },
  { level: 15, sxpRequired: 11000, title: "ICON LEGEND SUMMIT", rewardType: "ICON", rewardDesc: "👑 Guaranteed 91+ ICON LEGEND + 💰 15,000 Coins", coinAmount: 15000, cardMinRating: 91 },
];

export interface UserSeasonData {
  sxp: number;
  claimedLevels: number[];
  seasonNumber?: number;
}

export class SeasonService {
  getCurrentSeason(): number {
    return CURRENT_SEASON;
  }

  private async getData(userId: string): Promise<UserSeasonData> {
    const currentKey = `season_pass_s${CURRENT_SEASON}_${userId}`;
    let record = await prisma.gameRecord.findUnique({
      where: { key: currentKey },
    });

    // Backwards compatibility with legacy key for Season 1
    if (!record && CURRENT_SEASON === 1) {
      record = await prisma.gameRecord.findUnique({
        where: { key: `season_pass_${userId}` },
      });
    }

    if (!record) {
      return { sxp: 0, claimedLevels: [], seasonNumber: CURRENT_SEASON };
    }

    try {
      const parsed = JSON.parse(record.value) as UserSeasonData;
      return {
        sxp: parsed.sxp || 0,
        claimedLevels: parsed.claimedLevels || [],
        seasonNumber: parsed.seasonNumber || CURRENT_SEASON,
      };
    } catch {
      return { sxp: 0, claimedLevels: [], seasonNumber: CURRENT_SEASON };
    }
  }

  private async saveData(userId: string, data: UserSeasonData): Promise<void> {
    const currentKey = `season_pass_s${CURRENT_SEASON}_${userId}`;
    const payload = { ...data, seasonNumber: CURRENT_SEASON };
    await prisma.gameRecord.upsert({
      where: { key: currentKey },
      update: { value: JSON.stringify(payload) },
      create: { key: currentKey, value: JSON.stringify(payload) },
    });
  }

  async addSxp(userId: string, amount: number): Promise<{ oldSxp: number; newSxp: number; level: number }> {
    const data = await this.getData(userId);
    const oldSxp = data.sxp;
    data.sxp += amount;
    await this.saveData(userId, data);

    const level = this.calculateLevel(data.sxp);
    return { oldSxp, newSxp: data.sxp, level };
  }

  calculateLevel(sxp: number): number {
    let currentLevel = 0;
    for (const tier of SEASON_TIERS) {
      if (sxp >= tier.sxpRequired) {
        currentLevel = tier.level;
      } else {
        break;
      }
    }
    return currentLevel;
  }

  async getProfile(userId: string) {
    const data = await this.getData(userId);
    const currentLevel = this.calculateLevel(data.sxp);
    const nextTier = SEASON_TIERS.find((t) => t.level === currentLevel + 1);

    return {
      seasonNumber: CURRENT_SEASON,
      sxp: data.sxp,
      currentLevel,
      claimedLevels: data.claimedLevels,
      nextTier,
      tiers: SEASON_TIERS,
    };
  }

  async claimTier(userId: string, level: number, userName?: string): Promise<{ success: boolean; message: string }> {
    const tier = SEASON_TIERS.find((t) => t.level === level);
    if (!tier) {
      return { success: false, message: "❌ Invalid Season tier level." };
    }

    const data = await this.getData(userId);
    if (data.sxp < tier.sxpRequired) {
      return { success: false, message: `❌ You need **${tier.sxpRequired.toLocaleString()} SXP** to unlock Tier ${level} (You have: **${data.sxp.toLocaleString()} SXP**).` };
    }

    if (data.claimedLevels.includes(level)) {
      return { success: false, message: `❌ You have already claimed Tier ${level} rewards.` };
    }

    // Award coins if specified
    if (tier.coinAmount) {
      await economyService.addCoins(userId, tier.coinAmount, userName);
    }

    // Award packs if specified
    if (tier.packCount && tier.packType) {
      for (let i = 0; i < tier.packCount; i++) {
        await economyService.openPack(userId, tier.packType, userName);
      }
    } else if (tier.rewardType === "PACK") {
      await economyService.openPack(userId, "standard", userName);
    }

    // Award player/icon card if specified
    if (tier.cardMinRating) {
      const eligiblePlayers = playerService.getAllPlayers().filter((p) => p.rating >= tier.cardMinRating!);
      if (eligiblePlayers.length > 0) {
        const randomPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        await economyService.addCardToInventory(userId, randomPlayer, false);
      }
    }

    data.claimedLevels.push(level);
    await this.saveData(userId, data);

    return {
      success: true,
      message: `🎉 Successfully claimed **Tier ${level} Reward**: ${tier.rewardDesc}!`,
    };
  }
}

export const seasonService = new SeasonService();
