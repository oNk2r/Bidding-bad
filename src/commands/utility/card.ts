import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { playerService } from "../../services/playerService.js";
import { renderPlayerCard } from "../../ui/canvas/cardCanvas.js";
import { calculatePlayerValue } from "../../models/player.js";
import type { Command } from "../types.js";

export const cardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("card")
    .setDescription("Render an authentic FUT-style digital card graphic for any footballer")
    .addStringOption((opt) =>
      opt
        .setName("player")
        .setDescription("Search for a footballer by name")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const players = playerService.getAllPlayers();
    const matches = players
      .filter((p) => p.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await interaction.respond(
      matches.map((p) => ({
        name: `${p.name} (${p.rating} ${p.position}) — ${p.club}`.slice(0, 100),
        value: p.name,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const playerName = interaction.options.getString("player", true);
    const player = playerService.getPlayerByName(playerName);

    if (!player) {
      await interaction.editReply({
        content: `❌ Footballer **${playerName}** was not found in the global registry.`,
      });
      return;
    }

    const value = calculatePlayerValue(player.rating);
    const imageBuffer = await renderPlayerCard({
      ...player,
      value,
    });

    const attachment = new AttachmentBuilder(imageBuffer, { name: `${player.name.replace(/\s+/g, "_")}_card.png` });

    const embed = new EmbedBuilder()
      .setTitle(`🌟 ${player.name} (${player.rating} ${player.position})`)
      .setDescription(
        `🏟️ **Club:** ${player.club}\n` +
          `🌍 **Nationality:** ${player.nation}\n` +
          `💰 **Base Valuation:** ${value.toLocaleString()} Coins`
      )
      .setImage(`attachment://${player.name.replace(/\s+/g, "_")}_card.png`)
      .setColor(player.rating >= 90 ? 0xffd700 : player.rating >= 88 ? 0x38bdf8 : 0x22c55e);

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
    });
  },
};
