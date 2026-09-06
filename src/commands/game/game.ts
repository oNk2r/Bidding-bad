import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const gameCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("game")
    .setDescription("All-in-One Game Arcade: Lucky Spin, Penalty Duel, SBC Puzzles & Quick Matches"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = await economyService.ensureUser(interaction.user.id, interaction.user.displayName);

    const embed = new EmbedBuilder()
      .setTitle("🎮 Bidding Bad — Game & Minigame Arcade")
      .setDescription(
        `Welcome to the Football Arcade, **${user.name}**!\n` +
          `Treasury Balance: 💰 **${user.coins.toLocaleString()} Coins**\n\n` +
          `Choose an activity below:\n` +
          `• 🎡 **/spin** — Spin the mystery wheel for coins & star cards\n` +
          `• 🎯 **/penalty** — 1v1 Penalty Shootout with coin wagers\n` +
          `• 🧩 **/sbc** — Solve Squad Building puzzles for Icons\n` +
          `• ⚔️ **/match** — Live 90-min head-to-head duel vs another manager\n` +
          `• 🏆 **/tournament** — Compete in server knockout cups`
      )
      .setColor(0x8b5cf6);

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("arcade_spin").setLabel("Spin Wheel").setStyle(ButtonStyle.Primary).setEmoji("🎡"),
      new ButtonBuilder().setCustomId("arcade_penalty").setLabel("Penalty Duel").setStyle(ButtonStyle.Danger).setEmoji("🎯"),
      new ButtonBuilder().setCustomId("arcade_sbc").setLabel("SBC Puzzles").setStyle(ButtonStyle.Secondary).setEmoji("🧩"),
      new ButtonBuilder().setCustomId("arcade_match").setLabel("Quick Match").setStyle(ButtonStyle.Success).setEmoji("⚽")
    );

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  },
};

