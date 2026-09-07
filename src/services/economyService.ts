import { prisma } from "../database/client.js";
import { playerService } from "./playerService.js";
import { calculatePlayerValue, getCardTier, Player, type PlayerData } from "../models/player.js";
import { Squad } from "../models/squad.js";
import { getStadiumTier, STADIUM_TIERS, type StadiumTierInfo } from "../models/stadium.js";
import { spinWheel, type SpinSector } from "../models/spin.js";
import { MAX_INVENTORY_CARDS, type Position } from "../config/constants.js";
import type { InventoryCard, User } from "@prisma/client";

export interface DropClaimResult {
  card: {
    id: string;
    name: string;
    position: Position;
    rating: number;
    club: string;
    nation: string;
    value: number;
    tierName: string;
    tierBadge: string;
  };
  bonusCoins: number;
  newBalance: number;
}

export interface PackOpenResult {
  packType: "standard" | "premium";
  cost: number;
  cards: {
    id: string;
    name: string;
    position: Position;
    rating: number;
    club: string;
    nation: string;
    value: number;
    tierName: string;
    tierBadge: string;
    untradeable: boolean;
  }[];
  newBalance: number;
}

export class EconomyService {
  private recentPacks = new Map<string, { cardIds: string[]; timestamp: number }>();

  registerRecentPack(userId: string, cardIds: string[]): void {
    this.recentPacks.set(userId, { cardIds, timestamp: Date.now() });
  }

