import { EmbedBuilder } from "discord.js";
import { Squad } from "../../models/squad.js";
import { calculateScore, getChemistryBreakdown } from "../../models/scoring.js";
import type { InventoryCard } from "@prisma/client";
import type { DropClaimResult } from "../../services/economyService.js";

export function createClubEmbed(params: {
  userName: string;
  clubName: string;
  kitEmoji: string;
  motto?: string | null;
  bannerUrl?: string | null;
  tacticName: string;
  captain?: InventoryCard | null;
  squad: Squad;
  coins: number;
  clubValue: number;
  cardCount: number;
}): EmbedBuilder {
  const { totalBonus, synergies } = getChemistryBreakdown(params.squad);
  const score = calculateScore(params.squad);

  const embed = new EmbedBuilder()
    .setTitle(`${params.kitEmoji} ${params.clubName}`)
    .setDescription(
      (params.motto ? `*\"${params.motto}\"*\n` : "") +
        `**Manager:** ${params.userName} • **Tactics:** \`${params.tacticName}\`\n` +
        `**Captain:** ${params.captain ? `⭐ **${params.captain.name}** (${params.captain.rating} ${params.captain.position})` : "*No Captain Appointed*"}`
    )
    .setColor(0x3b82f6)
    .addFields(
      { name: "Treasury Coins", value: `💰 **${params.coins.toLocaleString()}**`, inline: true },
      { name: "Club Valuation", value: `💎 **${params.clubValue.toLocaleString()}**`, inline: true },
      { name: "Total Cards", value: `🃏 **${params.cardCount}**`, inline: true },
      {
        name: `Starting Lineup (Squad Rating: ${score.toFixed(1)} / 100)`,
        value:
          params.squad.players.length > 0
            ? params.squad.players
                .map((p) => `• **${p.name}** (${p.rating} ${p.position}) — *${p.club}*`)
                .join("\n")
            : "*No starting lineup configured. Use `/lineup` to set your 5.*",
        inline: false,
      },
      {
        name: `Synergy Links (+${totalBonus.toFixed(1)} pts)`,
        value: synergies.length > 0 ? synergies.join("\n") : "*No active club/nation links*",
        inline: false,
      }
    )
    .setFooter({ text: "Use /banner to set animated GIF banner • /lineup for squad" });

  return embed;
}

export function createDropEmbed(result: DropClaimResult, userName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`📦 Scout Drop Claimed — ${userName}`)
    .setDescription(
      `Your global scouting network has returned with fresh talent!\n\n` +
        `**Player Scouted:**\n` +
        `⭐ **${result.card.name}**\n` +
        `• **Position:** \`${result.card.position}\`\n` +
        `• **Rating:** **${result.card.rating} OVR** (${result.card.tierBadge} ${result.card.tierName})\n` +
        `• **Club:** *${result.card.club}*\n` +
        `• **Nation:** *${result.card.nation}*\n` +
        `• **Card Value:** **${result.card.value.toLocaleString()} Coins**\n\n` +
        `💰 **Scout Bounty:** **+${result.bonusCoins} Coins**\n` +
        `💳 **New Treasury Balance:** **${result.newBalance.toLocaleString()} Coins**`
    )
    .setColor(0x22c55e)
    .setFooter({ text: "Scout drops refresh every 6 hours! Use /drop to claim" });
}
