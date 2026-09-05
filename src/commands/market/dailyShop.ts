import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { playerService } from "../../services/playerService.js";
import { calculatePlayerValue } from "../../models/player.js";
import type { Command } from "../types.js";

export const dailyshopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("dailyshop")
    .setDescription("View today's exclusive scouting offers in the Daily Transfer Showcase"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    // Generate 3 deterministic daily offers
    const offers = [
      playerService.getRandomPlayer({ min: 82, max: 86 }),
      playerService.getRandomPlayer({ min: 86, max: 89 }),
      playerService.getRandomPlayer({ min: 89, max: 94 }),
    ];

    const embed = new EmbedBuilder()
      .setTitle("🛍️ Daily Scouting Showcase")
      .setDescription(
        "Direct contract signings refreshed every 24 hours!\n\n" +
          offers
            .map((p, i) => {
              const price = calculatePlayerValue(p.rating) * 2;
              return (
                `**Offer #${i + 1}:** ⭐ **${p.name}** (\`${p.rating} ${p.position}\`)\n` +
                `• **Club:** *${p.club}* • **Nation:** *${p.nation}*\n` +
                `• **Direct Signing Fee:** 💰 **${price.toLocaleString()} Coins**`
              );
            })
            .join("\n\n")
      )
      .setColor(0xf59e0b)
      .setFooter({ text: "Use /market for P2P trading or /pack for randomized boosters" });

    await interaction.editReply({ embeds: [embed] });
  },
};

