import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { auctionService } from "../../services/auctionService.js";
import { createLobbyEmbed } from "../../ui/embeds/auctionEmbeds.js";
import { createLobbyButtons } from "../../ui/components/buttons.js";
 import type { Command } from "../types.js";

export const auctionCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("auction")
    .setDescription("Create a new live footballer auction lobby for this server"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "❌ This command must be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const existing = auctionService.getAuction(guildId);
    if (existing && existing.started) {
      await interaction.reply({
        content: "❌ An auction is already active in this server. Use `/bid` or `/pass`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }


    const auction = auctionService.createAuction(
      guildId,
      interaction.user.id,
      interaction.user.displayName
    );

    const embed = createLobbyEmbed(auction);
    const buttons = createLobbyButtons(auction.canStart);

    await interaction.reply({
      embeds: [embed],
      components: [buttons],
    });
  },
};
