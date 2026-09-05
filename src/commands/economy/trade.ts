import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createTradeProposalEmbed } from "../../ui/embeds/tradeEmbeds.js";
import { createAcceptDeclineButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export const tradeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Propose a direct 1-for-1 player card exchange with another manager")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The manager you want to trade with").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("your_player")
        .setDescription("Player from your club you offer to give")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("their_player")
        .setDescription("Player from their club you want in exchange (type name or ID)")
        .setRequired(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const inventory = await economyService.getInventory(interaction.user.id);
    const tradable = inventory.filter((c) => !c.untradeable);

    const filtered = tradable
      .filter((c) => c.name.toLowerCase().includes(focused) || c.id.toLowerCase().includes(focused))
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

    const targetUser = interaction.options.getUser("user", true);
    const yourPlayerToken = interaction.options.getString("your_player", true);
    const theirPlayerToken = interaction.options.getString("their_player", true);

    if (targetUser.id === interaction.user.id || targetUser.bot) {
      await interaction.editReply({ content: "❌ You cannot trade with yourself or a bot." });
      return;
    }

    const senderInv = await economyService.getInventory(interaction.user.id);
    const receiverInv = await economyService.getInventory(targetUser.id);

    const senderCard = senderInv.find(
      (c) =>
        c.id === yourPlayerToken ||
        c.name.toLowerCase() === yourPlayerToken.toLowerCase() ||
        c.name.toLowerCase().includes(yourPlayerToken.toLowerCase())
    );

    if (!senderCard) {
      await interaction.editReply({
        content: `❌ Card \`${yourPlayerToken}\` was not found in your inventory.`,
      });
      return;
    }

    if (senderCard.untradeable) {
      await interaction.editReply({
        content: `❌ **${senderCard.name}** is untradeable and cannot be traded.`,
      });
      return;
    }

    const receiverCard = receiverInv.find(
      (c) =>
        c.id === theirPlayerToken ||
        c.name.toLowerCase() === theirPlayerToken.toLowerCase() ||
        c.name.toLowerCase().includes(theirPlayerToken.toLowerCase())
    );

    if (!receiverCard) {
      await interaction.editReply({
        content: `❌ Card \`${theirPlayerToken}\` was not found in ${targetUser.displayName}'s inventory.`,
      });
      return;
    }

    if (receiverCard.untradeable) {
      await interaction.editReply({
        content: `❌ **${receiverCard.name}** is untradeable and cannot be traded.`,
      });
      return;
    }

    const { tradeService } = await import("../../services/tradeService.js");
    const proposal = tradeService.createProposal({
      senderId: interaction.user.id,
      senderName: interaction.user.displayName,
      senderCardId: senderCard.id,
      senderCardName: senderCard.name,
      receiverId: targetUser.id,
      receiverName: targetUser.displayName,
      receiverCardId: receiverCard.id,
      receiverCardName: receiverCard.name,
    });

    const embed = createTradeProposalEmbed(
      interaction.user.displayName,
      senderCard,
      targetUser.displayName,
      receiverCard
    );

    const buttons = createAcceptDeclineButtons(`trade_${proposal.id}`);

    await interaction.editReply({
      content: `<@${targetUser.id}>, you have received a direct trade proposal from <@${interaction.user.id}>!`,
      embeds: [embed],
      components: [buttons],
    });
  },
};

