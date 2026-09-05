import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { PenaltyShootoutState } from "../../models/penalty.js";
import { economyService } from "../../services/economyService.js";
import { createPenaltyEmbed } from "../../ui/embeds/penaltyEmbeds.js";
import { createPenaltyShooterButtons } from "../../ui/components/buttons.js";
import type { Command } from "../types.js";

export const penaltyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("penalty")
    .setDescription("Challenge another manager or AI Keeper to a high-stakes 1v1 Penalty Shootout duel!")
    .addUserOption((opt) =>
      opt.setName("opponent").setDescription("Select an opponent manager (leave blank to duel AI Keeper)").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("wager").setDescription("Wager amount in coins (default: 50)").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const rawWager = interaction.options.getInteger("wager") ?? 50;
    const wager = Math.max(0, Math.min(10000, rawWager));
    const userCoins = await economyService.getCoins(interaction.user.id);

    if (wager > 0 && userCoins < wager) {
      await interaction.editReply({
        content: `❌ Insufficient coins! You need **${wager.toLocaleString()} Coins** (You have: **${userCoins.toLocaleString()} Coins**).`,
      });
      return;
    }

    const opponent = interaction.options.getUser("opponent");
    const isBot = !opponent || opponent.id === interaction.user.id || opponent.bot;
    const oppId = isBot ? "0" : opponent.id;
    const oppName = isBot ? "AI Robot Keeper 🤖" : opponent.displayName;

    if (!isBot && wager > 0) {
      const oppCoins = await economyService.getCoins(oppId);
      if (oppCoins < wager) {
        await interaction.editReply({
          content: `❌ Opponent **${oppName}** does not have enough coins for this **${wager.toLocaleString()} Coin** wager!`,
        });
        return;
      }
    }

    // Deduct initial wager from challenger
    if (wager > 0) {
      await economyService.deductCoins(interaction.user.id, wager);
      if (!isBot) {
        await economyService.deductCoins(oppId, wager);
      }
    }

    const state = new PenaltyShootoutState(
      interaction.user.id,
      interaction.user.displayName,
      oppId,
      oppName,
      wager,
      isBot
    );

    const gameId = `${interaction.user.id.slice(-4)}${Date.now().toString(36)}`;
    const { penaltyService } = await import("../../services/penaltyService.js");
    penaltyService.createGame(gameId, state);

    const embed = createPenaltyEmbed(state);
    const buttons = createPenaltyShooterButtons(gameId);

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  },
};

