import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createSpinEmbed } from "../../ui/embeds/spinEmbeds.js";
import type { Command } from "../types.js";

export const spinCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("spin")
    .setDescription("Spin the Lucky Mystery Wheel! (1 Free spin every 12h, or 100 coins)"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const res = await economyService.claimSpinWheel(
      interaction.user.id,
      interaction.user.displayName
    );

    if (!res.success || !res.payload) {
      await interaction.editReply({ content: res.message });
      return;
    }

    const embed = createSpinEmbed({
      sector: res.payload.sector,
      userName: interaction.user.displayName,
      rewardDesc: res.payload.rewardDesc,
      newBal: res.payload.newBalance,
      cardPulled: res.payload.card,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};

