import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const quicksellCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("quicksell")
    .setDescription("Liquidate 1 or multiple player/manager cards instantly for coin valuation")
    .addStringOption((opt) =>
      opt
        .setName("card")
        .setDescription("Specific card to liquidate immediately (leave empty for multi-select menu)")
        .setRequired(false)
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
        name: `${c.name} (${c.rating} ${c.position}) - ${c.value.toLocaleString()} Coins`.slice(0, 100),
        value: c.id,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const cardId = interaction.options.getString("card");

    // Case 1: Direct single card quicksell
    if (cardId) {
      await interaction.deferReply();
      const res = await economyService.quicksellCard(interaction.user.id, cardId);
      if (!res.success) {
        await interaction.editReply({ content: res.message });
        return;
      }
      await interaction.editReply({
        content: `💰 ${res.message}\n💳 **New Treasury Balance:** **${res.newBalance?.toLocaleString()} Coins**`,
      });
      return;
    }

    // Case 2: Interactive Multi-Select Menu
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const inventory = await economyService.getInventory(interaction.user.id);
    const tradable = inventory.filter((c) => !c.untradeable);

    if (tradable.length === 0) {
      await interaction.editReply({
        content: "❌ You have no tradable cards in your inventory to quicksell.",
      });
      return;
    }

    const options = tradable.slice(0, 25).map((c) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${c.name.slice(0, 25)} (${c.rating} ${c.position})`)
        .setDescription(`${c.club.slice(0, 20)} • Value: ${c.value.toLocaleString()} Coins`)
        .setValue(c.id)
    );

    const maxSelectable = Math.min(25, options.length);
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("quicksell_multi_select")
      .setPlaceholder("🔥 Select 1 or multiple cards to liquidate...")
      .setMinValues(1)
      .setMaxValues(maxSelectable)
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.editReply({
      content:
        `💰 **Multi-Card Liquidation Hub**\n` +
        `Select any number of cards (up to ${maxSelectable}) from the menu below to liquidate them all at once for instant coins:\n` +
        `*Inventory: ${inventory.length}/50 cards*`,
      components: [row],
    });
  },
};


