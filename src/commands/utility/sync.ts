import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import type { Command } from "../types.js";

export const syncCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Sync and refresh active application slash commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (interaction.client.application) {
        await interaction.client.application.commands.set(
          Array.from(interaction.client.commands.values()).map((c) => c.data)
        );
        await interaction.editReply({
          content: `✅ Successfully synced ${interaction.client.commands.size} application slash commands!`,
        });
      } else {
        await interaction.editReply({ content: "❌ Application not ready to sync." });
      }
    } catch (err) {
      await interaction.editReply({ content: `❌ Sync error: ${err}` });
    }
  },
};

