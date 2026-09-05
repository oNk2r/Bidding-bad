import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createPackOpenedEmbed } from "../../ui/embeds/marketEmbeds.js";
import { renderPlayerCard } from "../../ui/canvas/cardCanvas.js";
import type { Command } from "../types.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const packCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("pack")
    .setDescription("Open standard or premium booster packs to sign new footballers")
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Select pack tier")
        .setRequired(true)
        .addChoices(
          { name: "Standard Pack (250 Coins - 3 Cards)", value: "standard" },
          { name: "Premium Star Pack (600 Coins - 5 Cards)", value: "premium" }
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
    const isWalkout = topCard && topCard.rating >= 88;

    if (isWalkout) {
      // Stage 1: Tearing Seal
      await interaction.editReply({ content: "📦 **Tearing open pack seal...** ✨ ✨ ✨" });
      await delay(900);

      // Stage 2: Nationality Suspense
      await interaction.editReply({ content: `🌍 **Nationality:** **${topCard.nation.toUpperCase()}**...` });
      await delay(1000);

      // Stage 3: Position
      await interaction.editReply({
        content: `🌍 **Nationality:** **${topCard.nation.toUpperCase()}**\n🛡️ **Position:** **${topCard.position}**...`,
      });
      await delay(1000);

      // Stage 4: Club
      await interaction.editReply({
        content: `🌍 **Nationality:** **${topCard.nation.toUpperCase()}**\n🛡️ **Position:** **${topCard.position}**\n🏟️ **Club:** **${topCard.club}**...`,
      });
      await delay(1100);
    }

    const embed = createPackOpenedEmbed(res.result, interaction.user.displayName);

    if (topCard) {
      try {
        const cardBuffer = await renderPlayerCard(topCard);
        const attachment = new AttachmentBuilder(cardBuffer, { name: "walkout_card.png" });
        embed.setThumbnail("attachment://walkout_card.png");

        const headline = isWalkout
          ? `💥 **WALKOUT! ${topCard.name.toUpperCase()} (${topCard.rating} OVR)!** 🎉`
          : `✨ Pack Opened! Top Pull: **${topCard.name} (${topCard.rating} ${topCard.position})**`;

        await interaction.editReply({
          content: headline,
          embeds: [embed],
          files: [attachment],
        });
        return;
      } catch (err) {
        console.warn("Could not generate walkout card canvas:", err);
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

