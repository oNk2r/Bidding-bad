import { EmbedBuilder } from "discord.js";
import { ManagerProfile } from "../../models/manager.js";

export function createManagerProfileEmbed(profile: ManagerProfile, avatarUrl?: string): EmbedBuilder {
  const rolesStr = profile.roles.length > 0 ? profile.roles.join(" • ") : "🔰 New Player";
  const netWorth = profile.coins + profile.clubValue;

  const color =
    profile.rating >= 1300
      ? 0x8b5cf6
      : profile.rating >= 1150
      ? 0xf59e0b
      : profile.rating >= 1000
      ? 0x10b981
      : 0x3b82f6;

  const embed = new EmbedBuilder()
    .setTitle(`${profile.kitEmoji} ${profile.clubName}`)
    .setColor(color)
    .setTimestamp();

  if (avatarUrl) {
    embed.setAuthor({ name: `${profile.displayName} • Manager Career Passport`, iconURL: avatarUrl });
  } else {
    embed.setAuthor({ name: `${profile.displayName} • Manager Career Passport` });
  }

  let desc = "";
  if (profile.motto) {
    desc += `> *\"${profile.motto}\"*\n\n`;
  }
  desc += `🎖️ **Badges & Honors:** ${rolesStr}`;
  embed.setDescription(desc);

  embed.addFields(
    {
      name: "🏆 Competitive Record",
      value:
        `> • **Division Rank:** \`${profile.rank}\` (\`${profile.rp} RP\`)\n` +
        `> • **Manager Rating:** \`${profile.rating} OVR\`\n` +
        `> • **Tournaments Won:** \`${profile.tournamentsWon} Titles\`\n` +
        `> • **Record:** \`${profile.wins}W - ${profile.draws}D - ${profile.losses}L\` (\`${profile.winRate}%\` WR)\n` +
        `> • **Total Matches:** \`${profile.matchesPlayed} Matches\``,
      inline: false,
    },
    {
      name: "💎 Club Assets & Finances",
      value:
        `> • **Liquid Treasury:** \`${profile.coins.toLocaleString()} Coins\`\n` +
        `> • **Locker Valuation:** \`${profile.clubValue.toLocaleString()} Coins\`\n` +
        `> • **Total Net Worth:** 👑 \`${netWorth.toLocaleString()} Coins\`\n` +
        `> • **Squad Size:** \`${profile.cardsOwned}/50 Cards\``,
      inline: false,
    }
  );

  embed.setFooter({ text: "Compete in /match, /tournament, and /auction to build your managerial legacy" });
  return embed;
}

