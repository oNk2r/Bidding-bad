import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { auctionService } from "../../services/auctionService.js";
import { clearAuctionTimer } from "../../jobs/auctionTimer.js";
import type { Command } from "../types.js";

export const auctionCancelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("auction_cancel")
    .setDescription("Cancel the active auction lobby or match (Host only)"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "❌ This command must be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const auction = auctionService.getAuction(guildId);
    if (!auction) {
      await interaction.reply({ content: "❌ No active auction in this server.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (auction.creatorId !== interaction.user.id) {
      await interaction.reply({
        content: `❌ Only the host (<@${auction.creatorId}>) can cancel the auction.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }


    clearAuctionTimer(guildId);
    auctionService.removeAuction(guildId);

    await interaction.reply({ content: "🛑 Active auction has been cancelled by the host." });
  },
};
