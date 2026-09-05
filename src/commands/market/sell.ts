import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { marketService } from "../../services/marketService.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const sellCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("List a player card on the global Transfer Market for other managers to buy")
    .addStringOption((opt) =>
      opt
        .setName("card")
        .setDescription("Select a card from your inventory")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("price")
        .setDescription("Listing price in coins (10 - 1,000,000)")
        .setRequired(true)
        .setMinValue(10)
        .setMaxValue(1000000)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const inventory = await economyService.getInventory(interaction.user.id);
    const tradable = inventory.filter((c) => !c.untradeable);

    const filtered = tradable
      .filter(
        (c) =>
          c.name.toLowerCase().includes(focused) ||
          c.id.toLowerCase().includes(focused) ||
          c.club.toLowerCase().includes(focused)
      )
      .slice(0, 25);

    await interaction.respond(
      filtered.map((c) => ({
        name: `${c.name} (${c.rating} ${c.position}) - ${c.club}`.slice(0, 100),
        value: c.id,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const cardId = interaction.options.getString("card", true);
    const price = interaction.options.getInteger("price", true);

    const res = await marketService.listCard(
      interaction.user.id,
      cardId,
      price,
      interaction.user.displayName
    );

    if (!res.success) {
      await interaction.editReply({ content: res.message });
      return;
    }

    await interaction.editReply({ content: `✅ ${res.message}` });
  },
};

