import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createDailyRewardEmbed } from "../../ui/embeds/marketEmbeds.js";
import type { Command } from "../types.js";

export const dailyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your 20-hour daily treasury login reward (streak bonuses up to 7 days)"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const res = await economyService.claimDailyReward(
      interaction.user.id,
      interaction.user.displayName
    );

    if (!res.success) {
      await interaction.editReply({ content: res.message });
      return;
    }

    const embed = createDailyRewardEmbed(
      res.streak || 1,
      res.coinsAwarded || 250,
      res.newBalance || 0,
      interaction.user.displayName
    );

    await interaction.editReply({ embeds: [embed] });
  },
};

