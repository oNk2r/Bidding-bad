import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createDropEmbed } from "../../ui/embeds/clubEmbeds.js";
import type { Command } from "../types.js";

export const dropCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("drop")
    .setDescription("Claim your 6-hour scout player drop (random footballer card + bonus cash)"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const res = await economyService.claimDrop(interaction.user.id, interaction.user.displayName);

    if (!res.success || !res.result) {
      await interaction.editReply({ content: res.message });
      return;
    }

    const embed = createDropEmbed(res.result, interaction.user.displayName);
    await interaction.editReply({ embeds: [embed] });
  },
};

