import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createInventoryEmbed } from "../../ui/embeds/marketEmbeds.js";
import { createPaginationButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export const inventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your club's collected player cards")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The manager whose cards to view").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("page").setDescription("Page number").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("user") || interaction.user;
    const page = Math.max(1, interaction.options.getInteger("page") || 1);

    const cards = await economyService.getInventory(target.id);
    const totalPages = Math.max(1, Math.ceil(cards.length / 10));
    const safePage = Math.min(page, totalPages);

    const embed = createInventoryEmbed(cards, target.displayName, safePage, 10, target.displayAvatarURL());
    const buttons = createPaginationButtons(safePage, totalPages, `inv_${target.id}`);

    await interaction.editReply({
      embeds: [embed],
      components: totalPages > 1 ? [buttons] : [],
    });
  },
};

