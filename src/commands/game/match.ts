import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { matchService } from "../../services/matchService.js";
import { ClubMatchSide } from "../../models/match.js";
import { createChallengeEmbed, createLiveMatchEmbed, createMatchResultEmbed } from "../../ui/embeds/matchEmbeds.js";
import { createAcceptDeclineButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runLiveMatchSimulation(
  interaction: any,
  homeSide: ClubMatchSide,
  awaySide: ClubMatchSide
): Promise<void> {
  const result = matchService.simulate(homeSide, awaySide, false);
  const events = result.events;

  // 1. Kickoff 0'
  const kickoffEmbed = createLiveMatchEmbed(homeSide, awaySide, 0, 0, 0, [], false);
  await interaction.editReply({
    content: `⚔️ **MATCH COMMENCING!** ${homeSide.kitEmoji} **${homeSide.clubName}** vs ${awaySide.kitEmoji} **${awaySide.clubName}**`,
    embeds: [kickoffEmbed],
    components: [],
  });
  await delay(800);

  // 2. First Half Action & Half-Time Whistle (45')
  const firstHalfEvents = events.filter((e) => e.minute <= 45);
  const firstHalfHome = firstHalfEvents.filter((e) => e.eventType === "GOAL" && e.team === "HOME").length;
  const firstHalfAway = firstHalfEvents.filter((e) => e.eventType === "GOAL" && e.team === "AWAY").length;

  const htEmbed = createLiveMatchEmbed(
    homeSide,
    awaySide,
    firstHalfHome,
    firstHalfAway,
    45,
    firstHalfEvents,
    true
  );
  await interaction.editReply({
    content: `⏸️ **HALF TIME!** Current score: **${firstHalfHome} - ${firstHalfAway}**`,
    embeds: [htEmbed],
  });
  await delay(850);

  // 3. Second Half Drama (75')
  const midSecondEvents = events.filter((e) => e.minute <= 75);
  const midHome = midSecondEvents.filter((e) => e.eventType === "GOAL" && e.team === "HOME").length;
  const midAway = midSecondEvents.filter((e) => e.eventType === "GOAL" && e.team === "AWAY").length;

  const midSecondEmbed = createLiveMatchEmbed(
    homeSide,
    awaySide,
    midHome,
    midAway,
    75,
    midSecondEvents,
    false
  );
  await interaction.editReply({
    content: `🔥 **LATE DRAMA (75')!** Current score: **${midHome} - ${midAway}**`,
    embeds: [midSecondEmbed],
  });
  await delay(800);

  // 4. Full Time Whistle & Stats
  const rpUpdate = await matchService.recordMatchOutcome(result);
  const finalEmbed = createMatchResultEmbed(
    result,
    rpUpdate.homeRpDelta,
    rpUpdate.awayRpDelta,
    rpUpdate.homeNote,
    rpUpdate.awayNote
  );

  await interaction.editReply({
    content: `🏁 **FULL TIME WHISTLE!** Final Score: **${result.homeScore} - ${result.awayScore}**`,
    embeds: [finalEmbed],
  });
}

export const matchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("match")
    .setDescription("Challenge another manager to a live 90-minute head-to-head match")
    .addUserOption((opt) =>
      opt.setName("opponent").setDescription("The manager to challenge").setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const opponentUser = interaction.options.getUser("opponent", true);

    if (opponentUser.id === interaction.user.id) {
      await interaction.editReply({
        content: "❌ You cannot challenge yourself to a match! Please select another manager.",
      });
      return;
    }

    if (opponentUser.bot) {
      await interaction.editReply({
        content: "❌ You cannot challenge a Discord bot! Matches are head-to-head duels between managers.",
      });
      return;
    }

    const homeSide = await matchService.buildClubMatchSide(
      interaction.user.id,
      interaction.user.displayName
    );

    const awaySide = await matchService.buildClubMatchSide(
      opponentUser.id,
      opponentUser.displayName
    );

    const embed = createChallengeEmbed(
      homeSide,
      opponentUser.displayName,
      awaySide.clubName,
      awaySide.kitEmoji,
      awaySide.tactic.name
    );

    const buttons = createAcceptDeclineButtons(
      `match_${interaction.user.id}_${opponentUser.id}`
    );

    await interaction.editReply({
      content: `<@${opponentUser.id}>, you have received a match challenge from <@${interaction.user.id}>!`,
      embeds: [embed],
      components: [buttons],
    });
  },
};
