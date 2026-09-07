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
  avatarUrl?: string | null;
  tacticName: string;
  captain?: InventoryCard | null;
  managerCard?: InventoryCard | null;
  squad: Squad;
  coins: number;
  clubValue: number;
  cardCount: number;
}): EmbedBuilder {
  const { totalBonus, synergies } = getChemistryBreakdown(params.squad);
  const score = calculateScore(params.squad);

  const managerStr = params.managerCard
    ? `**${params.managerCard.name}** (\`${params.managerCard.rating} MGR\`) — *${params.managerCard.club}*`
    : "*No Head Coach Appointed*";

  const captainStr = params.captain
    ? `**${params.captain.name}** (\`${params.captain.rating} ${params.captain.position}\`)`
    : "*No Captain Appointed*";

  const embed = new EmbedBuilder()
    .setTitle(`${params.kitEmoji} ${params.clubName}`)
    .setColor(0x3b82f6)
    .setTimestamp();

  if (params.avatarUrl) {
    embed.setAuthor({ name: `${params.userName}'s Football Club`, iconURL: params.avatarUrl });
  } else {
    embed.setAuthor({ name: `${params.userName}'s Football Club` });
  }

  let desc = "";
  if (params.motto) {
    desc += `> *\"${params.motto}\"*\n\n`;
  }
  desc +=
    `> 👔 **Head Coach:** ${managerStr}\n` +
    `> ⭐ **Club Captain:** ${captainStr}\n` +
    `> 🧠 **Active Playstyle:** \`${params.tacticName}\``;
  embed.setDescription(desc);

  const lineupStr =
    params.squad.players.length > 0
      ? params.squad.players
          .map((p) => `• \`[${p.position}]\` **${p.name}** (\`${p.rating}\`) — *${p.club}* (*${p.nation}*)`)
          .join("\n")
      : "*No starting lineup configured. Use `/lineup` to set your Starting 5.*";

  const synergyStr =
    synergies.length > 0
      ? synergies.map((s) => `> • ${s}`).join("\n")
      : "*No active club or nation chemistry links.*";

  embed.addFields(
    {
      name: "💎 Treasury & Club Value",
      value:
        `> • **Liquid Coins:** \`${params.coins.toLocaleString()} Coins\`\n` +
        `> • **Club Valuation:** \`${params.clubValue.toLocaleString()} Coins\`\n` +
        `> • **Locker Size:** \`${params.cardCount}/50 Cards\``,
      inline: false,
    },
    {
      name: `📋 Starting Lineup (Rating: ${score.toFixed(1)} / 100)`,
      value: lineupStr,
      inline: false,
    },
    {
      name: `⚡ Synergy Chemistry (+${totalBonus.toFixed(1)} pts)`,
      value: synergyStr,
      inline: false,
    }
  );

  embed.setFooter({ text: "Use /lineup to configure Starting 5 & Head Coach • /tactic for playstyle" });
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
