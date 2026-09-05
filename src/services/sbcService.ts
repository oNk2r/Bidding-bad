import { prisma } from "../database/client.js";
import {
  getSbcById,
  SBC_CATALOG,
  validateSbcSubmission,
  type SBCChallenge,
  type SubmittedCard,
} from "../models/sbc.js";
import { economyService } from "./economyService.js";
import { Player } from "../models/player.js";
import type { Position } from "../config/constants.js";

export class SBCService {
  getCatalog(): SBCChallenge[] {
    return SBC_CATALOG;
  }

  async getCompletedSbcIds(userId: string): Promise<Set<string>> {
    const completions = await prisma.sbcCompletion.findMany({
      where: { userId },
    });
    return new Set(completions.map((c) => c.sbcId));
  }

  async submitSbc(
    userId: string,
    sbcId: string,
    cardIdentifiers: string[],
    userName?: string
  ): Promise<{ success: boolean; message: string; challenge?: SBCChallenge }> {
    const challenge = getSbcById(sbcId);
    if (!challenge) {
      return { success: false, message: `❌ Challenge \`${sbcId}\` not found.` };
    }

    return prisma.$transaction(async (tx) => {
      // 1. Check completion if non-repeatable
      if (!challenge.repeatable) {
        const existing = await tx.sbcCompletion.findUnique({
          where: { userId_sbcId: { userId, sbcId: challenge.id } },
        });
        if (existing) {
          return {
            success: false,
            message: `❌ You have already completed **${challenge.title}** (One-time only).`,
          };
        }
      }

      // 2. Fetch user cards
      const userCards = await tx.inventoryCard.findMany({ where: { userId } });
      const matchedCards: SubmittedCard[] = [];
      const usedIds = new Set<string>();

      for (const token of cardIdentifiers) {
        const found = userCards.find(
          (c) =>
            !usedIds.has(c.id) &&
            (c.id === token ||
              c.name.toLowerCase() === token.toLowerCase() ||
              c.name.toLowerCase().includes(token.toLowerCase()))
        );

        if (!found) {
          return {
            success: false,
            message: `❌ Card \`${token}\` was not found in your inventory or was already selected.`,
          };
        }

        usedIds.add(found.id);
        matchedCards.push({
          id: found.id,
          cardId: found.cardId,
          name: found.name,
          rating: found.rating,
          position: found.position as Position,
          club: found.club,
          nation: found.nation,
        });
      }

      // 3. Validate against challenge requirements
      const { valid, message } = validateSbcSubmission(challenge, matchedCards);
      if (!valid) {
        return { success: false, message: `❌ Submission rejected: ${message}` };
      }

      // 4. Burn submitted cards
      await tx.inventoryCard.deleteMany({
        where: { id: { in: Array.from(usedIds) } },
      });

      // 5. Grant rewards
      const reward = challenge.reward;
      if (reward.coins > 0) {
        await tx.user.upsert({
          where: { id: userId },
          update: {
            coins: { increment: reward.coins },
            ...(userName ? { name: userName } : {}),
          },
          create: { id: userId, name: userName || `Manager ${userId}`, coins: 1000 + reward.coins },
        });
      }

      if (reward.packType) {
        const packCardCount = reward.packType === "premium" ? 3 : 2;
        for (let i = 0; i < packCardCount; i++) {
          const generated = economyService.generatePlayerCard(reward.packType);
          await tx.inventoryCard.create({
            data: {
              userId,
              cardId: generated.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
              name: generated.name,
              position: generated.position,
              rating: generated.rating,
              club: generated.club,
              nation: generated.nation,
              value: generated.startingPrice * 100,
              untradeable: false,
            },
          });
        }
      }

      if (reward.card) {
        await tx.inventoryCard.create({
          data: {
            userId,
            cardId: reward.card.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            name: reward.card.name,
            position: reward.card.position,
            rating: reward.card.rating,
            club: reward.card.club,
            nation: reward.card.nation,
            value: reward.card.value,
            untradeable: reward.card.untradeable,
            cardData: JSON.stringify({
              tierName: reward.card.tierName,
              tierBadge: reward.card.tierBadge,
            }),
          },
        });
      }

      // 6. Record completion
      await tx.sbcCompletion.upsert({
        where: { userId_sbcId: { userId, sbcId: challenge.id } },
        update: { completedAt: new Date() },
        create: { userId, sbcId: challenge.id },
      });

      return {
        success: true,
        message: `🎉 Completed **${challenge.title}**! Reward: **${challenge.reward.description}**`,
        challenge,
      };
    });
  }
}

export const sbcService = new SBCService();
