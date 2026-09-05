import { SlashCommandBuilder, type ChatInputCommandInteraction, TextChannel, MessageFlags } from "discord.js";
import { auctionService } from "../../services/auctionService.js";
import { startAuctionTimer, finishAuctionWorkflow } from "../../jobs/auctionTimer.js";
import { createPlayerEmbed } from "../../ui/embeds/auctionEmbeds.js";
import { createAuctionActionButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export const passCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("pass")
    .setDescription("Pass / vote to skip the current footballer on auction"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "❌ This command must be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const auction = auctionService.getAuction(guildId);
    if (!auction || !auction.started || !auction.currentPlayer) {
      await interaction.reply({ content: "❌ No active footballer on auction.", flags: MessageFlags.Ephemeral });
      return;
    }


    auction.passedPlayers.add(interaction.user.id);
    const needed = auction.players.length;
    const current = auction.passedPlayers.size;

    if (current >= needed) {
      // Unanimous pass -> skip immediately
      const skipped = auction.skipCurrentPlayer();
      const isFinished = auction.isFinished();
      const hasNext = !isFinished && auction.nextPlayer();

      if (isFinished || !hasNext) {
        await interaction.reply({ content: `⏭️ Unanimous pass! **${skipped?.name}** skipped.` });
        if (interaction.channel instanceof TextChannel) {
          await finishAuctionWorkflow(guildId, interaction.channel);
        }
        return;
      }

      if (auction.currentPlayer) {
        const embed = createPlayerEmbed(auction.currentPlayer, auction.currentPlayer.startingPrice);
        const buttons = createAuctionActionButtons(auction.currentPlayer.startingPrice, true);

        await interaction.reply({
          content: `⏭️ Unanimous pass! **${skipped?.name}** skipped.\nNext player:`,
          embeds: [embed],
          components: [buttons],
        });

        if (interaction.channel instanceof TextChannel) {
          startAuctionTimer(guildId, interaction.channel);
        }
      }
    } else {
      await interaction.reply({
        content: `🗳️ **${interaction.user.displayName}** passed on this player (${current}/${needed} passes).`,
      });
    }
  },
};
