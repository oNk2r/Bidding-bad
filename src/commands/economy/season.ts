import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { seasonService, SEASON_TIERS } from "../../services/seasonService.js";
import { createSeasonPassEmbed } from "../../ui/embeds/seasonEmbeds.js";
import type { Command } from "../types.js";

export const seasonCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("season")
    .setDescription("View Season 1 Battle Pass progression and claim milestone rewards")
    .addIntegerOption((opt) =>
      opt.setName("claim_tier").setDescription("Specific level tier number to claim (1-15)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const claimTier = interaction.options.getInteger("claim_tier");

    if (claimTier) {
      const res = await seasonService.claimTier(
        interaction.user.id,
        claimTier,
        interaction.user.displayName
      );
      await interaction.editReply({ content: res.message });
      return;
    }

    const profile = await seasonService.getProfile(interaction.user.id);
    const embed = createSeasonPassEmbed(
      interaction.user.displayName,
      profile.sxp,
      profile.currentLevel,
      profile.claimedLevels,
      profile.nextTier
    );

    // Find first unclaimed tier that is unlocked
    const unclaimedTier = SEASON_TIERS.find(
      (t) => profile.sxp >= t.sxpRequired && !profile.claimedLevels.includes(t.level)
    );

    const buttons = new ActionRowBuilder<ButtonBuilder>();
    if (unclaimedTier) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`season_claim_${unclaimedTier.level}`)
          .setLabel(`Claim Tier ${unclaimedTier.level}`)
          .setStyle(ButtonStyle.Success)
          .setEmoji("🎁")
      );
    }

    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId("season_claim_all")
        .setLabel("Claim All Available")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✨")
        .setDisabled(!unclaimedTier)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  },
};
