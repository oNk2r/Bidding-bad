import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { tournamentService } from "../../services/tournamentService.js";
import {
  createTournamentBracketEmbed,
  createTournamentChampionEmbed,
  createTournamentLobbyEmbed,
  createTournamentStandingsEmbed,
} from "../../ui/embeds/tournamentEmbeds.js";
import type { Command } from "../types.js";

export const tournamentCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("tournament")
    .setDescription("Server knockout tournaments & championship cups")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a tournament registration lobby")
        .addIntegerOption((opt) =>
          opt
            .setName("size")
            .setDescription("Number of clubs (3 for Round Robin, 4 or 8 for Knockout)")
            .setRequired(true)
            .addChoices(
              { name: "3 Clubs (3-Way Round Robin League)", value: 3 },
              { name: "4 Clubs (Single-Elimination Semi-Finals & Final)", value: 4 },
              { name: "8 Clubs (Single-Elimination QF, SF & Final)", value: 8 }
            )
        )
        .addIntegerOption((opt) =>
          opt.setName("entry_fee").setDescription("Entry fee in coins per manager (default: 100)").setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Custom tournament title").setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("View active tournament registration lobby or bracket progression")
    )
    .addSubcommand((sub) =>
      sub.setName("cancel").setDescription("Cancel active tournament and refund all entry fees (Host only)")
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.editReply({ content: "❌ This command must be used in a server." });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      const size = interaction.options.getInteger("size", true);
      const entryFee = interaction.options.getInteger("entry_fee") ?? 100;
      const name = interaction.options.getString("name") || undefined;

      const res = await tournamentService.createTournament(
        guildId,
        interaction.channelId,
        interaction.user.id,
        interaction.user.displayName,
        size,
        entryFee,
        name
      );

      if (!res.success || !res.tournament) {
        await interaction.editReply({ content: res.message });
        return;
      }

      const embed = createTournamentLobbyEmbed(res.tournament);
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("tourney_join").setLabel("Join Tournament").setStyle(ButtonStyle.Success).setEmoji("🏆"),
        new ButtonBuilder().setCustomId("tourney_start").setLabel("Start Tournament").setStyle(ButtonStyle.Primary).setEmoji("▶️"),
        new ButtonBuilder().setCustomId("tourney_leave").setLabel("Leave").setStyle(ButtonStyle.Secondary).setEmoji("🚪")
      );

      await interaction.editReply({ embeds: [embed], components: [buttons] });
      return;
    }

    if (subcommand === "status") {
      const tournament = tournamentService.getActiveTournament(guildId);
      if (!tournament) {
        await interaction.editReply({
          content: "❌ No active tournament in this server. Create one with `/tournament create`.",
        });
        return;
      }

      if (tournament.status === "REGISTRATION") {
        const embed = createTournamentLobbyEmbed(tournament);
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("tourney_join").setLabel("Join Tournament").setStyle(ButtonStyle.Success).setEmoji("🏆"),
          new ButtonBuilder().setCustomId("tourney_start").setLabel("Start Tournament").setStyle(ButtonStyle.Primary).setEmoji("▶️"),
          new ButtonBuilder().setCustomId("tourney_leave").setLabel("Leave").setStyle(ButtonStyle.Secondary).setEmoji("🚪")
        );
        await interaction.editReply({ embeds: [embed], components: [buttons] });
      } else if (tournament.status === "IN_PROGRESS") {
        const embed =
          tournament.formatType === "ROUND_ROBIN"
            ? createTournamentStandingsEmbed(tournament)
            : createTournamentBracketEmbed(tournament);
        await interaction.editReply({ embeds: [embed] });
      } else if (tournament.status === "COMPLETED") {
        const embed = createTournamentChampionEmbed(tournament);
        await interaction.editReply({ embeds: [embed] });
      }
      return;
    }

    if (subcommand === "cancel") {
      const res = await tournamentService.cancelTournament(guildId, interaction.user.id);
      await interaction.editReply({ content: res.message });
      return;
    }
  },
};

