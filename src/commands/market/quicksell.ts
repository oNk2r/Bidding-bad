import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const quicksellCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("quicksell")
    .setDescription("Liquidate a player card instantly for its official valuation coins")
    .addStringOption((opt) =>
      opt
        .setName("card")
        .setDescription("Select or search a card from your inventory")
        .setRequired(true)
        .setAutocomplete(true)
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
        name: `${c.name} (${c.rating} ${c.position}) - ${c.value} Coins`.slice(0, 100),
        value: c.id,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const cardId = interaction.options.getString("card", true);
    const res = await economyService.quicksellCard(interaction.user.id, cardId);

    if (!res.success) {
      await interaction.editReply({ content: res.message });
      return;
    }

    await interaction.editReply({
      content: `💰 ${res.message}\n💳 **New Treasury Balance:** **${res.newBalance?.toLocaleString()} Coins**`,
    });
  },
};

