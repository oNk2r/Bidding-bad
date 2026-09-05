import { EmbedBuilder } from "discord.js";
import { formatProgressBar } from "../../utils/formatters.js";
import type { DivisionProfileData } from "../../services/divisionService.js";
import type { User } from "@prisma/client";

export function createDivisionProfileEmbed(data: DivisionProfileData): EmbedBuilder {
  const { user, currentTier, nextTier, seasonId, seasonReset, rpNeeded } = data;

  const currentMin = currentTier.minRp;
  const targetMax = nextTier ? nextTier.minRp : currentTier.minRp + 500;
  const progressCurrent = user.rp - currentMin;
  const progressTarget = targetMax - currentMin;
  const bar = formatProgressBar(progressCurrent, progressTarget, 10);

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Division Rivals — ${user.name}`)
    .setDescription(
      `**Current Tier:** ${currentTier.badge} **${currentTier.name}**\n` +
        `**Rank Points:** **${user.rp.toLocaleString()} RP**\n\n` +
        `**Tier Progression:**\n` +
        `\`${currentTier.name}\` [${bar}] \`${nextTier ? nextTier.name : "Max Tier"}\`\n` +
        (nextTier ? `*Need **+${rpNeeded} RP** to achieve promotion to **${nextTier.name}**.*\n\n` : "*You have reached the pinnacle of Division Rivals!*\n\n") +
        `🗓️ **Season:** \`${seasonId}\` • **Weekly Reset in:** \`${seasonReset.hours}h ${seasonReset.minutes}m\``
    )
    .setColor(currentTier.colorHex)
    .addFields(
      {
        name: "Match RP Rewards",
        value: `• **Win:** +${currentTier.winRp} RP (+10 for 3+ streak)\n• **Draw:** +${currentTier.drawRp} RP\n• **Loss:** -${currentTier.lossRpDeduction} RP`,
        inline: true,
      },
      {
        name: "Weekly Season Rewards",
        value: `💰 **${currentTier.weeklyCoins.toLocaleString()} Coins**\n📦 **${currentTier.weeklyPacks.map((p) => `${p.toUpperCase()} Pack`).join(" + ")}**`,
        inline: true,
      }
    )
    .setFooter({ text: "Compete in /match head-to-head duels to climb the ranked divisions" });

  return embed;
}

export function createDivisionLeaderboardEmbed(users: User[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle("👑 Division Rivals — Server Leaderboard")
    .setDescription("The top competitive managers in the server ranked by Rank Points (RP).")
    .setColor(0xeab308);

  if (users.length === 0) {
    embed.addFields({ name: "No Rankings", value: "*No matches played yet in this server.*" });
  } else {
    const lines = users.map((u, idx) => {
      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `**${idx + 1}.**`;
      return `${medal} **${u.name}** (${u.kitEmoji} *${u.clubName}*) — 🏆 **${u.rp.toLocaleString()} RP** (${u.wins}W - ${u.draws}D - ${u.losses}L)`;
    });
    embed.addFields({ name: "Top Ranked Managers", value: lines.join("\n") });
  }

  return embed;
}
