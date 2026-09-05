import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createStadiumEmbed } from "../../ui/embeds/stadiumEmbeds.js";
import { STADIUM_TIERS } from "../../models/stadium.js";
import type { Command } from "../types.js";

export const stadiumCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stadium")
    .setDescription("Unified venue hub: View facilities, collect revenue, upgrade, and customize")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The manager whose venue to inspect (defaults to yourself)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("user") || interaction.user;
    const isOwner = target.id === interaction.user.id;

    const user = await economyService.ensureUser(target.id, target.displayName);
    const info = await economyService.getStadiumInfo(target.id, target.displayName);
    const nextTierInfo = STADIUM_TIERS[info.tier + 1];

    const embed = createStadiumEmbed({
      userName: target.displayName,
      clubName: user.clubName,
      stadiumName: info.stadiumName,
      tier: info.tier,
      tierInfo: info.tierInfo,
      nextTierInfo,
      canClaim: info.canClaim,
      claimableCoins: info.claimableCoins,
      timeUntilClaim: info.timeUntilClaim,
    });

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("stadium_collect")
        .setLabel("Collect Revenue")
        .setStyle(ButtonStyle.Success)
        .setEmoji("💰")
        .setDisabled(!info.canClaim || !isOwner),
      new ButtonBuilder()
        .setCustomId("stadium_upgrade")
        .setLabel("Upgrade Facility")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🏗️")
        .setDisabled(!nextTierInfo || !isOwner)
    );

    await interaction.editReply({
      embeds: [embed],
      components: isOwner ? [buttons] : [],
    });
  },
};

