import { EmbedBuilder } from "discord.js";
import { ClubMatchSide, MatchEvent, MatchResult } from "../../models/match.js";

export function createChallengeEmbed(
  challenger: ClubMatchSide,
  opponentName: string,
  opponentClub: string,
  opponentKit: string,
  opponentTactic: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`⚔️ Head-to-Head Match Challenge!`)
    .setDescription(
      `**${challenger.managerName}** has challenged **${opponentName}** to a 90-minute duel!\n\n` +
        `**Home:** ${challenger.kitEmoji} **${challenger.clubName}** (${challenger.squadScore.toFixed(1)} OVR) • \`${challenger.tactic.name}\`\n` +
        `**Away:** ${opponentKit} **${opponentClub}** • \`${opponentTactic}\``
    )
    .setColor(0xef4444)
    .setFooter({ text: "Opponent has 60 seconds to accept or decline the challenge." });
}

export function createLiveMatchEmbed(
  home: ClubMatchSide,
  away: ClubMatchSide,
  homeScore: number,
  awayScore: number,
  currentMinute: number,
  eventsSoFar: MatchEvent[],
  isHalfTime = false
): EmbedBuilder {
  const statusText = isHalfTime
    ? "⏸️ HALF TIME"
    : currentMinute >= 90
      ? "🏁 FULL TIME"
      : `⏱️ LIVE: ${currentMinute}'`;

  const recentEvents = eventsSoFar.slice(-4).map((e) => e.commentary);

  return new EmbedBuilder()
    .setTitle(`⚽ ${home.kitEmoji} ${home.clubName} ${homeScore} - ${awayScore} ${away.kitEmoji} ${away.clubName}`)
    .setDescription(
      `**Status:** \`${statusText}\`\n\n` +
        `**Match Timeline:**\n` +
        (recentEvents.length > 0 ? recentEvents.join("\n") : "*Kickoff! Ball in play.*")
    )
    .setColor(isHalfTime ? 0xf59e0b : 0x22c55e)
    .setFooter({ text: "Simulated live with tactical momentum and player attributes" });
}

export function createMatchResultEmbed(
  result: MatchResult,
  homeRpDelta?: number,
  awayRpDelta?: number,
  homeNote?: string,
  awayNote?: string
): EmbedBuilder {
  let title = `🏁 Full Time: ${result.home.kitEmoji} ${result.home.clubName} ${result.homeScore} - ${result.awayScore} ${result.away.kitEmoji} ${result.away.clubName}`;
  if (result.penaltyHomeScore !== undefined && result.penaltyAwayScore !== undefined) {
    title += ` (Penalties: ${result.penaltyHomeScore}-${result.penaltyAwayScore})`;
  }

  let winnerSummary = "🤝 **Match Drawn!** Both teams share the spoils.";
  if (result.winner === result.home) {
    winnerSummary = `🏆 **Victory for ${result.home.clubName}!** (+${result.homeReward} Coins)`;
  } else if (result.winner === result.away) {
    winnerSummary = `🏆 **Victory for ${result.away.clubName}!** (+${result.awayReward} Coins)`;
  }

  const allEventLines = result.events.map((e) => e.commentary);

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      `${winnerSummary}\n\n` +
        `⭐ **Player of the Match:** **${result.mvp}**\n` +
        `🧠 **Tactical Breakdown:** ${result.tacticalSummary}\n\n` +
        `**Full Match Highlights:**\n` +
        (allEventLines.length > 0 ? allEventLines.join("\n") : "*No major goalmouth incidents.*")
    )
    .setColor(result.winner ? 0x22c55e : 0x3b82f6);

  if (homeRpDelta !== undefined || awayRpDelta !== undefined) {
    embed.addFields({
      name: "Division Rivals RP Changes",
      value:
        `• **${result.home.managerName}**: ${homeNote || `${homeRpDelta} RP`}\n` +
        (!result.away.isBot ? `• **${result.away.managerName}**: ${awayNote || `${awayRpDelta} RP`}` : ""),
    });
  }

  return embed;
}
