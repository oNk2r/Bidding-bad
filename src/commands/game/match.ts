import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { matchService } from "../../services/matchService.js";
import { createChallengeEmbed, createLiveMatchEmbed, createMatchResultEmbed } from "../../ui/embeds/matchEmbeds.js";
import { createAcceptDeclineButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export const matchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("match")
    .setDescription("Challenge another manager or an AI Bot to a live 90-minute head-to-head match")
    .addUserOption((opt) =>
      opt.setName("opponent").setDescription("The manager to challenge (leave empty for AI Bot)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const opponentUser = interaction.options.getUser("opponent");
    const homeSide = await matchService.buildClubMatchSide(
      interaction.user.id,
      interaction.user.displayName
    );

    if (!opponentUser || opponentUser.id === interaction.user.id || opponentUser.bot) {
      // Direct match vs AI Bot
      const awaySide = matchService.createBotSide("Dynamo Bot FC", 86, "GEGENPRESS");
      const result = matchService.simulate(homeSide, awaySide, false);

      const rpUpdate = await matchService.recordMatchOutcome(result);
      const embed = createMatchResultEmbed(
        result,
        rpUpdate.homeRpDelta,
        rpUpdate.awayRpDelta,
        rpUpdate.homeNote,
        rpUpdate.awayNote
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // PvP Match Challenge with Accept/Decline flow
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

