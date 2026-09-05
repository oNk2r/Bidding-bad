import { EmbedBuilder } from "discord.js";
import type { InventoryCard } from "@prisma/client";

export function createTradeProposalEmbed(
  senderName: string,
  senderCard: InventoryCard,
  receiverName: string,
  receiverCard: InventoryCard
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`🤝 Direct Player Exchange Proposal`)
    .setDescription(
      `**${senderName}** has proposed a 1-for-1 player trade with **${receiverName}**!\n\n` +
        `**Offering:**\n` +
        `⭐ **${senderCard.name}** (\`${senderCard.rating} ${senderCard.position}\`)\n` +
        `• Club: *${senderCard.club}* • Nation: *${senderCard.nation}*\n\n` +
        `**Requesting in Return:**\n` +
        `⭐ **${receiverCard.name}** (\`${receiverCard.rating} ${receiverCard.position}\`)\n` +
        `• Club: *${receiverCard.club}* • Nation: *${receiverCard.nation}*`
    )
    .setColor(0x3b82f6)
    .setFooter({ text: `${receiverName} has 60 seconds to accept or decline the trade proposal.` });
}

export function createTradeSuccessEmbed(
  senderName: string,
  senderCardName: string,
  receiverName: string,
  receiverCardName: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ Trade Completed Successfully!`)
    .setDescription(
      `The transfer documents have been finalized!\n\n` +
        `• **${senderName}** received **${receiverCardName}**\n` +
        `• **${receiverName}** received **${senderCardName}**`
    )
    .setColor(0x22c55e)
    .setFooter({ text: "Player cards updated in inventories" });
}
