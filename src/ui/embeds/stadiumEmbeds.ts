import { EmbedBuilder } from "discord.js";
import type { StadiumTierInfo } from "../../models/stadium.js";
import { formatTimeRemaining } from "../../utils/formatters.js";

export function createStadiumEmbed(params: {
  userName: string;
  clubName: string;
  stadiumName: string;
  tier: number;
  tierInfo: StadiumTierInfo;
  nextTierInfo?: StadiumTierInfo;
  canClaim: boolean;
  claimableCoins: number;
  timeUntilClaim: number;
}): EmbedBuilder {
  const {
    userName,
    clubName,
    stadiumName,
    tier,
    tierInfo,
    nextTierInfo,
    canClaim,
    claimableCoins,
    timeUntilClaim,
  } = params;

  const claimStatus = canClaim
    ? "🟢 **Ready to Collect!** (+${claimableCoins.toLocaleString()} Coins)"
    : `⏳ Recharging (${formatTimeRemaining(timeUntilClaim * 1000)})`;

  const embed = new EmbedBuilder()
    .setTitle(`${tierInfo.emoji} ${stadiumName}`)
    .setDescription(
      `**Official Venue of ${clubName}** (Manager: ${userName})\n\n` +
        `• **Tier:** **Tier ${tier} — ${tierInfo.name}**\n` +
        `• **Capacity:** 🏟️ **${tierInfo.capacity.toLocaleString()} Spectators**\n` +
        `• **Matchday Revenue:** 💰 **+${tierInfo.revenuePerClaim.toLocaleString()} Coins / 12h**\n` +
        `• **Home Atmosphere Buff:** 🔥 **+${tierInfo.homeMoraleBuff.toFixed(1)} Squad Rating** in home matches\n\n` +
        `**Revenue Status:**\n${claimStatus}`
    )
    .setColor(0x3b82f6);

  if (nextTierInfo) {
    embed.addFields({
      name: `Upgrade Blueprint: ${nextTierInfo.emoji} ${nextTierInfo.name} (Tier ${tier + 1})`,
      value:
        `• **Upgrade Cost:** **${nextTierInfo.upgradeCost.toLocaleString()} Coins**\n` +
        `• **New Capacity:** ${nextTierInfo.capacity.toLocaleString()} fans\n` +
        `• **New Revenue:** +${nextTierInfo.revenuePerClaim.toLocaleString()} Coins / 12h\n` +
        `• **New Morale Buff:** +${nextTierInfo.homeMoraleBuff.toFixed(1)} OVR`,
      inline: false,
    });
  } else {
    embed.addFields({
      name: "Maximum Facility Upgrade",
      value: "🌟 Your stadium has reached maximum tier infrastructure.",
      inline: false,
    });
  }

  embed.setFooter({ text: "Click Collect Revenue to claim coins • Click Upgrade to expand venue" });
  return embed;
}
