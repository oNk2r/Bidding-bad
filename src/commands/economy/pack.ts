import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createPackOpenedEmbed, createPackSuspenseEmbed } from "../../ui/embeds/marketEmbeds.js";
import { createPackActionButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const packCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("pack")
    .setDescription("Open standard or premium booster packs to sign new footballers and managers")
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Select pack tier")
        .setRequired(true)
        .addChoices(
          { name: "Standard Pack (500 Coins - 1 Card)", value: "standard" },
          { name: "Premium Star Pack (1,000 Coins - 3 Cards)", value: "premium" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const packType = interaction.options.getString("type", true) as "standard" | "premium";
    const res = await economyService.openPack(
      interaction.user.id,
      packType,
      interaction.user.displayName
    );

    if (!res.success || !res.result) {
      await interaction.editReply({ content: res.message });
      return;
    }

    const cards = res.result.cards;
    const topCard = [...cards].sort((a, b) => b.rating - a.rating)[0];
    const isManager = topCard && topCard.position === "MGR";
    const isWalkout = topCard && (topCard.rating >= 86 || isManager);
    const avatar = interaction.user.displayAvatarURL();

    if (isWalkout && topCard) {
      // Stage 1: Nationality Suspense
      const stage1 = createPackSuspenseEmbed(packType, 1, topCard, interaction.user.displayName, avatar);
      await interaction.editReply({ embeds: [stage1] });
      await delay(1000);

      // Stage 2: Position / Tactical Role Suspense
      const stage2 = createPackSuspenseEmbed(packType, 2, topCard, interaction.user.displayName, avatar);
      await interaction.editReply({ embeds: [stage2] });
      await delay(1000);

      // Stage 3: Club / Crest Suspense
      const stage3 = createPackSuspenseEmbed(packType, 3, topCard, interaction.user.displayName, avatar);
      await interaction.editReply({ embeds: [stage3] });
      await delay(1100);
    }

    const embed = createPackOpenedEmbed(res.result, interaction.user.displayName, avatar);
    const canAffordAgain = res.result.newBalance >= res.result.cost;
    const tradableCount = res.result.cards.filter((c) => !c.untradeable).length;
    const buttons = createPackActionButtons(packType, canAffordAgain, tradableCount, res.result.cost);

    await interaction.editReply({
      content: "",
      embeds: [embed],
      components: [buttons],
    });
  },
};

