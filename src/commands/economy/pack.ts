import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createPackOpenedEmbed } from "../../ui/embeds/marketEmbeds.js";
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
          { name: "Standard Pack (250 Coins - 1 Card)", value: "standard" },
          { name: "Premium Star Pack (600 Coins - 3 Cards)", value: "premium" }
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

    if (isWalkout) {
      // Stage 1: Tearing Seal
      await interaction.editReply({
        content: `📦 **Tearing open ${packType.toUpperCase()} pack seal...** ✨ ✨ ✨`,
      });
      await delay(600);

      // Stage 2: Nationality Suspense
      await interaction.editReply({
        content:
          `📦 **Opening ${packType.toUpperCase()} Pack...**\n` +
          `🌍 **Nationality:** **${topCard.nation.toUpperCase()}**...`,
      });
      await delay(650);

      // Stage 3: Position / Role
      const posLabel = isManager ? "👔 HEAD COACH / MANAGER" : topCard.position;
      await interaction.editReply({
        content:
          `📦 **Opening ${packType.toUpperCase()} Pack...**\n` +
          `🌍 **Nationality:** **${topCard.nation.toUpperCase()}**\n` +
          `🛡️ **Position / Role:** **${posLabel}**...`,
      });
      await delay(650);

      // Stage 4: Club / League
      await interaction.editReply({
        content:
          `📦 **Opening ${packType.toUpperCase()} Pack...**\n` +
          `🌍 **Nationality:** **${topCard.nation.toUpperCase()}**\n` +
          `🛡️ **Position / Role:** **${posLabel}**\n` +
          `🏟️ **Club:** **${topCard.club.toUpperCase()}**...`,
      });
      await delay(700);
    }

    const embed = createPackOpenedEmbed(res.result, interaction.user.displayName);

    let headline = `✨ **Pack Opened!**`;
    if (topCard) {
      if (isManager) {
        headline = `💥 **TACTICAL MASTERCLASS WALKOUT!** 👔 **${topCard.name.toUpperCase()}** (\`${topCard.rating} MGR\`) signs for your club! 🎉`;
      } else if (isWalkout) {
        headline = `💥 **WALKOUT!** ⭐ **${topCard.name.toUpperCase()}** (\`${topCard.rating} ${topCard.position}\` — *${topCard.tierName}*)! 🎉`;
      } else {
        headline = `✨ **Pack Opened!** Card Acquired: **${topCard.name}** (\`${topCard.rating} ${topCard.position}\`)`;
      }
    }

    await interaction.editReply({
      content: headline,
      embeds: [embed],
    });
  },
};