  getRecentPack(userId: string): string[] | null {
    const entry = this.recentPacks.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
      this.recentPacks.delete(userId);
      return null;
    }
    return entry.cardIds;
  }

  async quicksellRecentPack(userId: string): Promise<{
    success: boolean;
    message: string;
    count: number;
    totalCoins: number;
    newBalance?: number;
  }> {
    const cardIds = this.getRecentPack(userId);
    if (!cardIds || cardIds.length === 0) {
      return {
        success: false,
        message: "❌ No recent pack cards found or the session expired. Use `/quicksell` to liquidate cards.",
        count: 0,
        totalCoins: 0,
      };
    }

    const res = await this.quicksellMultipleCards(userId, cardIds);
    if (res.success) {
      this.recentPacks.delete(userId);
    }
    return res;
  }

  async ensureUser(userId: string, userName?: string): Promise<User> {
    return prisma.user.upsert({
      where: { id: userId },
      update: {
        ...(userName ? { name: userName } : {}),
      },
      create: {
        id: userId,
        name: userName || `Manager ${userId}`,
        coins: 1000,
        rating: 1000,
        clubName: "FC Bidding Bad",
        kitEmoji: "🔴⚪",
        tactic: "BALANCED",
      },
    });
  }

  async getCoins(userId: string): Promise<number> {
    const user = await this.ensureUser(userId);
    return user.coins;
  }

  async addCoins(userId: string, amount: number, userName?: string): Promise<number> {
    if (amount <= 0) return this.getCoins(userId);

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        coins: { increment: amount },
        ...(userName ? { name: userName } : {}),
      },
      create: {
        id: userId,
        name: userName || `Manager ${userId}`,
        coins: 1000 + amount,
      },
    });

    return user.coins;
  }

  async deductCoins(userId: string, amount: number): Promise<boolean> {
    if (amount <= 0) return true;

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.coins < amount) {
        return false;
      }

      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: amount } },
      });
      return true;
    });
  }

  async getInventory(userId: string): Promise<InventoryCard[]> {
    await this.ensureUser(userId);
    return prisma.inventoryCard.findMany({
      where: { userId },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    });
  }

  async addCard(
    userId: string,
    player: Player,
    untradeable = false,
    cardData?: Record<string, unknown>
  ): Promise<InventoryCard> {
    await this.ensureUser(userId);
    const value = calculatePlayerValue(player.rating);

    return prisma.inventoryCard.create({
      data: {
        userId,
        cardId: player.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        name: player.name,
        position: player.position,
        rating: player.rating,
        club: player.club,
        nation: player.nation,
        value,
        untradeable,
        cardData: cardData ? JSON.stringify(cardData) : null,
      },
    });
  }

  generatePlayerCard(packType: "standard" | "premium" | "daily" = "daily"): Player {
    let minRating = 75;
    let maxRating = 92;

    if (packType === "standard") {
      minRating = 78;
      maxRating = 91;
    } else if (packType === "premium") {
      minRating = 83;
      maxRating = 95;
    } else if (packType === "daily") {
      minRating = 76;
      maxRating = 89;
    }

    if (Math.random() < 0.10) {
      const mgr = playerService.getRandomManager({ min: minRating, max: maxRating });
      if (mgr) return mgr;
    }

    return playerService.getRandomPlayer({ min: minRating, max: maxRating });
  }

  async openPack(
    userId: string,
    packType: "standard" | "premium",
    userName?: string
  ): Promise<{ success: boolean; message: string; result?: PackOpenResult }> {
    const cost = packType === "standard" ? 500 : 1000;
    const count = packType === "standard" ? 1 : 3;

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.coins < cost) {
        return {
          success: false,
          message: `❌ Insufficient coins! **${packType.toUpperCase()} Pack** costs **${cost} coins** (You have: **${user?.coins ?? 0} coins**).`,
        };
      }

      const existingCount = await tx.inventoryCard.count({ where: { userId } });
      if (existingCount + count > MAX_INVENTORY_CARDS) {
        return {
          success: false,
          message: `❌ Inventory limit reached (**${existingCount}/${MAX_INVENTORY_CARDS} cards**)! Opening this pack requires **${count} slots**. Please \`/quicksell\` or \`/sell\` some cards first.`,
        };
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { decrement: cost },
          ...(userName ? { name: userName } : {}),
        },
      });

      const pulledCards = [];
      for (let i = 0; i < count; i++) {
        const player = this.generatePlayerCard(packType);
        const value = calculatePlayerValue(player.rating);
        const { tierName, tierBadge } = getCardTier(player.rating);

        const card = await tx.inventoryCard.create({
          data: {
            userId,
            cardId: player.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            name: player.name,
            position: player.position,
            rating: player.rating,
            club: player.club,
            nation: player.nation,
            value,
            untradeable: false,
          },
        });

        pulledCards.push({
          id: card.id,
          name: card.name,
          position: card.position as Position,
          rating: card.rating,
          club: card.club,
          nation: card.nation,
          value: card.value,
          tierName,
          tierBadge,
          untradeable: false,
        });
      }

      const updatedUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      this.registerRecentPack(userId, pulledCards.map((c) => c.id));

      return {
        success: true,
        message: "Pack opened successfully!",
        result: {
          packType,
          cost,
          cards: pulledCards,
          newBalance: updatedUser.coins,
        },
      };
    });
  }

  async quicksellCard(
    userId: string,
    cardIdentifier: string
  ): Promise<{ success: boolean; message: string; coinsEarned?: number; newBalance?: number }> {
    return prisma.$transaction(async (tx) => {
      const cards = await tx.inventoryCard.findMany({ where: { userId } });
      const target = cards.find(
        (c) =>
          c.id === cardIdentifier ||
          c.name.toLowerCase() === cardIdentifier.toLowerCase() ||
          c.name.toLowerCase().includes(cardIdentifier.toLowerCase())
      );

      if (!target) {
        return { success: false, message: `❌ Card \`${cardIdentifier}\` was not found in your inventory.` };
      }

      if (target.untradeable) {
        return { success: false, message: `❌ **${target.name}** is untradeable and cannot be sold.` };
      }

      const payout = target.value;
      await tx.inventoryCard.delete({ where: { id: target.id } });
      const user = await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: payout } },
      });

      return {
        success: true,
        message: `Sold **${target.name}** for **${payout.toLocaleString()} Coins**!`,
        coinsEarned: payout,
        newBalance: user.coins,
      };
    });
  }

  async quicksellMultipleCards(
    userId: string,
    cardIdentifiers: string[]
  ): Promise<{
    success: boolean;
    message: string;
    count: number;
    totalCoins: number;
    newBalance?: number;
  }> {
    if (cardIdentifiers.length === 0) {
      return { success: false, message: "❌ No cards selected for quicksell.", count: 0, totalCoins: 0 };
    }

    return prisma.$transaction(async (tx) => {
      const allCards = await tx.inventoryCard.findMany({ where: { userId } });
      const targets = allCards.filter((c) =>
        cardIdentifiers.some(
          (id) =>
            c.id === id ||
            c.name.toLowerCase() === id.toLowerCase()
        )
      );

      if (targets.length === 0) {
        return { success: false, message: "❌ Selected cards were not found in your inventory.", count: 0, totalCoins: 0 };
      }

      const tradable = targets.filter((c) => !c.untradeable);
      if (tradable.length === 0) {
        return { success: false, message: "❌ All selected cards are untradeable.", count: 0, totalCoins: 0 };
      }

      const totalPayout = tradable.reduce((sum, c) => sum + c.value, 0);
      const tradableIds = tradable.map((c) => c.id);

      await tx.inventoryCard.deleteMany({
        where: { id: { in: tradableIds } },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: totalPayout } },
      });

      return {
        success: true,
        message: `Successfully liquidated **${tradable.length} cards** for **+${totalPayout.toLocaleString()} Coins**!`,
        count: tradable.length,
        totalCoins: totalPayout,
        newBalance: user.coins,
      };
    });
  }

  async quicksellAllCards(userId: string): Promise<{
    success: boolean;
    message: string;
    count: number;
    totalCoins: number;
    newBalance?: number;
  }> {
    return prisma.$transaction(async (tx) => {
      const allCards = await tx.inventoryCard.findMany({ where: { userId } });
      const tradable = allCards.filter((c) => !c.untradeable);

      if (tradable.length === 0) {
        return {
          success: false,
          message: "❌ You have no tradable cards in your inventory to quicksell.",
          count: 0,
          totalCoins: 0,
        };
      }

      const totalPayout = tradable.reduce((sum, c) => sum + c.value, 0);
      const tradableIds = tradable.map((c) => c.id);

      await tx.inventoryCard.deleteMany({
        where: { id: { in: tradableIds } },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: { coins: { increment: totalPayout } },
      });

      return {
        success: true,
        message: `Successfully liquidated all **${tradable.length} tradable cards** for **+${totalPayout.toLocaleString()} Coins**!`,
        count: tradable.length,
        totalCoins: totalPayout,
        newBalance: user.coins,
      };
    });
  }

  async claimDailyReward(
    userId: string,
    userName?: string
  ): Promise<{
    success: boolean;
    message: string;
    streak?: number;
    coinsAwarded?: number;
    newBalance?: number;
    nextClaimTime?: number;
  }> {
    const now = Date.now() / 1000;
    const COOLDOWN = 20 * 3600; // 20 hours cooldown
    const STREAK_EXPIRY = 48 * 3600;

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: userId },
        update: { ...(userName ? { name: userName } : {}) },
        create: {
          id: userId,
          name: userName || `Manager ${userId}`,
          coins: 1000,
        },
      });

      const elapsed = now - user.lastDailyClaim;
      if (user.lastDailyClaim > 0 && elapsed < COOLDOWN) {
        const remaining = Math.ceil((COOLDOWN - elapsed) / 3600);
        return {
          success: false,
          message: `⏳ Daily reward already claimed! You can claim again in **${remaining} hours**.`,
          nextClaimTime: user.lastDailyClaim + COOLDOWN,
        };
      }

      let streak = user.dailyStreak;
      if (elapsed > STREAK_EXPIRY) {
        streak = 1;
      } else {
        streak += 1;
      }

      // Base: 250 coins + 50 per streak day (up to day 7 -> max 600)
      const bonus = Math.min(7, streak) * 50;
      const totalReward = 250 + bonus;

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: totalReward },
          dailyStreak: streak,
          lastDailyClaim: now,
        },
      });

      return {
        success: true,
        message: `Claimed daily reward!`,
        streak,
        coinsAwarded: totalReward,
        newBalance: updated.coins,
      };
    });
  }

  async claimDrop(
    userId: string,
    userName?: string
  ): Promise<{ success: boolean; message: string; result?: DropClaimResult }> {
    const now = Date.now() / 1000;
    const COOLDOWN = 6 * 3600; // 6 hours

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: userId },
        update: { ...(userName ? { name: userName } : {}) },
        create: {
          id: userId,
          name: userName || `Manager ${userId}`,
          coins: 1000,
        },
      });

      const elapsed = now - user.lastDropClaim;
      if (user.lastDropClaim > 0 && elapsed < COOLDOWN) {
        const remainingMinutes = Math.ceil((COOLDOWN - elapsed) / 60);
        const hours = Math.floor(remainingMinutes / 60);
        const mins = remainingMinutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        return {
          success: false,
          message: `⏳ Scout drop is still recharging! Available in **${timeStr}**.`,
        };
      }

      const existingCount = await tx.inventoryCard.count({ where: { userId } });
      if (existingCount >= MAX_INVENTORY_CARDS) {
        return {
          success: false,
          message: `❌ Inventory limit reached (**${existingCount}/${MAX_INVENTORY_CARDS} cards**)! Please \`/quicksell\` or \`/sell\` cards to free up slots before claiming scout drops.`,
        };
      }

      const player = this.generatePlayerCard("daily");
      const value = calculatePlayerValue(player.rating);
      const bonusCoins = Math.floor(Math.random() * 200) + 100;
      const { tierName, tierBadge } = getCardTier(player.rating);

      const card = await tx.inventoryCard.create({
        data: {
          userId,
          cardId: player.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          name: player.name,
          position: player.position,
          rating: player.rating,
          club: player.club,
          nation: player.nation,
          value,
          untradeable: false,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: bonusCoins },
          lastDropClaim: now,
        },
      });

      return {
        success: true,
        message: "Scout drop claimed!",
        result: {
          card: {
            id: card.id,
            name: card.name,
            position: card.position as Position,
            rating: card.rating,
            club: card.club,
            nation: card.nation,
            value: card.value,
            tierName,
            tierBadge,
          },
          bonusCoins,
          newBalance: updatedUser.coins,
        },
      };
    });
  }

  async claimSpinWheel(
    userId: string,
    userName?: string
  ): Promise<{
    success: boolean;
    message: string;
    payload?: {
      sector: SpinSector;
      rewardDesc: string;
      newBalance: number;
      card?: InventoryCard;
    };
  }> {
    const now = Date.now() / 1000;
    const FREE_COOLDOWN = 12 * 3600;
    const SPIN_COST = 100;

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: userId },
        update: { ...(userName ? { name: userName } : {}) },
        create: {
          id: userId,
          name: userName || `Manager ${userId}`,
          coins: 1000,
        },
      });

      const isFree = user.lastSpinClaim === 0 || now - user.lastSpinClaim >= FREE_COOLDOWN;

      if (!isFree) {
        if (user.coins < SPIN_COST) {
          return {
            success: false,
            message: `❌ Insufficient coins! A spin costs **${SPIN_COST} coins** (or wait for 12h free spin). You have **${user.coins} coins**.`,
          };
        }
        await tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: SPIN_COST } },
        });
      } else {
        await tx.user.update({
          where: { id: userId },
          data: { lastSpinClaim: now },
        });
      }

      const sector = spinWheel();
      let rewardDesc = "";
      let createdCard: InventoryCard | undefined;

      if (sector.rewardType === "coins") {
        await tx.user.update({
          where: { id: userId },
          data: { coins: { increment: sector.value } },
        });
        rewardDesc = `+${sector.value.toLocaleString()} Coins added to treasury!`;
      } else if (sector.rewardType === "pack") {
        const player = this.generatePlayerCard(sector.packType || "standard");
        const val = calculatePlayerValue(player.rating);
        createdCard = await tx.inventoryCard.create({
          data: {
            userId,
            cardId: player.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            name: player.name,
            position: player.position,
            rating: player.rating,
            club: player.club,
            nation: player.nation,
            value: val,
            untradeable: false,
          },
        });
        rewardDesc = `Unlocked **${player.name}** (${player.rating} ${player.position})!`;
      } else {
        rewardDesc = "Off the woodwork! No prize this time.";
      }

      const freshUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });

      return {
        success: true,
        message: "Spin successful!",
        payload: {
          sector,
          rewardDesc,
          newBalance: freshUser.coins,
          card: createdCard,
        },
      };
    });
  }

  async getStadiumInfo(
    userId: string,
    userName?: string
  ): Promise<{
    tier: number;
    tierInfo: StadiumTierInfo;
    stadiumName: string;
    canClaim: boolean;
    claimableCoins: number;
    timeUntilClaim: number;
  }> {
    const user = await this.ensureUser(userId, userName);
    const tierInfo = getStadiumTier(user.stadiumTier);
    const now = Date.now() / 1000;
    const COOLDOWN = 12 * 3600; // 12 hours
    const elapsed = now - user.lastStadiumClaim;
    const canClaim = user.lastStadiumClaim === 0 || elapsed >= COOLDOWN;
    const timeUntilClaim = Math.max(0, COOLDOWN - elapsed);

    return {
      tier: user.stadiumTier,
      tierInfo,
      stadiumName: user.stadiumName || `${user.clubName} Arena`,
      canClaim,
      claimableCoins: tierInfo.revenuePerClaim,
      timeUntilClaim,
    };
  }

  async upgradeStadium(
    userId: string
  ): Promise<{ success: boolean; message: string; newTier?: StadiumTierInfo; newBalance?: number }> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const currentTier = user.stadiumTier;

      if (currentTier >= 5) {
        return { success: false, message: "🏟️ Your stadium is already at maximum tier (Galactic Megastructure)!" };
      }

      const nextTierInfo = STADIUM_TIERS[currentTier + 1];
      if (!nextTierInfo) {
        return { success: false, message: "No next tier available." };
      }

      if (user.coins < nextTierInfo.upgradeCost) {
        return {
          success: false,
          message: `❌ Insufficient coins! Upgrading to **${nextTierInfo.name}** costs **${nextTierInfo.upgradeCost.toLocaleString()} Coins** (You have: **${user.coins.toLocaleString()} Coins**).`,
        };
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          stadiumTier: currentTier + 1,
          coins: { decrement: nextTierInfo.upgradeCost },
        },
      });

      return {
        success: true,
        message: `Stadium upgraded to **${nextTierInfo.emoji} ${nextTierInfo.name}**!`,
        newTier: nextTierInfo,
        newBalance: updated.coins,
      };
    });
  }

  async claimStadiumRevenue(
    userId: string
  ): Promise<{ success: boolean; message: string; coinsEarned?: number; newBalance?: number }> {
    const now = Date.now() / 1000;
    const COOLDOWN = 12 * 3600;

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const elapsed = now - user.lastStadiumClaim;

      if (user.lastStadiumClaim > 0 && elapsed < COOLDOWN) {
        const remainingHours = Math.ceil((COOLDOWN - elapsed) / 3600);
        return {
          success: false,
          message: `⏳ Gate receipts are still accumulating. You can collect again in **${remainingHours} hours**.`,
        };
      }

      const tierInfo = getStadiumTier(user.stadiumTier);
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: tierInfo.revenuePerClaim },
          lastStadiumClaim: now,
        },
      });

      return {
        success: true,
        message: `Collected **+${tierInfo.revenuePerClaim.toLocaleString()} Coins** in matchday revenue!`,
        coinsEarned: tierInfo.revenuePerClaim,
        newBalance: updated.coins,
      };
    });
  }

  async setCaptain(
    userId: string,
    cardIdentifier: string
  ): Promise<{ success: boolean; message: string; captainCard?: InventoryCard }> {
    const inventory = await this.getInventory(userId);
    const target = inventory.find(
      (c) =>
        c.id === cardIdentifier ||
        c.name.toLowerCase() === cardIdentifier.toLowerCase() ||
        c.name.toLowerCase().includes(cardIdentifier.toLowerCase())
    );

    if (!target) {
      return { success: false, message: `❌ Card \`${cardIdentifier}\` was not found in your inventory.` };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { captainCardId: target.id },
    });

    return {
      success: true,
      message: `Appointed **${target.name}** as club captain!`,
      captainCard: target,
    };
  }

  async getCaptain(userId: string): Promise<InventoryCard | null> {
    const user = await this.ensureUser(userId);
    if (!user.captainCardId) return null;

    return prisma.inventoryCard.findUnique({
      where: { id: user.captainCardId },
    });
  }

  async setAssignedManager(
    userId: string,
    cardIdentifier: string
  ): Promise<{ success: boolean; message: string; managerCard?: InventoryCard }> {
    const inventory = await this.getInventory(userId);
    const target = inventory.find(
      (c) =>
        (c.position === "MGR" || c.name.toLowerCase().includes("guardiola") || c.name.toLowerCase().includes("ancelotti")) &&
        (c.id === cardIdentifier ||
          c.name.toLowerCase() === cardIdentifier.toLowerCase() ||
          c.name.toLowerCase().includes(cardIdentifier.toLowerCase()))
    );

    if (!target) {
      return { success: false, message: `❌ Head Coach card \`${cardIdentifier}\` was not found in your inventory.` };
    }

    await prisma.gameRecord.upsert({
      where: { key: `assigned_manager_${userId}` },
      update: { value: target.id },
      create: { key: `assigned_manager_${userId}`, value: target.id },
    });

    return {
      success: true,
      message: `Appointed **${target.name}** as Head Coach for your club!`,
      managerCard: target,
    };
  }

  async getAssignedManager(userId: string): Promise<InventoryCard | null> {
    const record = await prisma.gameRecord.findUnique({
      where: { key: `assigned_manager_${userId}` },
    });

    const inventory = await this.getInventory(userId);
    if (record?.value) {
      const explicit = inventory.find((c) => c.id === record.value);
      if (explicit) return explicit;
    }

    // Auto-fallback to highest-rated MGR card in user inventory
    const managers = inventory.filter((c) => c.position === "MGR");
    if (managers.length > 0) {
      managers.sort((a, b) => b.rating - a.rating);
      return managers[0];
    }

    return null;
  }

  async buildMatchSquad(userId: string): Promise<Squad> {
    const inventory = await this.getInventory(userId);
    const user = await this.ensureUser(userId);

    // Parse starting lineup if configured
    let startingIds: string[] = [];
    try {
      if (user.startingLineup) {
        startingIds = JSON.parse(user.startingLineup);
      }
    } catch {
      startingIds = [];
    }

    const squad = new Squad();

    // Try to load configured starting 5
    if (startingIds.length === 5) {
      for (const id of startingIds) {
        const c = inventory.find((card) => card.id === id);
        if (c) {
          squad.addPlayer(
            new Player(
              c.name,
              c.position as Position,
              c.rating,
              1,
              0,
              c.club,
              c.nation
            )
          );
        }
      }
    }

    if (squad.isValid()) {
      return squad;
    }

    // Auto-select best 5 from inventory
    const autoSquad = new Squad();
    const sorted = [...inventory].sort((a, b) => b.rating - a.rating);

    // Pick 1 GK
    const gk = sorted.find((c) => c.position === "GK");
    if (gk) {
      autoSquad.addPlayer(
        new Player(gk.name, gk.position as Position, gk.rating, 1, 0, gk.club, gk.nation)
      );
    }

    // Pick remaining players meeting squad constraints
    for (const c of sorted) {
      if (autoSquad.players.length >= 5) break;
      if (c.id === gk?.id) continue;

      const p = new Player(c.name, c.position as Position, c.rating, 1, 0, c.club, c.nation);
      if (autoSquad.canAddPlayer(p).canAdd) {
        autoSquad.addPlayer(p);
      }
    }

    // If still not full, fill with free agents
    while (autoSquad.players.length < 5) {
      const missing = autoSquad.getMissingPositions();
      const pos = missing.length > 0 ? missing[0] : "MID";
      const p = new Player(`Academy ${pos}`, pos, 75, 1, 0, "Academy XI", "International");
      autoSquad.addPlayer(p);
    }

    return autoSquad;
  }

  async getClubValuation(userId: string): Promise<number> {
    const inventory = await this.getInventory(userId);
    return inventory.reduce((sum, c) => sum + c.value, 0);
  }

  async addCardToInventory(
    userId: string,
    player: PlayerData | Player,
    untradeable = false
  ): Promise<InventoryCard> {
    const value = calculatePlayerValue(player.rating);
    return prisma.inventoryCard.create({
      data: {
        userId,
        cardId: player.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        name: player.name,
        position: player.position,
        rating: player.rating,
        club: player.club,
        nation: player.nation,
        value,
        untradeable,
      },
    });
  }

  async getStartingLineup(userId: string): Promise<InventoryCard[]> {
    const user = await this.ensureUser(userId);
    const inventory = await this.getInventory(userId);
    let lineupIds: string[] = [];
    try {
      lineupIds = JSON.parse(user.startingLineup || "[]");
    } catch {
      lineupIds = [];
    }

    if (lineupIds.length > 0) {
      const selected = inventory.filter((c) => lineupIds.includes(c.id));
      if (selected.length === 5) return selected;
    }

    return inventory.slice(0, 5);
  }

  async autoSetLineup(userId: string): Promise<{
    success: boolean;
    message: string;
    players?: InventoryCard[];
    manager?: InventoryCard;
  }> {
    const inventory = await this.getInventory(userId);
    const footballers = inventory.filter((c) => c.position !== "MGR");
    const managers = inventory.filter((c) => c.position === "MGR");

    if (footballers.length < 5) {
      return {
        success: false,
        message: `❌ You need at least 5 footballer cards in your inventory to auto-generate a lineup (You currently have **${footballers.length}**).`,
      };
    }

    const autoSquad = new Squad();
    const sortedFootballers = [...footballers].sort((a, b) => b.rating - a.rating);
    const selectedCards: InventoryCard[] = [];

    // 1. Pick highest-rated GK if available
    const bestGk = sortedFootballers.find((c) => c.position === "GK");
    if (bestGk) {
      autoSquad.addPlayer(
        new Player(bestGk.name, bestGk.position as Position, bestGk.rating, 1, 0, bestGk.club, bestGk.nation)
      );
      selectedCards.push(bestGk);
    }

    // 2. Pick top outfielders fitting formation rules (1-2 DEF, 1-2 MID, 1-2 FW)
    for (const card of sortedFootballers) {
      if (selectedCards.length >= 5) break;
      if (selectedCards.some((sc) => sc.id === card.id)) continue;

      const p = new Player(card.name, card.position as Position, card.rating, 1, 0, card.club, card.nation);
      if (autoSquad.canAddPlayer(p).canAdd) {
        autoSquad.addPlayer(p);
        selectedCards.push(card);
      }
    }

    // 3. If remaining slots exist and strict position fits were exhausted, fill with next best footballers
    if (selectedCards.length < 5) {
      for (const card of sortedFootballers) {
        if (selectedCards.length >= 5) break;
        if (!selectedCards.some((sc) => sc.id === card.id)) {
          selectedCards.push(card);
        }
      }
    }

    // 4. Pick highest-rated manager if available
    const bestManager = managers.length > 0 ? [...managers].sort((a, b) => b.rating - a.rating)[0] : undefined;

    const selectedIds = selectedCards.map((c) => c.id);
    await prisma.user.update({
      where: { id: userId },
      data: {
        startingLineup: JSON.stringify(selectedIds),
      },
    });

    if (bestManager) {
      await this.setAssignedManager(userId, bestManager.id);
    }

    return {
      success: true,
      message: "✅ Starting 5 Lineup & Head Coach successfully auto-configured!",
      players: selectedCards,
      manager: bestManager,
    };
  }

  async recordMatchPlayed(userId: string): Promise<void> {
    await prisma.user.upsert({
      where: { id: userId },
      update: { matchesPlayed: { increment: 1 } },
      create: { id: userId, matchesPlayed: 1 },
    });
  }
}

export const economyService = new EconomyService();

