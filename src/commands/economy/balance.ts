import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createBalanceEmbed } from "../../ui/embeds/marketEmbeds.js";
import type { Command } from "../types.js";

export const balanceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your club's treasury coins and net valuation")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The manager whose balance to inspect").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("user") || interaction.user;
    const coins = await economyService.getCoins(target.id);
    const clubValue = await economyService.getClubValuation(target.id);

    const embed = createBalanceEmbed(coins, clubValue, target.displayName);
    await interaction.editReply({ embeds: [embed] });
  },
};

