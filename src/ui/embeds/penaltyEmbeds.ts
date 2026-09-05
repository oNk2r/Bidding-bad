import { EmbedBuilder } from "discord.js";
import { PenaltyShootoutState } from "../../models/penalty.js";

export function createPenaltyEmbed(state: PenaltyShootoutState): EmbedBuilder {
  const currentShooter = state.currentTurn === "HOME" ? state.homeName : state.awayName;
  const currentKeeper = state.currentTurn === "HOME" ? state.awayName : state.homeName;

  let title = `🎯 1v1 Penalty Shootout (Round ${state.currentRound})`;
  let desc = `**Wager:** 💰 **${state.wager.toLocaleString()} Coins**\n\n`;

  desc += `${state.getScoreStr()}\n\n`;

  if (!state.isFinished) {
    desc += `⚽ **Shooter:** **${currentShooter}**\n🧤 **Goalkeeper:** **${currentKeeper}**\n\n`;
    desc += `*Shooter, choose your placement angle below! Keeper, choose your diving direction!*`;
  } else {
    const winnerName = state.winnerId === state.homeId ? state.homeName : state.awayName;
    title = `🏆 SHOOTOUT FINISHED — ${winnerName} Wins!`;
    desc += `🎉 **${winnerName}** claims victory and the **${(state.wager * 2).toLocaleString()} Coin** prize purse!`;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(state.isFinished ? 0x22c55e : 0xef4444);

  if (state.history.length > 0) {
    const lastShot = state.history[state.history.length - 1];
    embed.addFields({
      name: `Last Kick (Round ${lastShot.roundNum})`,
      value: lastShot.commentary,
    });
  }

  return embed;
}
