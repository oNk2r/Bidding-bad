import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { marketService } from "../../services/marketService.js";
import { createMarketEmbed } from "../../ui/embeds/marketEmbeds.js";
import { createPaginationButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export const marketCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("market")
    .setDescription("Browse player cards listed on the global Transfer Market with 1-click buying & cancellation")
    .addIntegerOption((opt) =>
      opt.setName("page").setDescription("Page number").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("search").setDescription("Search by player name, club, or position").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const page = Math.max(1, interaction.options.getInteger("page") || 1);
    const search = interaction.options.getString("search") || undefined;

    const { listings, total, totalPages } = await marketService.getListings(page, 5, search);
    const safePage = Math.min(page, Math.max(1, totalPages));

    const embed = createMarketEmbed(listings, safePage, totalPages, total);
    const components: any[] = [];

    if (listings.length > 0) {
      const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("market_buy_select")
          .setPlaceholder("🛒 Select a footballer to Buy Now...")
          .addOptions(
            listings.map((l) => ({
              label: `${l.card.name.slice(0, 25)} (${l.card.rating} ${l.card.position})`,
              description: `Price: ${l.price.toLocaleString()} Coins • Seller: ${(l.sellerName || "Market").slice(0, 20)}`,
              value: l.id,
              emoji: "⚡",
            }))
          )
      );
      components.push(selectMenu);
    }

    if (totalPages > 1) {
      components.push(createPaginationButtons(safePage, totalPages, "mkt"));
    }

    const actionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("market_my_listings")
        .setLabel("Manage My Listings / Cancel")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📦")
    );
    components.push(actionButtons);

    await interaction.editReply({
      embeds: [embed],
      components,
    });
  },
};
