import { EmbedBuilder } from "discord.js";
import { type SpinSector } from "../../models/spin.js";
import type { InventoryCard } from "@prisma/client";

export function createSpinEmbed(params: {
  sector: SpinSector;
  userName: string;
  rewardDesc: string;
  newBal: number;
  cardPulled?: InventoryCard;
}): EmbedBuilder {
  const { sector, userName, rewardDesc, newBal, cardPulled } = params;

  const embed = new EmbedBuilder()
    .setTitle(`🎡 Lucky Mystery Wheel — ${userName}`)
    .setDescription(
      `The wheel has stopped on:\n\n` +
        `## ${sector.badge} ${sector.name}\n\n` +
        `🎁 **Prize Outcome:**\n${rewardDesc}\n\n` +
        `💳 **New Treasury Balance:** **${newBal.toLocaleString()} Coins**`
    )
    .setColor(sector.colorHex)
    .setFooter({ text: "Spin every 12h for free, or pay 100 coins for extra attempts!" });

  if (cardPulled) {
    embed.addFields({
      name: "Player Card Unlocked",
      value: `⭐ **${cardPulled.name}** (${cardPulled.rating} ${cardPulled.position})\n• Club: *${cardPulled.club}*\n• Nation: *${cardPulled.nation}*`,
    });
  }

  return embed;
}
