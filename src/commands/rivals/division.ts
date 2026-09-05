import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { divisionService } from "../../services/divisionService.js";
import { createDivisionProfileEmbed } from "../../ui/embeds/divisionEmbeds.js";
import type { Command } from "../types.js";

export const divisionCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("division")
    .setDescription("Division Rivals Hub: Ranked ladder, RP progress bar, leaderboards & weekly rewards")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("View another manager's status (optional)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("user") || interaction.user;
    const profile = await divisionService.getDivisionProfile(target.id, target.displayName);
    const embed = createDivisionProfileEmbed(profile);

    await interaction.editReply({ embeds: [embed] });
  },
};

