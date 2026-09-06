import { prisma } from "../database/client.js";
import { economyService } from "./economyService.js";
import { MAX_INVENTORY_CARDS, type Position } from "../config/constants.js";
import type { MarketListing } from "@prisma/client";

export interface ListedCardData {
  id: string;
  name: string;
  position: Position;
  rating: number;
  club: string;
  nation: string;
  value: number;
  tierName?: string;
  tierBadge?: string;
}

export class MarketService {
  async listCard(
    userId: string,
    cardIdentifier: string,
    price: number,
    userName?: string
  ): Promise<{ success: boolean; message: string; listing?: MarketListing }> {
    if (price < 10) {
      return { success: false, message: "❌ Minimum listing price is **10 Coins**." };
    }
    if (price > 1_000_000) {
      return { success: false, message: "❌ Maximum listing price is **1,000,000 Coins**." };
    }

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
        return { success: false, message: `❌ **${target.name}** is untradeable and cannot be listed on the market.` };
      }

      const cardData: ListedCardData = {
        id: target.id,
        name: target.name,
        position: target.position as Position,
        rating: target.rating,
        club: target.club,
        nation: target.nation,
        value: target.value,
      };

      // Remove from inventory
      await tx.inventoryCard.delete({ where: { id: target.id } });

      const seller = await tx.user.upsert({
        where: { id: userId },
        update: { ...(userName ? { name: userName } : {}) },
        create: { id: userId, name: userName || `Manager ${userId}` },
      });

      const listing = await tx.marketListing.create({
        data: {
          sellerId: userId,
          sellerName: seller.name,
          price,
          cardData: JSON.stringify(cardData),
        },
      });

      return {
        success: true,
        message: `Listed **${target.name}** (${target.rating} ${target.position}) on the Transfer Market for **${price.toLocaleString()} Coins**!`,
        listing,
      };
    });
  }

  async buyCard(
    buyerId: string,
    listingId: string,
    buyerName?: string
  ): Promise<{ success: boolean; message: string; boughtCard?: ListedCardData; newBalance?: number }> {
    return prisma.$transaction(async (tx) => {
      const listing = await tx.marketListing.findUnique({ where: { id: listingId } });
      if (!listing) {
        return { success: false, message: "❌ This listing has already expired or been purchased." };
      }

      if (listing.sellerId === buyerId) {
        return { success: false, message: "❌ You cannot purchase your own market listing. Use `/cancel_listing` to retrieve it." };
      }

      const buyer = await tx.user.upsert({
        where: { id: buyerId },
        update: { ...(buyerName ? { name: buyerName } : {}) },
        create: { id: buyerId, name: buyerName || `Manager ${buyerId}` },
      });

      if (buyer.coins < listing.price) {
        return {
          success: false,
          message: `❌ Insufficient coins! Listing costs **${listing.price.toLocaleString()} Coins** (You have: **${buyer.coins.toLocaleString()} Coins**).`,
        };
      }

      const buyerCardCount = await tx.inventoryCard.count({ where: { userId: buyerId } });
      if (buyerCardCount >= MAX_INVENTORY_CARDS) {
        return {
          success: false,
          message: `❌ Inventory limit reached (**${buyerCardCount}/${MAX_INVENTORY_CARDS} cards**)! Please \`/quicksell\` or \`/sell\` cards before purchasing more from the Transfer Market.`,
        };
      }

      const cardData: ListedCardData = JSON.parse(listing.cardData);

      // 1. Deduct coins from buyer
      const updatedBuyer = await tx.user.update({
        where: { id: buyerId },
        data: { coins: { decrement: listing.price } },
      });

      // 2. Credit coins to seller (after 5% fair market tax)
      const taxRate = 0.05;
      const taxAmount = Math.floor(listing.price * taxRate);
      const sellerProceeds = listing.price - taxAmount;

      await tx.user.update({
        where: { id: listing.sellerId },
        data: { coins: { increment: sellerProceeds } },
      });

      // 3. Transfer card to buyer's inventory
      await tx.inventoryCard.create({
        data: {
          userId: buyerId,
          cardId: cardData.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          name: cardData.name,
          position: cardData.position,
          rating: cardData.rating,
          club: cardData.club,
          nation: cardData.nation,
          value: cardData.value,
          untradeable: false,
        },
      });

      // 4. Delete listing
      await tx.marketListing.delete({ where: { id: listingId } });

      return {
        success: true,
        message: `Purchased **${cardData.name}** for **${listing.price.toLocaleString()} Coins** (5% market tax applied: ${taxAmount} coins burned).`,
        boughtCard: cardData,
        newBalance: updatedBuyer.coins,
      };
    });
  }

  async cancelListing(
    sellerId: string,
    listingId: string
  ): Promise<{ success: boolean; message: string; restoredCard?: ListedCardData }> {
    return prisma.$transaction(async (tx) => {
      const listing = await tx.marketListing.findUnique({ where: { id: listingId } });
      if (!listing) {
        return { success: false, message: "❌ Listing not found or already completed." };
      }

      if (listing.sellerId !== sellerId) {
        return { success: false, message: "❌ You can only cancel your own listings." };
      }

      const cardData: ListedCardData = JSON.parse(listing.cardData);

      // Restore card to seller inventory
      await tx.inventoryCard.create({
        data: {
          userId: sellerId,
          cardId: cardData.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          name: cardData.name,
          position: cardData.position,
          rating: cardData.rating,
          club: cardData.club,
          nation: cardData.nation,
          value: cardData.value,
          untradeable: false,
        },
      });

      await tx.marketListing.delete({ where: { id: listing.id } });

      return {
        success: true,
        message: `Cancelled listing and returned **${cardData.name}** to your inventory.`,
        restoredCard: cardData,
      };
    });
  }

  async getListings(
    page = 1,
    limit = 10,
    search?: string
  ): Promise<{ listings: (MarketListing & { card: ListedCardData })[]; total: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const all = await prisma.marketListing.findMany({
      orderBy: { createdAt: "desc" },
    });

    let filtered = all.map((l) => ({
      ...l,
      card: JSON.parse(l.cardData) as ListedCardData,
    }));

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.card.name.toLowerCase().includes(q) ||
          l.card.club.toLowerCase().includes(q) ||
          l.card.position.toLowerCase() === q
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      listings: paginated,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getUserListings(userId: string): Promise<(MarketListing & { card: ListedCardData })[]> {
    const list = await prisma.marketListing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
    });

    return list.map((l) => ({
      ...l,
      card: JSON.parse(l.cardData) as ListedCardData,
    }));
  }
}

export const marketService = new MarketService();
