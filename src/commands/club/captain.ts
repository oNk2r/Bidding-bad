import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  EmbedBuilder,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const captainCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("captain")
    .setDescription("Appoint a player card from your inventory as official Club Captain")
    .addStringOption((opt) =>
      opt
        .setName("card_id")
        .setDescription("Select a card from autocomplete or type player name / ID")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const inventory = await economyService.getInventory(interaction.user.id);
    const filtered = inventory
      .filter(
        (c) =>
          c.id.toLowerCase().includes(focused) ||
          c.name.toLowerCase().includes(focused) ||
          c.club.toLowerCase().includes(focused)
      )
      .slice(0, 25);

    await interaction.respond(
      filtered.map((c) => ({
        name: `${c.name} (${c.rating} ${c.position}) - ${c.club}`.slice(0, 100),
        value: c.id,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const cardId = interaction.options.getString("card_id", true);
    const res = await economyService.setCaptain(interaction.user.id, cardId);

    if (!res.success || !res.captainCard) {
      await interaction.editReply({ content: res.message });
      return;
    }

    const user = await economyService.ensureUser(interaction.user.id);
    const embed = new EmbedBuilder()
      .setTitle("👑 Club Captain Appointed")
      .setDescription(
        `**${res.captainCard.name}** (${res.captainCard.rating} ${res.captainCard.position}) is now the official team captain of **${user.kitEmoji} ${user.clubName}**.\n\n` +
          `Your captain will lead your squad into \`/club\` and \`/match\` duels!`
      )
      .setColor(0xeab308);

    await interaction.editReply({ embeds: [embed] });
  },
};

