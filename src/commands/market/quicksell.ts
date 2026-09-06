import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { economyService } from "../../services/economyService.js";
import type { Command } from "../types.js";

export const quicksellCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("quicksell")
    .setDescription("Liquidate multiple player or manager cards instantly for coins with full roster visibility"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const inventory = await economyService.getInventory(interaction.user.id);
    const tradable = inventory.filter((c) => !c.untradeable);

    if (tradable.length === 0) {
      await interaction.editReply({
        content: "❌ You have no tradable cards in your inventory to quicksell.",
      });
      return;
    }

    const totalValuation = tradable.reduce((sum, c) => sum + c.value, 0);

    // Build rich overview embed showing all available players
    const playerLines = tradable.map(
      (c, idx) =>
        `\`${(idx + 1).toString().padStart(2, " ")}.\` **${c.name}** (\`${c.rating} ${c.position}\` — *${c.club}*) ➔ 💰 **${c.value.toLocaleString()}**`
    );

    const embed = new EmbedBuilder()
      .setTitle("💰 Multi-Card Quicksell Liquidation Hub")
      .setDescription(
        `Select any cards from the menus below to liquidate for coins immediately.\n` +
          `**Available Tradable Cards:** **${tradable.length}** | **Total Valuation:** 💰 **${totalValuation.toLocaleString()} Coins**\n\n` +
          `**Roster Breakdown:**\n` +
          playerLines.slice(0, 30).join("\n") +
          (playerLines.length > 30 ? `\n*...and ${playerLines.length - 30} more cards listed in the menus below.*` : "")
      )
      .setColor(0xf59e0b)
      .setFooter({ text: "Select 1 or more cards across the menus, or click Quicksell All." });

    const components: any[] = [];

    // Create dropdown menu batches (up to 25 items per row)
    const batchSize = 25;
    for (let i = 0; i < tradable.length; i += batchSize) {
      const batch = tradable.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;

      const options = batch.map((c) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${c.name.slice(0, 25)} (${c.rating} ${c.position})`)
          .setDescription(`${c.club.slice(0, 18)} • 💰 ${c.value.toLocaleString()} Coins`)
          .setValue(c.id)
      );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`quicksell_multi_select_${batchNum}`)
        .setPlaceholder(`🔥 Select cards to quicksell (Batch ${batchNum}: Cards ${i + 1}-${i + batch.length})...`)
        .setMinValues(1)
        .setMaxValues(batch.length)
        .addOptions(options);

      components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
    }

    // Action button to quicksell all available tradable cards in 1-click
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("quicksell_all_btn")
        .setLabel(`Quicksell All (${tradable.length} Cards - ${totalValuation.toLocaleString()} Coins)`)
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔥")
    );
    components.push(actionRow);

    await interaction.editReply({
      embeds: [embed],
      components,
    });
  },
};
