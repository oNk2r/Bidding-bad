import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { auctionService } from "../../services/auctionService.js";
import { createSquadEmbed } from "../../ui/embeds/auctionEmbeds.js";
import type { Command } from "../types.js";

export const squadCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("squad")
    .setDescription("View your current acquired squad and remaining budget in the active auction"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "❌ This command must be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const auction = auctionService.getAuction(guildId);
    if (!auction || !auction.started) {
      await interaction.reply({ content: "❌ No active auction in this server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const squad = auction.squads[interaction.user.id];
    if (!squad) {
      await interaction.reply({ content: "❌ You are not registered in this auction.", flags: MessageFlags.Ephemeral });
      return;
    }

    const budget = auction.budgets[interaction.user.id] ?? 0;
    const maxBid = auction.currentPlayer
      ? auction.calculateMaxBid(interaction.user.id, auction.currentPlayer)
      : budget;

    const embed = createSquadEmbed(squad, interaction.user.displayName, budget, maxBid);
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

