import { SlashCommandBuilder, type ChatInputCommandInteraction, TextChannel, MessageFlags } from "discord.js";
import { auctionService } from "../../services/auctionService.js";
import { startAuctionTimer } from "../../jobs/auctionTimer.js";
import { createPlayerEmbed } from "../../ui/embeds/auctionEmbeds.js";
import { createAuctionActionButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export const startCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Start the live footballer auction (Host only)"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "❌ This command must be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const auction = auctionService.getAuction(guildId);
    if (!auction) {
      await interaction.reply({ content: "❌ No auction lobby found. Create one with `/auction`.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (auction.creatorId !== interaction.user.id) {
      await interaction.reply({
        content: `❌ Only the host (<@${auction.creatorId}>) can start the auction.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!auction.canStart) {
      await interaction.reply({
        content: `❌ Need at least ${auction.minPlayers} players to start (currently ${auction.players.length}).`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const success = auctionService.startAuction(guildId);
    if (!success || !auction.currentPlayer) {
      await interaction.reply({ content: "❌ Failed to start auction: empty player pool.", flags: MessageFlags.Ephemeral });
      return;
    }


    const potCount = auction.playerPool.length + 1;
    const embed = createPlayerEmbed(auction.currentPlayer, auction.currentPlayer.startingPrice);
    const buttons = createAuctionActionButtons(auction.currentPlayer.startingPrice, true);

    await interaction.reply({
      content:
        `🎉 **Auction Started with ${auction.players.length} managers!**\n` +
        `Tournament Pot: **${potCount} players** (GK, DEF, MID, FW).\n` +
        `First footballer up for bidding:`,
      embeds: [embed],
      components: [buttons],
    });

    if (interaction.channel instanceof TextChannel) {
      startAuctionTimer(guildId, interaction.channel);
    }
  },
};
