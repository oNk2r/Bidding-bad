import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { profileService } from "../../services/profileService.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const renameclubCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("renameclub")
    .setDescription("Customize your club's official team name")
    .addStringOption((opt) =>
      opt.setName("name").setDescription("Your new club name (max 32 chars)").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const rawName = interaction.options.getString("name", true);
    const clean = await profileService.setClubName(
      interaction.user.id,
      rawName,
      interaction.user.displayName
    );
    const user = await economyService.ensureUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Club Name Updated")
      .setDescription(`Your club has been officially renamed to:\n**${user.kitEmoji} ${clean}**`)
      .setColor(0x22c55e);

    await interaction.editReply({ embeds: [embed] });
  },
};

