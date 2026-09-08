import { EmbedBuilder } from "discord.js";
import { ClubMatchSide, MatchEvent, MatchResult } from "../../models/match.js";

function buildProgressBar(percentA: number, length = 10): string {
  const countA = Math.round((percentA / 100) * length);
  const countB = length - countA;
  return "🟦".repeat(Math.max(0, countA)) + "🟩".repeat(Math.max(0, countB));
}

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
  isHalfTime = false,
  extraStats?: { homeXg?: number; awayXg?: number; homePossession?: number }
): EmbedBuilder {
  const statusText = isHalfTime
    ? "⏸️ HALF TIME"
    : currentMinute >= 90
      ? "🏁 FULL TIME"
      : `⏱️ LIVE: ${currentMinute}'`;

  const recentEvents = eventsSoFar.slice(-4).map((e) => e.commentary);

  const homeCoach = home.headCoach ? `👔 *${home.headCoach}*` : `👤 *${home.managerName}*`;
  const awayCoach = away.headCoach ? `👔 *${away.headCoach}*` : `👤 *${away.managerName}*`;

  const homeGoals = eventsSoFar.filter((e) => e.eventType === "GOAL" && e.team === "HOME");
  const awayGoals = eventsSoFar.filter((e) => e.eventType === "GOAL" && e.team === "AWAY");

  let scorersSummary = "";
  if (homeGoals.length > 0 || awayGoals.length > 0) {
    const hList = homeGoals.map((g) => `${g.playerName} ${g.minute}'`).join(", ");
    const aList = awayGoals.map((g) => `${g.playerName} ${g.minute}'`).join(", ");
    scorersSummary = `\n⚽ **Goals:**\n• ${home.clubName}: ${hList || "*None*"}\n• ${away.clubName}: ${aList || "*None*"}\n`;
  }

  const poss = extraStats?.homePossession || 50;
  const momentumBar = buildProgressBar(poss, 8);

  const embed = new EmbedBuilder()
    .setTitle(`⚽ ${home.kitEmoji} ${home.clubName} ${homeScore} - ${awayScore} ${away.kitEmoji} ${away.clubName}`)
    .setDescription(
      `**Match Status:** \`${statusText}\`\n` +
      `**Momentum:** \`${home.clubName}\` ${momentumBar} \`${away.clubName}\` (${poss}% - ${100 - poss}%)\n` +
      `**Benches:** ${homeCoach} vs ${awayCoach}\n` +
      scorersSummary +
      `\n**Live Match Timeline:**\n` +
      (recentEvents.length > 0 ? recentEvents.join("\n") : "*Kickoff whistle blown! Ball in play.*")
    )
    .setColor(isHalfTime ? 0xf59e0b : 0x22c55e)
    .setFooter({ text: "Simulated live with tactical playstyles, coach leadership, and player ratings" });

  return embed;
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

  let winnerSummary = "🤝 **Match Drawn!** Both sides share the spoils.";
  if (result.winner === result.home) {
    winnerSummary = `🏆 **Victory for ${result.home.clubName}!** (+${result.homeReward.toLocaleString()} Coins)`;
  } else if (result.winner === result.away) {
    winnerSummary = `🏆 **Victory for ${result.away.clubName}!** (+${result.awayReward.toLocaleString()} Coins)`;
  }

  // Goalscorers listing
  const hScorers = result.homeGoalScorers.map((g) => `• **${g.name}** ${g.minute}'${g.assist ? ` *(Ast: ${g.assist})*` : ""}`);
  const aScorers = result.awayGoalScorers.map((g) => `• **${g.name}** ${g.minute}'${g.assist ? ` *(Ast: ${g.assist})*` : ""}`);

  let goalText = "";
  if (hScorers.length > 0 || aScorers.length > 0) {
    goalText = `\n⚽ **Goalscorers:**\n` +
      `**${result.home.clubName}:** ${hScorers.length > 0 ? hScorers.join(", ") : "*None*"}\n` +
      `**${result.away.clubName}:** ${aScorers.length > 0 ? aScorers.join(", ") : "*None*"}\n`;
  }

  const allEventLines = result.events.slice(-6).map((e) => e.commentary);
  const stats = result.stats;
  const momentumBar = stats ? buildProgressBar(stats.homePossession, 10) : "";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      `${winnerSummary}\n` +
        goalText +
        `\n⭐ **Player of the Match:** **${result.mvp}**\n` +
        `🧠 **Tactical Breakdown:** ${result.tacticalSummary}\n\n` +
        `**Key Highlights:**\n` +
        (allEventLines.length > 0 ? allEventLines.join("\n") : "*Clean, disciplined contest.*")
    )
    .setColor(result.winner ? 0x22c55e : 0x3b82f6);

  if (stats) {
    const homeRedText = stats.homeRedCards > 0 ? ` 🟥 ${stats.homeRedCards}` : "";
    const awayRedText = stats.awayRedCards > 0 ? ` 🟥 ${stats.awayRedCards}` : "";
    const passAccText = stats.homePassAccuracy ? `• **Pass Accuracy:** ${stats.homePassAccuracy}% - ${stats.awayPassAccuracy}%\n` : "";
    const tacklesText = stats.homeTacklesWon !== undefined ? `• **Tackles Won:** ${stats.homeTacklesWon} - ${stats.awayTacklesWon}\n` : "";

    embed.addFields({
      name: "📊 Comprehensive Match Statistics",
      value:
        `• **Possession:** ${result.home.clubName} **${stats.homePossession}%** ${momentumBar} **${stats.awayPossession}%** ${result.away.clubName}\n` +
        `• **Expected Goals (xG):** **${stats.homeXg.toFixed(2)}** - **${stats.awayXg.toFixed(2)}**\n` +
        `• **Total Shots:** **${stats.homeShots}** (${stats.homeShotsOnTarget} on target) - **${stats.awayShots}** (${stats.awayShotsOnTarget} on target)\n` +
        `• **Goalkeeper Saves:** **${stats.homeSaves}** - **${stats.awaySaves}**\n` +
        passAccText +
        tacklesText +
        `• **Corners & Fouls:** Corners: ${stats.homeCorners}-${stats.awayCorners} • Fouls: ${stats.homeFouls}-${stats.awayFouls}\n` +
        `• **Discipline:** 🟨 ${stats.homeYellowCards}${homeRedText} - ${stats.awayYellowCards}${awayRedText} 🟨`,
      inline: false,
    });
  }

  if (homeRpDelta !== undefined || awayRpDelta !== undefined) {
    embed.addFields({
      name: "📈 Division Rivals RP Changes",
      value:
        `• **${result.home.managerName}**: ${homeNote || `${homeRpDelta} RP`}\n` +
        (!result.away.isBot ? `• **${result.away.managerName}**: ${awayNote || `${awayRpDelta} RP`}` : ""),
      inline: false,
    });
  }

  return embed;
}
