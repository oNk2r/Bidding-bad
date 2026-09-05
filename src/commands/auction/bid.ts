import { SlashCommandBuilder, type ChatInputCommandInteraction, TextChannel, MessageFlags } from "discord.js";
import { auctionService } from "../../services/auctionService.js";
import { startAuctionTimer } from "../../jobs/auctionTimer.js";
import { createPlayerEmbed } from "../../ui/embeds/auctionEmbeds.js";
import { createAuctionActionButtons } from "../../ui/components/buttons.js";
import { BID_TIMER_SECONDS } from "../../config/constants.js";
import type { Command } from "../types.js";

export const bidCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("bid")
    .setDescription("Place a bid on the footballer currently on auction")
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Bid amount in dollars (e.g. 5)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "❌ This command must be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const auction = auctionService.getAuction(guildId);
    if (!auction || !auction.started || !auction.currentPlayer) {
      await interaction.reply({ content: "❌ No active footballer is currently on auction.", flags: MessageFlags.Ephemeral });
      return;
    }

    const prevBidderId = auction.currentBidder;
    const { getRemainingTimerSeconds } = await import("../../jobs/auctionTimer.js");
    const remaining = getRemainingTimerSeconds(guildId);
    const isAntiSnipe = remaining > 0 && remaining <= 5;
    const timerDuration = isAntiSnipe ? BID_TIMER_SECONDS + 10 : BID_TIMER_SECONDS;

    const amount = interaction.options.getInteger("amount") || undefined;
    const res = auction.placeBid(interaction.user.id, amount);

    if (!res.success) {
      await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
      return;
    }

    auction.setPlayerName(interaction.user.id, interaction.user.displayName);

    const embed = createPlayerEmbed(
      auction.currentPlayer,
      res.newBid,
      interaction.user.displayName
    );
    const buttons = createAuctionActionButtons(res.newBid, true);

    let content = `💰 **${interaction.user.displayName}** placed a bid of **$${res.newBid}**! Timer reset to **${timerDuration}s**!`;
    if (isAntiSnipe) {
      content += `\n⚡ **ANTI-SNIPE ACTIVATED!** +10s extension added to prevent sniping!`;
    }
    if (prevBidderId && prevBidderId !== interaction.user.id) {
      content += `\n⚠️ <@${prevBidderId}>, you have been outbid on **${auction.currentPlayer.name}**!`;
    }

    await interaction.reply({
      content,
      embeds: [embed],
      components: [buttons],
    });

    if (interaction.channel instanceof TextChannel) {
      startAuctionTimer(guildId, interaction.channel, timerDuration);
    }
  },
};
