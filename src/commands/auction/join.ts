import { SlashCommandBuilder, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { auctionService } from "../../services/auctionService.js";
import { createLobbyEmbed } from "../../ui/embeds/auctionEmbeds.js";
import { createLobbyButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export const joinCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Join the active auction lobby in this server"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: "❌ This command must be used in a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    const auction = auctionService.getAuction(guildId);
    if (!auction) {
      await interaction.reply({
        content: "❌ No auction lobby found. Create one with `/auction`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const res = auction.addPlayer(interaction.user.id, interaction.user.displayName);
    if (!res.success) {
      await interaction.reply({ content: `❌ ${res.message}`, flags: MessageFlags.Ephemeral });
      return;
    }


    const embed = createLobbyEmbed(auction);
    const buttons = createLobbyButtons(auction.canStart);

    await interaction.reply({
      content: `✅ ${interaction.user.displayName} joined the auction lobby!`,
      embeds: [embed],
      components: [buttons],
    });
  },
};
