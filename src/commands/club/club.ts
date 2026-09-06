import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import { createClubEmbed } from "../../ui/embeds/clubEmbeds.js";
import { renderPitchSquad } from "../../ui/canvas/pitchCanvas.js";
import type { Command } from "../types.js";

export const clubCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("club")
    .setDescription("View your club's full identity: starting squad, head coach, captain, motto, and finances")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The manager whose club to inspect (defaults to yourself)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const uid = targetUser.id;
    const name = targetUser.displayName;

    const user = await economyService.ensureUser(uid, name);
    const captain = await economyService.getCaptain(uid);
    const managerCard = await economyService.getAssignedManager(uid);
    const squad = await economyService.buildMatchSquad(uid);
    const coins = user.coins;
    const clubValue = await economyService.getClubValuation(uid);
    const inventory = await economyService.getInventory(uid);

    const embed = createClubEmbed({
      userName: name,
      clubName: user.clubName,
      kitEmoji: user.kitEmoji,
      motto: user.motto,
      bannerUrl: user.bannerUrl,
      tacticName: user.tactic,
      captain,
      managerCard,
      squad,
      coins,
      clubValue,
      cardCount: inventory.length,
    });

    // Render the tactical pitch graphic with Starting 5 lineup
    try {
      const squadCards = await economyService.getStartingLineup(uid);
      const pitchBuffer = await renderPitchSquad(
        user.clubName,
        user.kitEmoji,
        squadCards.length > 0 ? squadCards : inventory.slice(0, 5)
      );
      const pitchAttachment = new AttachmentBuilder(pitchBuffer, { name: "tactical_pitch.png" });
      embed.setImage("attachment://tactical_pitch.png");

      await interaction.editReply({
        embeds: [embed],
        files: [pitchAttachment],
      });
      return;
    } catch (err) {
      console.warn("Could not generate tactical pitch graphic:", err);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
