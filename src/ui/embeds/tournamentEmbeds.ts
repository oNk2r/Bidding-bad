import { EmbedBuilder } from "discord.js";
import { TournamentState, type TournamentFixture } from "../../services/tournamentService.js";

export function createTournamentLobbyEmbed(tournament: TournamentState): EmbedBuilder {
  const pList = tournament.participants.map((p, idx) => {
    const isHost = p.userId === tournament.hostId ? " 👑" : "";
    return `**${idx + 1}.** ${p.clubSide.kitEmoji} **${p.clubSide.clubName}** (${p.userName})${isHost}`;
  });

  return new EmbedBuilder()
    .setTitle(`🏆 Tournament Lobby — ${tournament.name}`)
    .setDescription(
      `**Format:** \`${tournament.formatType === "ROUND_ROBIN" ? "3-Way Round Robin League" : `${tournament.size}-Club Single Elimination Knockout`}\`\n` +
        `**Entry Fee:** **${tournament.entryFee.toLocaleString()} Coins**\n` +
        `**Prize Pool:** 👑 **${(tournament.size * tournament.entryFee * 1.5).toLocaleString()} Coins**\n\n` +
        `**Registered Clubs (${tournament.participants.length}/${tournament.size}):**\n` +
        (pList.length > 0 ? pList.join("\n") : "*No clubs yet*")
    )
    .setColor(0xeab308)
    .setFooter({ text: "Click Join to enter • Host clicks Start Tournament" });
}

export function createTournamentBracketEmbed(tournament: TournamentState): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${tournament.name} — Tournament Progression`)
    .setColor(0x3b82f6);

  for (const fix of tournament.fixtures) {
    const homeName = fix.home ? `${fix.home.kitEmoji} ${fix.home.clubName}` : "TBD";
    const awayName = fix.away ? `${fix.away.kitEmoji} ${fix.away.clubName}` : "TBD";

    let scoreLine = "⏳ *Scheduled*";
    if (fix.result) {
      scoreLine = `**${fix.result.homeScore} - ${fix.result.awayScore}** (Winner: **${fix.winner?.clubName}**)`;
    }

    embed.addFields({
      name: `${fix.roundName}: ${homeName} vs ${awayName}`,
      value: scoreLine,
      inline: false,
    });
  }

  return embed;
}

export function createTournamentStandingsEmbed(tournament: TournamentState): EmbedBuilder {
  const sorted = [...tournament.participants].sort(
    (a, b) => (b.points || 0) - (a.points || 0) || (b.goalDiff || 0) - (a.goalDiff || 0)
  );

  const lines = sorted.map((p, idx) => {
    return `**${idx + 1}.** ${p.clubSide.kitEmoji} **${p.clubSide.clubName}** — **${p.points || 0} Pts** (GD: ${p.goalDiff || 0})`;
  });

  return new EmbedBuilder()
    .setTitle(`📊 League Standings — ${tournament.name}`)
    .setDescription(lines.join("\n"))
    .setColor(0x22c55e);
}

export function createTournamentChampionEmbed(tournament: TournamentState): EmbedBuilder {
  const winner = tournament.winner;
  const winnerName = winner ? `${winner.clubSide.kitEmoji} **${winner.clubSide.clubName}** (${winner.userName})` : "Undetermined";

  return new EmbedBuilder()
    .setTitle(`👑 TOURNAMENT CHAMPION CROWNED!`)
    .setDescription(
      `🎉 Congratulations to **${winnerName}** for winning **${tournament.name}**!\n\n` +
        `🏆 **Championship Prize:** **${(tournament.size * tournament.entryFee * 1.5).toLocaleString()} Coins** awarded to the winner!`
    )
    .setColor(0xeab308)
    .setFooter({ text: "Congratulations to all participating managers!" });
}
