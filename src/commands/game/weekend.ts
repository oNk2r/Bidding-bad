import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { weekendService } from "../../services/weekendService.js";
import { createWeekendLeagueEmbed } from "../../ui/embeds/seasonEmbeds.js";
import { createMatchResultEmbed } from "../../ui/embeds/matchEmbeds.js";
import type { Command } from "../types.js";

export const weekendCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("weekend")
    .setDescription("Weekend League: 5-Match Ranked Gauntlet for huge Coins, Packs & SXP rewards")
    .addSubcommand((sub) => sub.setName("play").setDescription("Play the next gauntlet fixture"))
    .addSubcommand((sub) => sub.setName("status").setDescription("View current gauntlet standings and record"))
    .addSubcommand((sub) => sub.setName("reset").setDescription("Reset your gauntlet to start a fresh run")),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "reset") {
      const run = await weekendService.resetRun(interaction.user.id);
      const embed = createWeekendLeagueEmbed(interaction.user.displayName, run);
      await interaction.editReply({
        content: "🔄 **Weekend League Gauntlet has been reset!** Good luck in your matches.",
        embeds: [embed],
      });
      return;
    }

    if (subcommand === "status") {
      const run = await weekendService.getCurrentRun(interaction.user.id);
      const embed = createWeekendLeagueEmbed(interaction.user.displayName, run);

      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("weekend_play_next")
          .setLabel(run.isFinished ? "Gauntlet Finished" : `Play Match ${run.activeMatchIdx + 1}/5`)
          .setStyle(ButtonStyle.Success)
          .setEmoji("⚽")
          .setDisabled(run.isFinished)
      );

      await interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });
      return;
    }

    if (subcommand === "play") {
      const res = await weekendService.playNextMatch(interaction.user.id, interaction.user.displayName);
      if (!res.success || !res.result || !res.run) {
        await interaction.editReply({ content: res.message });
        return;
      }

      const matchEmbed = createMatchResultEmbed(res.result);
      const leagueEmbed = createWeekendLeagueEmbed(interaction.user.displayName, res.run);

      let msg = res.message;
      if (res.rewardDesc) {
        msg += `\n\n${res.rewardDesc}`;
      }

      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("weekend_play_next")
          .setLabel(res.run.isFinished ? "Gauntlet Complete 🏆" : `Next Match (${res.run.activeMatchIdx + 1}/5)`)
          .setStyle(ButtonStyle.Success)
          .setEmoji("⚽")
          .setDisabled(res.run.isFinished)
      );

      await interaction.editReply({
        content: msg,
        embeds: [matchEmbed, leagueEmbed],
        components: [buttons],
      });
    }
  },
};
