import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import type { Command } from "../types.js";

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("View the complete guide and command catalog for Bidding Bad"),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("⚽ Bidding Bad — Game Guide & Commands")
      .setDescription("A premier competitive football management and live auction bot for Discord.")
      .setColor(0x3b82f6)
      .addFields(
        {
          name: "🏆 Live Auction & Drafting",
          value:
            "`/auction` — Create live bidding lobby with Join/Start buttons\n" +
            "`/bid` — Place custom bid on footballer\n" +
            "`/pass` — Pass on current footballer\n" +
            "`/squad` — View drafted squad\n" +
            "`/auction_cancel` — Cancel active auction",
          inline: false,
        },
        {
          name: "🛡️ Club Identity & Lineup",
          value:
            "`/club` — View club overview, tactical pitch & banner\n" +
            "`/banner` — Set animated GIF or image club banner\n" +
            "`/lineup` — Configure your Starting 5 with interactive dropdown\n" +
            "`/tactic` — Change tactical playstyle (Gegenpress, Tiki-Taka, etc.)\n" +
            "`/captain` — Appoint club captain\n" +
            "`/kit` — Customize club kit emoji\n" +
            "`/motto` — Set manager motto\n" +
            "`/renameclub` — Change club name",
          inline: false,
        },
        {
          name: "🏪 Economy, Packs & Market",
          value:
            "`/daily` — Collect daily coin login reward\n" +
            "`/pack` — Open player packs with suspense walkouts\n" +
            "`/drop` — Claim 6-hour scout drop\n" +
            "`/season` — Battle Pass progress & claim tier rewards\n" +
            "`/market` — Browse transfer market with 1-click Buy menus\n" +
            "`/sell` — List card on transfer market\n" +
            "`/quicksell` — Instant card liquidation\n" +
            "`/dailyshop` — Rotating daily bargains\n" +
            "`/inventory` — Inspect card collection\n" +
            "`/trade` — 1-for-1 card barter proposal",
          inline: false,
        },
        {
          name: "⚔️ Matches, Rivals & Tournaments",
          value:
            "`/match` — 90-min duel vs AI Bot or challenged manager\n" +
            "`/weekend` — 5-match Weekend League gauntlet\n" +
            "`/tournament` — Server knockout tournaments\n" +
            "`/stadium` — Upgrade home venue for matchday coins\n" +
            "`/division` — Ranked Rivals tier ladder\n" +
            "`/leaderboard` — Server manager rankings\n" +
            "`/profile` — Manager stats & card valuation\n" +
            "`/card` — Render dynamic player card graphic",
          inline: false,
        }
      )
      .setFooter({ text: "Use any slash command with / to begin!" });

    await interaction.reply({ embeds: [embed] });
  },
};
