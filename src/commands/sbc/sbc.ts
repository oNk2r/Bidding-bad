import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import { sbcService } from "../../services/sbcService.js";
import { createSbcCatalogEmbed, createSbcCompletionEmbed } from "../../ui/embeds/sbcEmbeds.js";
import { SBC_CATALOG } from "../../models/sbc.js";
import type { Command } from "../types.js";

export const sbcCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("sbc")
    .setDescription("Squad Building Challenges Hub: Solve tactical puzzles for Coins, Packs, and Icons")
    .addStringOption((opt) =>
      opt
        .setName("challenge")
        .setDescription("Select an SBC challenge to submit or inspect")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("cards")
        .setDescription("Submit player card IDs or names separated by spaces (e.g. Pedri Mbappe Haaland)")
        .setRequired(false)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const filtered = SBC_CATALOG.filter(
      (s) =>
        s.id.toLowerCase().includes(focused) ||
        s.title.toLowerCase().includes(focused) ||
        s.category.toLowerCase().includes(focused)
    ).slice(0, 25);

    await interaction.respond(
      filtered.map((s) => ({
        name: `${s.badge} ${s.title} (${s.category})`.slice(0, 100),
        value: s.id,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const challengeId = interaction.options.getString("challenge");
    const cardsInput = interaction.options.getString("cards");

    if (challengeId && cardsInput) {
      // Direct submission
      const tokens = cardsInput
        .replace(/,/g, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await sbcService.submitSbc(
        interaction.user.id,
        challengeId,
        tokens,
        interaction.user.displayName
      );

      if (!res.success || !res.challenge) {
        await interaction.editReply({ content: res.message });
        return;
      }

      const embed = createSbcCompletionEmbed(res.challenge, interaction.user.displayName);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Interactive SBC Hub Catalog
    const catalog = sbcService.getCatalog();
    const completedIds = await sbcService.getCompletedSbcIds(interaction.user.id);
    const embed = createSbcCatalogEmbed(catalog, completedIds, interaction.user.displayName);

    await interaction.editReply({ embeds: [embed] });
  },
};

