import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { matchService } from "../../services/matchService.js";
import { ClubMatchSide } from "../../models/match.js";
import { createChallengeEmbed, createMatchResultEmbed } from "../../ui/embeds/matchEmbeds.js";
import { createAcceptDeclineButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export async function runLiveMatchSimulation(
  interaction: any,
  homeSide: ClubMatchSide,
  awaySide: ClubMatchSide
): Promise<void> {
  const result = matchService.simulate(homeSide, awaySide, false);
  const rpUpdate = await matchService.recordMatchOutcome(result);

  const finalEmbed = createMatchResultEmbed(
    result,
    rpUpdate.homeRpDelta,
    rpUpdate.awayRpDelta,
    rpUpdate.homeNote,
    rpUpdate.awayNote
  );

  await interaction.editReply({
    content: `🏁 **FULL TIME!** Final Score: ${homeSide.kitEmoji} **${homeSide.clubName} ${result.homeScore} - ${result.awayScore} ${awaySide.clubName}** ${awaySide.kitEmoji}`,
    embeds: [finalEmbed],
    components: [],
  });
}

export const matchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("match")
    .setDescription("Challenge another manager to a live 90-minute head-to-head match")
    .addUserOption((opt) =>
      opt.setName("opponent").setDescription("The manager to challenge").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const opponentUser = interaction.options.getUser("opponent", true);

    if (opponentUser.id === interaction.user.id) {
      await interaction.editReply({
        content: "❌ You cannot challenge yourself to a match! Please select another manager.",
      });
      return;
    }

    if (opponentUser.bot) {
      await interaction.editReply({
        content: "❌ You cannot challenge a Discord bot! Matches are head-to-head duels between managers.",
      });
      return;
    }

    const homeSide = await matchService.buildClubMatchSide(
      interaction.user.id,
      interaction.user.displayName
    );

    const awaySide = await matchService.buildClubMatchSide(
      opponentUser.id,
      opponentUser.displayName
    );

    const embed = createChallengeEmbed(
      homeSide,
      opponentUser.displayName,
      awaySide.clubName,
      awaySide.kitEmoji,
      awaySide.tactic.name
    );

    const buttons = createAcceptDeclineButtons(
      `match_${interaction.user.id}_${opponentUser.id}`
    );

    await interaction.editReply({
      content: `<@${opponentUser.id}>, you have received a match challenge from <@${interaction.user.id}>!`,
      embeds: [embed],
      components: [buttons],
    });
  },
};
