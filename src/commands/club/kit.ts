import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { profileService } from "../../services/profileService.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const kitCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("kit")
    .setDescription("Choose your club's official kit style and badge emoji")
    .addStringOption((opt) =>
      opt
        .setName("style")
        .setDescription("Select your team kit colors")
        .setRequired(true)
        .addChoices(
          { name: "🔴⚪ Red & White", value: "🔴⚪" },
          { name: "🔵⚪ Blue & White", value: "🔵⚪" },
          { name: "🔵🟡 Blue & Gold", value: "🔵🟡" },
          { name: "⚫🔴 Black & Red", value: "⚫🔴" },
          { name: "🟢⚪ Green & White", value: "🟢⚪" },
          { name: "🟣⚪ Purple & White", value: "🟣⚪" },
          { name: "⚫🟡 Black & Yellow", value: "⚫🟡" },
          { name: "🟠⚫ Orange & Black", value: "🟠⚫" },
          { name: "👑✨ Royal Gold", value: "👑✨" },
          { name: "🤖⚪ Cyber Bot", value: "🤖⚪" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const style = interaction.options.getString("style", true);
    await profileService.setClubKit(interaction.user.id, style);
    const user = await economyService.ensureUser(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle("👕 Club Kit Updated")
      .setDescription(`New official kit set for **${user.clubName}**:\n**${style}**`)
      .setColor(0x22c55e);

    await interaction.editReply({ embeds: [embed] });
  },
};

