import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { marketService } from "../../services/marketService.js";
import type { Command } from "../types.js";

export const cancelListingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("cancel_listing")
    .setDescription("Cancel your active market listing and return the card to your inventory")
    .addStringOption((opt) =>
      opt
        .setName("listing_id")
        .setDescription("Select your listing to cancel")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const myListings = await marketService.getUserListings(interaction.user.id);
    await interaction.respond(
      myListings.slice(0, 25).map((l) => ({
        name: `${l.card.name} (${l.card.rating} ${l.card.position}) - ${l.price} Coins`.slice(0, 100),
        value: l.id,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const listingId = interaction.options.getString("listing_id", true);
    const res = await marketService.cancelListing(interaction.user.id, listingId);

    if (!res.success) {
      await interaction.editReply({ content: res.message });
      return;
    }

    await interaction.editReply({ content: `✅ ${res.message}` });
  },
};

