import { prisma } from "../database/client.js";
import { playerService } from "./playerService.js";
import { calculatePlayerValue, getCardTier, Player } from "../models/player.js";
import type { Position } from "../config/constants.js";
import type { InventoryCard } from "@prisma/client";

export interface DailyOffer {
  id: string;
  name: string;
  position: Position;
  rating: number;
  club: string;
  nation: string;
  price: number;
  tierName: string;
  tierBadge: string;
  isManager: boolean;
}

export class DailyShopService {
  /**
   * Get the current 24-hour UTC date key (e.g. "2026-09-06")
   */
  getTodayDateKey(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Get remaining seconds until the next 00:00 UTC refresh
   */
  getSecondsUntilReset(): number {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  }

  /**
   * Seeded pseudo-random number generator for deterministic daily selection
   */
  private createPRNG(seedStr: string): () => number {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }

  /**
   * Retrieve deterministic daily offers for today
   */
  getDailyOffers(dateKey = this.getTodayDateKey()): DailyOffer[] {
    const rng = this.createPRNG(`dailyshop_${dateKey}`);

    const allPlayers = playerService.getAllPlayers();
    const allManagers = playerService.getAllManagers();

    // Helper to pick deterministic entity in rating range
    const pickDeterministic = (pool: Player[], min: number, max: number): Player => {
      const candidates = pool.filter((p) => p.rating >= min && p.rating <= max);
      const list = candidates.length > 0 ? candidates : pool;
      const idx = Math.floor(rng() * list.length);
      return list[idx];
    };

    const p1 = pickDeterministic(allPlayers, 82, 86);
    const p2 = pickDeterministic(allPlayers, 86, 89);
    const p3 = pickDeterministic(allPlayers, 89, 94);
    const m1 = pickDeterministic(allManagers.length > 0 ? allManagers : allPlayers, 88, 96);

    const rawList: { player: Player; isManager: boolean }[] = [
      { player: p1, isManager: false },
      { player: p2, isManager: false },
      { player: p3, isManager: false },
      { player: m1, isManager: m1.position === "MGR" },
    ];

    return rawList.map((item, i) => {
      const p = item.player;
      const price = calculatePlayerValue(p.rating) * 2;
      const { tierName, tierBadge } = getCardTier(p.rating);

      return {
        id: `offer_${i}_${dateKey}`,
        name: p.name,
        position: p.position,
        rating: p.rating,
        club: p.club,
        nation: p.nation,
        price,
        tierName,
        tierBadge,
        isManager: item.isManager,
      };
    });
  }

  /**
   * Buy an offer from today's Daily Shop
   */
  async buyOffer(
    userId: string,
    offerIndex: number,
    userName?: string
  ): Promise<{ success: boolean; message: string; boughtCard?: InventoryCard; newBalance?: number }> {
    const offers = this.getDailyOffers();
    const offer = offers[offerIndex];

    if (!offer) {
      return { success: false, message: "❌ Invalid Daily Shop offer selection." };
    }

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: userId },
        update: { ...(userName ? { name: userName } : {}) },
        create: { id: userId, name: userName || `Manager ${userId}`, coins: 1000 },
      });

      if (user.coins < offer.price) {
        return {
          success: false,
          message: `❌ Insufficient coins! **${offer.name}** costs **${offer.price.toLocaleString()} Coins** (You have: **${user.coins.toLocaleString()} Coins**).`,
        };
      }

      // Deduct coins
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: offer.price } },
      });

      // Grant card to inventory
      const boughtCard = await tx.inventoryCard.create({
        data: {
          userId,
          cardId: offer.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          name: offer.name,
          position: offer.position,
          rating: offer.rating,
          club: offer.club,
          nation: offer.nation,
          value: calculatePlayerValue(offer.rating),
          untradeable: false,
        },
      });

      const roleType = offer.isManager ? "Tactical Manager" : "Footballer";

      return {
        success: true,
        message: `🎉 **Contract Signed!** You acquired ${roleType} **${offer.name}** (${offer.rating} ${offer.position}) for **${offer.price.toLocaleString()} Coins**!`,
        boughtCard,
        newBalance: updatedUser.coins,
      };
    });
  }
}

export const dailyShopService = new DailyShopService();
