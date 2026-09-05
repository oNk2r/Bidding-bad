import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { divisionService } from "../../services/divisionService.js";
import { createDivisionLeaderboardEmbed } from "../../ui/embeds/divisionEmbeds.js";
import type { Command } from "../types.js";

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the global Division Rivals leaderboard of top-ranked managers"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const topUsers = await divisionService.getLeaderboard(10);
    const embed = createDivisionLeaderboardEmbed(topUsers);
    await interaction.editReply({ embeds: [embed] });
  },
};

