import { EmbedBuilder } from "discord.js";
import { ManagerProfile } from "../../models/manager.js";

export function createManagerProfileEmbed(profile: ManagerProfile): EmbedBuilder {
  const rolesStr = profile.roles.length > 0 ? profile.roles.join(" • ") : "🔰 New Player";

  const embed = new EmbedBuilder()
    .setTitle(`${profile.kitEmoji} Manager Profile — ${profile.displayName}`)
    .setDescription(
      `**${profile.clubName}**\n` +
        (profile.motto ? `*\"${profile.motto}\"*\n` : "") +
        `**Badges:** ${rolesStr}`
    )
    .setColor(0x22c55e)
    .addFields(
      { name: "Manager Rating", value: `⭐ **${profile.rating} OVR**`, inline: true },
      { name: "Division Rank", value: `🏆 **${profile.rank}**`, inline: true },
      { name: "Tournaments Won", value: `👑 **${profile.tournamentsWon} Titles**`, inline: true },
      {
        name: "Career Record",
        value: `**${profile.wins}W** - **${profile.draws}D** - **${profile.losses}L** (${profile.winRate}% Win Rate)`,
        inline: true,
      },
      { name: "Treasury Balance", value: `💰 **${profile.coins.toLocaleString()} Coins**`, inline: true },
      { name: "Club Valuation", value: `💎 **${profile.clubValue.toLocaleString()} Coins**`, inline: true },
      { name: "Squad Cards Owned", value: `🃏 **${profile.cardsOwned} Cards**`, inline: true },
      { name: "Matches Played", value: `⚽ **${profile.matchesPlayed} Matches**`, inline: true }
    )
    .setFooter({ text: "Compete in /match, /tournament, and /auction to build your managerial legacy" });

  return embed;
}
