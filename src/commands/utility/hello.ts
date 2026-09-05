import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { Command } from "../types.js";

export const helloCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Say hello to Bidding Bad"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      content: "👋 Welcome to **Bidding Bad**! Type `/help` or `/auction` to get started.",
    });
  },
};
