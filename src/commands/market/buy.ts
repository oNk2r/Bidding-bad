import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { marketService } from "../../services/marketService.js";
import type { Command } from "../types.js";

export const buyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Purchase a player card from the Transfer Market")
    .addStringOption((opt) =>
      opt
        .setName("listing_id")
        .setDescription("Select a listing to Buy Now")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const { listings } = await marketService.getListings(1, 25, {
      search: focused || undefined,
      excludeSellerId: interaction.user.id,
    });

    await interaction.respond(
      listings.slice(0, 25).map((l) => ({
        name: `${l.card.name} (${l.card.rating} ${l.card.position}) — ${l.price.toLocaleString()} Coins [${l.sellerName || "Market"}]`.slice(0, 100),
        value: l.id,
      }))
    );
  },

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

