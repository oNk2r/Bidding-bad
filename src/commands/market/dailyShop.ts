import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { dailyShopService } from "../../services/dailyShopService.js";
import type { Command } from "../types.js";

export const dailyshopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("dailyshop")
    .setDescription("View today's exclusive scouting offers & managers in the 24h Daily Transfer Showcase"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const offers = dailyShopService.getDailyOffers();
    const secondsLeft = dailyShopService.getSecondsUntilReset();
    const hours = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);

    const embed = new EmbedBuilder()
      .setTitle("🛍️ Daily Scouting Showcase & Head Coaches")
      .setDescription(
        `Direct contract signings refreshed every 24 hours!\n` +
        `⏳ **Refreshes in:** \`${hours}h ${mins}m\` (00:00 UTC)\n\n` +
          offers
            .map((offer, i) => {
              const typeIcon = offer.isManager ? "👔 **HEAD COACH**" : "⚽ **FOOTBALLER**";
              return (
                `**Offer #${i + 1} (${typeIcon}):** ${offer.tierBadge} **${offer.name}** (\`${offer.rating} ${offer.position}\`)\n` +
                `• **Club:** *${offer.club}* • **Nation:** *${offer.nation}*\n` +
                `• **Direct Signing Fee:** 💰 **${offer.price.toLocaleString()} Coins**`
              );
            })
            .join("\n\n")
      )
      .setColor(0xf59e0b)
      .setFooter({ text: "Click the buttons below to instantly sign a footballer or manager to your club!" });

    const row = new ActionRowBuilder<ButtonBuilder>();

    offers.forEach((offer, idx) => {
      const shortName = offer.name.length > 15 ? offer.name.slice(0, 14) + "…" : offer.name;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`dailyshop_buy_${idx}`)
          .setLabel(`Buy #${idx + 1}: ${shortName} (${offer.price.toLocaleString()}c)`)
          .setStyle(offer.isManager ? ButtonStyle.Primary : ButtonStyle.Success)
          .setEmoji(offer.isManager ? "👔" : "⚡")
      );
    });

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  },
};


