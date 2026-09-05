import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { marketService } from "../../services/marketService.js";
import type { Command } from "../types.js";

export const buyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Purchase a player card from the Transfer Market")
    .addStringOption((opt) =>
      opt.setName("listing_id").setDescription("The Listing ID from /market").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const listingId = interaction.options.getString("listing_id", true);
    const res = await marketService.buyCard(
      interaction.user.id,
      listingId,
      interaction.user.displayName
    );

    if (!res.success || !res.boughtCard) {
      await interaction.editReply({ content: res.message });
      return;
    }

    await interaction.editReply({
      content:
        `🎉 **Transfer Finalized!** You bought **${res.boughtCard.name}** (${res.boughtCard.rating} ${res.boughtCard.position})!\n` +
        `💳 **New Treasury Balance:** **${res.newBalance?.toLocaleString()} Coins**`,
    });
  },
};

