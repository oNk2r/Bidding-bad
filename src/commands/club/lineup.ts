import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const lineupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("lineup")
    .setDescription("Customize your club's Starting 5 lineup for matches and pitch graphics"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const inventory = await economyService.getInventory(interaction.user.id);
    if (inventory.length < 5) {
      await interaction.editReply({
        content: `❌ You need at least 5 cards in your inventory to configure a custom lineup (You have **${inventory.length} cards**).\nCollect cards with \`/daily\`, \`/pack\`, or \`/market\`.`,
      });
      return;
    }

    const options = inventory.slice(0, 25).map((c) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${c.name} (${c.rating} ${c.position})`)
        .setDescription(`${c.club} • ${c.nation}`)
        .setValue(c.id)
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("lineup_select_5")
      .setPlaceholder("Select exactly 5 players for your Starting 5")
      .setMinValues(5)
      .setMaxValues(5)
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.editReply({
      content:
        `📋 **Starting 5 Lineup Editor**\n` +
        `Select exactly 5 players from your top cards below.\n` +
        `*Formation Rules: Exactly 1 GK, and 1-2 DEF, 1-2 MID, 1-2 FW.*`,
      components: [row],
    });
  },
};

