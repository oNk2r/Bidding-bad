import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { profileService } from "../../services/profileService.js";
import { createManagerProfileEmbed } from "../../ui/embeds/profileEmbeds.js";
import type { Command } from "../types.js";

export const profileCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View comprehensive manager career stats, ratings, archetypes, and role badges")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The manager whose profile to inspect").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("user") || interaction.user;
    const profile = await profileService.getManagerProfile(target.id, target.displayName);
    const embed = createManagerProfileEmbed(profile);

    await interaction.editReply({ embeds: [embed] });
  },
};

