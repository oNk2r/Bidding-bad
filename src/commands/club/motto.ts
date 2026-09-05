import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { profileService } from "../../services/profileService.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const mottoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("motto")
    .setDescription("Set a custom motto or slogan for your club")
    .addStringOption((opt) =>
      opt.setName("text").setDescription("Your team motto (e.g. 'In Bids We Trust')").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const text = interaction.options.getString("text", true);
    const clean = await profileService.setClubMotto(interaction.user.id, text);
    const user = await economyService.ensureUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle("📢 Club Motto Updated")
      .setDescription(`Official slogan for **${user.kitEmoji} ${user.clubName}** set to:\n*\"${clean}\"*`)
      .setColor(0x22c55e);

    await interaction.editReply({ embeds: [embed] });
  },
};

